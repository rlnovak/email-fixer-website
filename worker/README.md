# EmailCorreto — Backend em Cloudflare Workers

Versão do backend para rodar **100% grátis** no Cloudflare Workers (free tier:
100k req/dia, sem cold start). Substitui o backend Express que roda no Render.

## O que muda em relação ao Express (server/)

| Express (Render) | Worker (Cloudflare) |
|------------------|---------------------|
| Express 5 | Hono |
| scanner com `dns/promises` do Node | scanner com **DNS-over-HTTPS** (`src/core/doh.ts`) |
| Stripe SDK (Node http) | Stripe com `createFetchHttpClient()` + `constructEventAsync` |
| Resend SDK | Resend via `fetch` (REST) |
| env via `process.env` | env via bindings (`c.env`) / `wrangler secret` |

A lógica de negócio (`src/core/scanner.ts` e `src/core/generator.ts`) é a mesma;
só a camada de DNS foi trocada para DoH. `generator.ts` roda sem alteração.

## Rotas (idênticas ao backend atual)

- `GET  /api/health`
- `POST /api/scan`
- `POST /api/checkout`
- `POST /api/webhooks/stripe`
- `GET  /api/report/:orderId`

## Desenvolvimento local

```bash
cd worker
npm install
cp .dev.vars.example .dev.vars   # preencha os secrets
npm run dev                       # wrangler dev em http://127.0.0.1:8787
```

O `/api/scan` funciona sem secrets (só DNS). Checkout/webhook/report precisam de
Stripe + Supabase configurados.

## Deploy

```bash
cd worker
npm install

# 1. Login (abre o navegador)
npx wrangler login

# 2. Definir os secrets (um por vez; cola o valor quando pedir)
npx wrangler secret put STRIPE_SECRET_KEY
npx wrangler secret put STRIPE_WEBHOOK_SECRET
npx wrangler secret put SUPABASE_URL
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
npx wrangler secret put RESEND_API_KEY
npx wrangler secret put RESEND_FROM

# 3. Publicar
npx wrangler deploy
```

O deploy imprime a URL do Worker, algo como
`https://emailcorreto-api.<sua-conta>.workers.dev`.

## Conectar o frontend (Cloudflare Pages)

No Pages → Settings → Environment variables (Production):

```
VITE_API_BASE = https://emailcorreto-api.<sua-conta>.workers.dev
```

Rebuild o Pages. Depois atualize o endpoint de webhook no Stripe para
`https://emailcorreto-api.<sua-conta>.workers.dev/api/webhooks/stripe` e ajuste o
`STRIPE_WEBHOOK_SECRET` (é um secret diferente do endpoint do Render).

## Variáveis não-secretas

`APP_URL` e `ALLOWED_ORIGINS` estão em `wrangler.jsonc` (`vars`), apontando para o
frontend no Pages. Ajuste quando registrar o domínio próprio.

## Migração do Render → Workers (ordem segura)

1. Deploy do Worker + secrets, testar `/api/health` e `/api/scan` na URL `.workers.dev`.
2. Cadastrar o webhook do Stripe apontando para o Worker; testar um pagamento de teste.
3. Trocar o `VITE_API_BASE` do Pages para a URL do Worker; rebuild.
4. Confirmar o fluxo de ponta a ponta no Worker.
5. Só então desligar o serviço no Render.
