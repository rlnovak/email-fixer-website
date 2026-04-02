import { Router } from 'express';
import Stripe from 'stripe';
import { getSupabase } from '../lib/supabase.js';

/*
  Supabase — schema esperado:

  create table orders (
    id            uuid primary key default gen_random_uuid(),
    domain        text not null,
    email         text not null,
    registrar     text,
    status        text not null default 'pending',  -- 'pending' | 'paid'
    amount_brl    integer not null default 99,
    stripe_session_id text,
    scan_result   jsonb,
    delivered_at  timestamptz,
    created_at    timestamptz default now()
  );
*/

let _stripe: Stripe | null = null;
function getStripe(): Stripe {
  return (_stripe ??= new Stripe(process.env.STRIPE_SECRET_KEY!));
}

const router = Router();

router.post('/', async (req, res) => {
  const { domain, email, registrar, scanResult } = req.body as {
    domain?: unknown;
    email?: unknown;
    registrar?: unknown;
    scanResult?: unknown;
  };

  if (!domain || typeof domain !== 'string') {
    res.status(400).json({ error: 'Domínio não informado.' });
    return;
  }
  if (!email || typeof email !== 'string' || !email.includes('@')) {
    res.status(400).json({ error: 'E-mail inválido.' });
    return;
  }

  // 1. Salvar o pedido no Supabase ANTES de criar a sessão Stripe
  const { data: order, error: dbError } = await getSupabase()
    .from('orders')
    .insert({
      domain,
      email,
      registrar: typeof registrar === 'string' ? registrar : null,
      status: 'pending',
      amount_brl: 99,
      scan_result: scanResult ?? null,
    })
    .select('id')
    .single();

  if (dbError || !order) {
    console.error('[checkout] Supabase insert error:', dbError);
    res.status(500).json({ error: 'Erro ao registrar pedido. Tente novamente.' });
    return;
  }

  // 2. Criar sessão de checkout no Stripe
  try {
    const session = await getStripe().checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'brl',
            product_data: {
              name: 'EmailCorreto — Relatório de entregabilidade',
              description: `Diagnóstico e correção DNS para ${domain}`,
            },
            unit_amount: 9900,
          },
          quantity: 1,
        },
      ],
      customer_email: email,
      metadata: {
        order_id: order.id,
        domain,
        email,
        registrar: typeof registrar === 'string' ? registrar : '',
      },
      success_url: `${process.env.APP_URL}/sucesso?order_id=${order.id}`,
      cancel_url: `${process.env.APP_URL}/?cancelado=1`,
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error('[checkout] Stripe session error:', err);
    await getSupabase().from('orders').delete().eq('id', order.id);
    res.status(500).json({ error: 'Erro ao criar sessão de pagamento. Tente novamente.' });
  }
});

export default router;
