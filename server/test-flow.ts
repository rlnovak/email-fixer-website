/**
 * Script de teste do fluxo completo.
 * Uso: tsx --env-file .env.local server/test-flow.ts
 */
import 'dotenv/config';
import Stripe from 'stripe';

const BASE = 'http://localhost:3001';

async function post(path: string, body: unknown): Promise<Record<string, unknown>> {
  const r = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return r.json() as Promise<Record<string, unknown>>;
}

async function runTests() {
  console.log('\n────────────────────────────────────────');
  console.log('  EmailCorreto — Teste de fluxo da API');
  console.log('────────────────────────────────────────\n');

  // ── /api/scan ─────────────────────────────────────────────────────────────
  console.log('1. POST /api/scan\n');

  type Spf = { status: string };
  type ScanResp = { domain?: string; domainExists?: boolean; spf?: Spf; dkim?: Spf; dmarc?: Spf; overallStatus?: string; error?: string };
  const validScan = await post('/api/scan', { domain: 'uol.com.br' }) as ScanResp;
  console.log('  uol.com.br:');
  console.log(`    domainExists : ${validScan.domainExists}`);
  console.log(`    SPF  : ${validScan.spf?.status}`);
  console.log(`    DKIM : ${validScan.dkim?.status}`);
  console.log(`    DMARC: ${validScan.dmarc?.status}`);
  console.log(`    overall: ${validScan.overallStatus}`);

  const sanitized = await post('/api/scan', { domain: 'https://www.rdstation.com/blog/' }) as ScanResp;
  console.log(`\n  https://www.rdstation.com/blog/ → domain: ${sanitized.domain ?? sanitized.error}`);

  const invalid = await post('/api/scan', { domain: 'nao é um domínio' }) as ScanResp;
  console.log(`\n  "nao é um domínio" → error: ${invalid.error}`);

  const notFound = await post('/api/scan', { domain: 'xyzinexistente999abc.com.br' }) as ScanResp;
  console.log(`\n  xyzinexistente999abc.com.br → error: ${notFound.error}`);

  // ── Stripe checkout session (sem Supabase) ────────────────────────────────
  console.log('\n────────────────────────────────────────');
  console.log('2. Stripe — criação de checkout session\n');

  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    console.log('  ⚠  STRIPE_SECRET_KEY não configurada. Pulando teste Stripe.');
  } else {
    try {
      const stripe = new Stripe(key);
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        mode: 'payment',
        line_items: [{
          price_data: {
            currency: 'brl',
            product_data: {
              name: 'EmailCorreto — Teste (sandbox)',
              description: 'Criado por test-flow.ts',
            },
            unit_amount: 9900,
          },
          quantity: 1,
        }],
        metadata: {
          order_id: 'test-order-' + Date.now(),
          domain: 'teste.com.br',
          email: 'teste@emailcorreto.com.br',
        },
        success_url: 'http://localhost:5173/sucesso?order_id=test',
        cancel_url: 'http://localhost:5173/?cancelado=1',
      });
      console.log(`  ✅ Sessão criada com sucesso!`);
      console.log(`     ID      : ${session.id}`);
      console.log(`     Status  : ${session.status}`);
      console.log(`     URL     : ${session.url?.slice(0, 80)}...`);
      console.log(`     Amount  : R$ ${(session.amount_total ?? 0) / 100}`);
    } catch (err: unknown) {
      console.error('  ❌ Erro Stripe:', err instanceof Error ? err.message : err);
    }
  }

  console.log('\n────────────────────────────────────────');
  console.log('  Para testar webhooks:');
  console.log('  stripe listen --forward-to localhost:3001/api/webhooks/stripe');
  console.log('  stripe trigger checkout.session.completed');
  console.log('────────────────────────────────────────\n');
}

runTests().catch(console.error);
