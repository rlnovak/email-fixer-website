import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import scanRouter from './routes/scan.js';
import checkoutRouter from './routes/checkout.js';
import webhookRouter from './routes/webhook.js';

const app = express();
const PORT = Number(process.env.PORT ?? 3001);

// CORS: apenas a origem do Vite em desenvolvimento
app.use(cors({
  origin: process.env.APP_URL ?? 'http://localhost:5173',
  methods: ['GET', 'POST'],
}));

// Webhook Stripe: raw body OBRIGATÓRIO — deve vir ANTES de express.json()
app.use('/api/webhooks/stripe', express.raw({ type: 'application/json' }), webhookRouter);

// Demais rotas: JSON
app.use(express.json());

app.use('/api/scan', scanRouter);
app.use('/api/checkout', checkoutRouter);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ ok: true, ts: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`[server] Rodando em http://localhost:${PORT}`);
});
