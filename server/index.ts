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

// CORS: o frontend (Cloudflare Pages) e o backend (Fly.io) ficam em origens
// diferentes. ALLOWED_ORIGINS é uma lista separada por vírgula; cai para a
// origem do Pages + localhost em dev se não definida.
const allowedOrigins = (
  process.env.ALLOWED_ORIGINS ??
  'http://localhost:5173,https://email-fixer-website.pages.dev'
)
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

const corsMiddleware = cors({
  origin: (origin, callback) => {
    // Permite requests sem Origin (curl, Stripe webhook server-to-server).
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    // Aceita qualquer subdomínio *.pages.dev (previews do Cloudflare Pages).
    if (/^https:\/\/[a-z0-9-]+\.email-fixer-website\.pages\.dev$/i.test(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`Origem não permitida pelo CORS: ${origin}`));
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
});

app.use(corsMiddleware);
// Responde explicitamente o preflight (OPTIONS) em qualquer rota.
app.options('/*splat', corsMiddleware);

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
