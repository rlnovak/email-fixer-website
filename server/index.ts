import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import scanRouter from './routes/scan.js';
import checkoutRouter from './routes/checkout.js';
import webhookRouter from './routes/webhook.js';
import reportRouter from './routes/report.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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
app.use('/api/report', reportRouter);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ ok: true, ts: new Date().toISOString() });
});

// ─── Servir a SPA em produção ────────────────────────────────────────────────
// Em dev, o Vite serve o frontend (porta 5173) e faz proxy de /api para cá.
// Em produção, o mesmo servidor serve o dist/ e faz fallback para index.html
// para que as rotas client-side (/diagnostico, /relatorio) funcionem em F5/refresh.
const distDir = path.resolve(__dirname, '../dist');
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));

  // Fallback SPA: qualquer GET que não seja /api/* devolve o index.html.
  app.use((req, res, next) => {
    if (req.method !== 'GET' || req.path.startsWith('/api/')) return next();
    res.sendFile(path.join(distDir, 'index.html'));
  });
  console.log('[server] Servindo SPA de', distDir);
} else {
  console.log('[server] dist/ não encontrado — rode "npm run build" para servir a SPA em produção.');
}

app.listen(PORT, () => {
  console.log(`[server] Rodando em http://localhost:${PORT}`);
});
