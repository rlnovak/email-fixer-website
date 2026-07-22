import { Hono } from 'hono';
import { cors } from 'hono/cors';
import Stripe from 'stripe';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { scanDomain, type ScanResult } from './core/scanner.js';
import { generateFix, type Registrar, type EmailProvider } from './core/generator.js';
import { buildEmailHtml } from './email.js';

// ─── Bindings ─────────────────────────────────────────────────────────────────

export interface Env {
  APP_URL: string;
  ALLOWED_ORIGINS: string;
  STRIPE_SECRET_KEY: string;
  STRIPE_WEBHOOK_SECRET: string;
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  RESEND_API_KEY: string;
  RESEND_FROM?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getStripe(env: Env): Stripe {
  // No Workers o Stripe precisa do fetch http client (sem Node http).
  return new Stripe(env.STRIPE_SECRET_KEY, {
    httpClient: Stripe.createFetchHttpClient(),
  });
}

function getSupabase(env: Env): SupabaseClient {
  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
}

const DOMAIN_RE = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i;

function sanitizeDomain(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//i, '')
    .replace(/^www\./i, '')
    .replace(/\/.*$/, '')
    .replace(/\?.*$/, '')
    .replace(/^.*@/, '');
}

const REPORT_TTL_DAYS = 30;

// Preço de lançamento (promocional). PRICE_BRL = valor em reais; unit_amount em centavos.
const PRICE_BRL = 49;
const PRICE_CENTS = PRICE_BRL * 100;

/** Envia o e-mail do relatório via REST API do Resend (fetch, compatível com Workers). */
async function sendReportEmail(env: Env, to: string, domain: string, orderId: string): Promise<void> {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: env.RESEND_FROM ?? 'EmailCorreto <onboarding@resend.dev>',
      to,
      subject: `Seu relatório EmailCorreto para ${domain} está pronto`,
      html: buildEmailHtml(env.APP_URL, domain, orderId),
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Resend ${res.status}: ${body}`);
  }
}

// ─── App ──────────────────────────────────────────────────────────────────────

const app = new Hono<{ Bindings: Env }>();

// CORS: origens do Pages + localhost + previews *.pages.dev
app.use('/api/*', (c, next) => {
  const allowed = (c.env.ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  return cors({
    origin: (origin) => {
      if (!origin) return origin; // permite server-to-server (Stripe webhook)
      if (allowed.includes(origin)) return origin;
      if (/^https:\/\/[a-z0-9-]+\.email-fixer-website\.pages\.dev$/i.test(origin)) return origin;
      return null;
    },
    allowMethods: ['GET', 'POST', 'OPTIONS'],
    allowHeaders: ['Content-Type'],
  })(c, next);
});

app.get('/api/health', (c) => c.json({ ok: true, ts: new Date().toISOString() }));

// ── SCAN ──────────────────────────────────────────────────────────────────────
app.post('/api/scan', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const raw = (body as { domain?: unknown }).domain;
  if (!raw || typeof raw !== 'string') return c.json({ error: 'Domínio não informado.' }, 400);

  const domain = sanitizeDomain(raw);
  if (!DOMAIN_RE.test(domain)) {
    return c.json({ error: 'Formato de domínio inválido. Informe apenas o domínio (ex: empresa.com.br).' }, 400);
  }

  let result: ScanResult;
  try {
    result = await scanDomain(domain);
  } catch (err) {
    console.error('[scan] erro:', err);
    return c.json({ error: 'Erro interno ao verificar o domínio. Tente novamente.' }, 500);
  }

  if (!result.domainExists) {
    return c.json({ error: `Domínio "${domain}" não encontrado no DNS. Verifique se está escrito corretamente.` }, 404);
  }
  return c.json(result);
});

// ── CHECKOUT ────────────────────────────────────────────────────────────────
app.post('/api/checkout', async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as {
    domain?: unknown; email?: unknown; registrar?: unknown;
    emailProvider?: unknown; scanResult?: unknown;
  };
  const { domain, email, registrar, emailProvider, scanResult } = body;

  if (!domain || typeof domain !== 'string') return c.json({ error: 'Domínio não informado.' }, 400);
  if (!email || typeof email !== 'string' || !email.includes('@')) return c.json({ error: 'E-mail inválido.' }, 400);

  const supabase = getSupabase(c.env);
  const { data: order, error: dbError } = await supabase
    .from('orders')
    .insert({
      domain,
      email,
      registrar: typeof registrar === 'string' ? registrar : null,
      email_provider: typeof emailProvider === 'string' ? emailProvider : null,
      status: 'pending',
      amount_brl: PRICE_BRL,
      scan_result: scanResult ?? null,
    })
    .select('id')
    .single();

  if (dbError || !order) {
    console.error('[checkout] Supabase insert error:', dbError);
    return c.json({ error: 'Erro ao registrar pedido. Tente novamente.' }, 500);
  }

  try {
    const session = await getStripe(c.env).checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: [{
        price_data: {
          currency: 'brl',
          product_data: {
            name: 'EmailCorreto — Relatório de entregabilidade',
            description: `Diagnóstico e correção DNS para ${domain}`,
          },
          unit_amount: PRICE_CENTS,
        },
        quantity: 1,
      }],
      customer_email: email,
      metadata: {
        order_id: order.id,
        domain,
        email,
        registrar: typeof registrar === 'string' ? registrar : '',
      },
      success_url: `${c.env.APP_URL}/relatorio?order=${order.id}`,
      cancel_url: `${c.env.APP_URL}/?cancelado=1`,
    });
    return c.json({ url: session.url });
  } catch (err) {
    console.error('[checkout] Stripe session error:', err);
    await supabase.from('orders').delete().eq('id', order.id);
    return c.json({ error: 'Erro ao criar sessão de pagamento. Tente novamente.' }, 500);
  }
});

// ── WEBHOOK STRIPE ────────────────────────────────────────────────────────────
app.post('/api/webhooks/stripe', async (c) => {
  const sig = c.req.header('stripe-signature');
  if (!sig) return c.text('Assinatura Stripe ausente.', 400);
  if (!c.env.STRIPE_WEBHOOK_SECRET) return c.text('Configuração interna inválida.', 500);

  const payload = await c.req.text(); // corpo cru para verificar a assinatura
  let event: Stripe.Event;
  try {
    // No Workers a verificação precisa ser assíncrona (WebCrypto).
    event = await getStripe(c.env).webhooks.constructEventAsync(payload, sig, c.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[webhook] assinatura inválida:', msg);
    return c.text(`Webhook error: ${msg}`, 400);
  }

  if (event.type !== 'checkout.session.completed') return c.body(null, 200);

  const session = event.data.object as Stripe.Checkout.Session;
  const { order_id, domain, email } = session.metadata ?? {};
  if (!order_id || !domain || !email) {
    console.error('[webhook] metadata incompleto:', session.id);
    return c.body(null, 200);
  }

  const supabase = getSupabase(c.env);
  const { data: order, error: loadError } = await supabase
    .from('orders')
    .select('scan_result, registrar, email_provider')
    .eq('id', order_id)
    .single();

  if (loadError || !order) {
    console.error('[webhook] pedido não encontrado:', order_id, loadError);
    return c.text('Pedido não encontrado.', 500);
  }

  let fixResult: unknown = null;
  try {
    const scan = order.scan_result as ScanResult | null;
    if (scan && scan.domainExists) {
      const registrar = (order.registrar as Registrar | null) ?? 'other';
      const override = (order.email_provider as EmailProvider | null) ?? undefined;
      fixResult = generateFix(scan, registrar, override);
    }
  } catch (err) {
    console.error('[webhook] falha ao gerar fix:', err);
  }

  const { error: updateError } = await supabase
    .from('orders')
    .update({ status: 'paid', stripe_session_id: session.id, fix_result: fixResult })
    .eq('id', order_id);
  if (updateError) {
    console.error('[webhook] erro ao atualizar pedido:', updateError);
    return c.text('Erro ao atualizar pedido.', 500);
  }

  // Envio de e-mail em background (não bloqueia a resposta 200 ao Stripe).
  c.executionCtx.waitUntil(
    sendReportEmail(c.env, email, domain, order_id)
      .then(() => supabase.from('orders').update({ delivered_at: new Date().toISOString() }).eq('id', order_id))
      .then(() => { console.log(`[webhook] e-mail entregue (pedido ${order_id})`); })
      .catch((err) => { console.error(`[webhook] falha no e-mail (pedido ${order_id}):`, err); })
  );

  return c.body(null, 200);
});

// ── REPORT ──────────────────────────────────────────────────────────────────
app.get('/api/report/:orderId', async (c) => {
  const orderId = c.req.param('orderId');
  if (!/^[0-9a-f-]{36}$/i.test(orderId)) return c.json({ error: 'ID de pedido inválido.' }, 400);

  const { data: order, error } = await getSupabase(c.env)
    .from('orders')
    .select('domain, status, fix_result, delivered_at, created_at')
    .eq('id', orderId)
    .single();

  if (error || !order) return c.json({ error: 'Pedido não encontrado.' }, 404);
  if (order.status !== 'paid') {
    return c.json({ error: 'Pagamento pendente. O relatório fica disponível após a confirmação.' }, 402);
  }

  const createdAt = order.created_at ? new Date(order.created_at as string).getTime() : null;
  if (createdAt) {
    const ageDays = (Date.now() - createdAt) / (1000 * 60 * 60 * 24);
    if (ageDays > REPORT_TTL_DAYS) {
      return c.json({
        error: `Este relatório expirou (acesso válido por ${REPORT_TTL_DAYS} dias após a compra). Se ainda precisar dos registros, escreva para o suporte.`,
        expired: true,
        domain: order.domain,
      }, 410);
    }
  }

  if (!order.fix_result) {
    return c.json({
      error: 'Pagamento confirmado, mas o relatório ainda não foi gerado. Contate o suporte.',
      domain: order.domain,
    }, 409);
  }

  return c.json({ domain: order.domain, deliveredAt: order.delivered_at, fix: order.fix_result });
});

export default app;
