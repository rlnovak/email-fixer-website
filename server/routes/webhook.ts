import { Router } from 'express';
import type { Request, Response } from 'express';
import Stripe from 'stripe';
import { Resend } from 'resend';
import { getSupabase } from '../lib/supabase.js';
import { buildEmailHtml } from '../lib/email.js';

let _stripe: Stripe | null = null;
function getStripe(): Stripe {
  return (_stripe ??= new Stripe(process.env.STRIPE_SECRET_KEY!));
}

let _resend: Resend | null = null;
function getResend(): Resend {
  return (_resend ??= new Resend(process.env.RESEND_API_KEY!));
}

// Retry com backoff exponencial: 2s → 4s
async function sendEmailWithRetry(
  to: string,
  domain: string,
  orderId: string,
  attempt = 1
): Promise<void> {
  try {
    const { error } = await getResend().emails.send({
      from: process.env.RESEND_FROM ?? 'EmailCorreto <noreply@emailcorreto.com.br>',
      to,
      subject: `Seu relatório EmailCorreto para ${domain} está pronto`,
      html: buildEmailHtml(domain, orderId),
    });
    if (error) throw new Error(error.message);
  } catch (err) {
    if (attempt < 3) {
      await new Promise(r => setTimeout(r, 2000 * attempt)); // 2s, 4s
      return sendEmailWithRetry(to, domain, orderId, attempt + 1);
    }
    throw err;
  }
}

const router = Router();

// Nota: este handler recebe o body como Buffer (express.raw) — configurado em server/index.ts
async function handleWebhook(req: Request, res: Response): Promise<void> {
  const sig = req.headers['stripe-signature'];

  if (!sig) {
    res.status(400).send('Assinatura Stripe ausente.');
    return;
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error('[webhook] STRIPE_WEBHOOK_SECRET não configurado.');
    res.status(500).send('Configuração interna inválida.');
    return;
  }

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(req.body as Buffer, sig, webhookSecret);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[webhook] Falha na verificação de assinatura:', msg);
    res.status(400).send(`Webhook error: ${msg}`);
    return;
  }

  if (event.type !== 'checkout.session.completed') {
    res.sendStatus(200);
    return;
  }

  const session = event.data.object as Stripe.Checkout.Session;
  const { order_id, domain, email } = session.metadata ?? {};

  if (!order_id || !domain || !email) {
    console.error('[webhook] Metadata incompleto na sessão:', session.id);
    res.sendStatus(200);
    return;
  }

  // 1. Atualizar status para 'paid'
  const { error: updateError } = await getSupabase()
    .from('orders')
    .update({ status: 'paid', stripe_session_id: session.id })
    .eq('id', order_id);

  if (updateError) {
    console.error('[webhook] Erro ao atualizar pedido no Supabase:', updateError);
    res.status(500).send('Erro ao atualizar pedido.');
    return;
  }

  // 2. Enviar e-mail com retry (falha não causa retry do webhook — evita duplicatas)
  try {
    await sendEmailWithRetry(email, domain, order_id);
    await getSupabase()
      .from('orders')
      .update({ delivered_at: new Date().toISOString() })
      .eq('id', order_id);
    console.log(`[webhook] E-mail entregue para ${email} (pedido ${order_id})`);
  } catch (err) {
    console.error(`[webhook] Falha no envio de e-mail após 3 tentativas (pedido ${order_id}):`, err);
  }

  res.sendStatus(200);
}

router.post('/', handleWebhook);

export default router;
