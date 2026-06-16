import { Router } from 'express';
import { getSupabase } from '../lib/supabase.js';

const router = Router();

/**
 * Retorna o relatório de correção de um pedido pago.
 * Powering a página /relatorio?order=<id> que o e-mail linka.
 *
 * Só devolve o fix_result se o pedido estiver 'paid' — é o paywall do produto.
 */
router.get('/:orderId', async (req, res) => {
  const { orderId } = req.params;

  // Validação básica de UUID para evitar queries inúteis
  if (!/^[0-9a-f-]{36}$/i.test(orderId)) {
    res.status(400).json({ error: 'ID de pedido inválido.' });
    return;
  }

  const { data: order, error } = await getSupabase()
    .from('orders')
    .select('domain, status, fix_result, scan_result, delivered_at')
    .eq('id', orderId)
    .single();

  if (error || !order) {
    res.status(404).json({ error: 'Pedido não encontrado.' });
    return;
  }

  if (order.status !== 'paid') {
    res.status(402).json({ error: 'Pagamento pendente. O relatório fica disponível após a confirmação.' });
    return;
  }

  if (!order.fix_result) {
    // Pago mas sem fix (scan ausente no checkout, ou erro de geração). Evita 500 mudo.
    res.status(409).json({
      error: 'Pagamento confirmado, mas o relatório ainda não foi gerado. Contate o suporte.',
      domain: order.domain,
    });
    return;
  }

  res.json({
    domain: order.domain,
    deliveredAt: order.delivered_at,
    fix: order.fix_result,
  });
});

export default router;
