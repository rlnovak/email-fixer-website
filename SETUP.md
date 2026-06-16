# EmailCorreto — Setup de Integrações

Guia para ligar Stripe, Supabase e o serviço de e-mail ao projeto. Tudo que o
código espera está em `.env.local` (copie de `.env.example`).

---

## 1. Banco de dados (Supabase)

O pipeline depende de uma tabela `orders`. Após o conserto do backend, ela ganhou
duas colunas novas: `email_provider` e `fix_result`.

### Schema completo (rodar no SQL Editor do Supabase)

```sql
create table if not exists orders (
  id             uuid primary key default gen_random_uuid(),
  domain         text not null,
  email          text not null,
  registrar      text,
  email_provider text,                              -- override manual; null = usar detecção do scan
  status         text not null default 'pending',   -- 'pending' | 'paid'
  amount_brl     integer not null default 99,
  stripe_session_id text,
  scan_result    jsonb,                             -- ScanResult salvo no checkout
  fix_result     jsonb,                             -- FixResult gerado no webhook após pagamento
  delivered_at   timestamptz,
  created_at     timestamptz default now()
);
```

### Se a tabela já existe (migração)

```sql
alter table orders add column if not exists email_provider text;
alter table orders add column if not exists fix_result jsonb;
```

### Variáveis

```
SUPABASE_URL=https://<seu-projeto>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service role key — Settings → API>
```

> Use a **service role key** (não a anon). O servidor escreve direto na tabela e
> contorna RLS. Nunca exponha essa key no frontend.

---

## 2. Stripe (conta já criada, falta linkar)

### 2.1 Chaves de API

1. Dashboard Stripe → **Developers → API keys**
2. Comece no modo **Test** (toggle no canto superior direito).
3. Copie:
   - **Secret key** (`sk_test_...`) → `STRIPE_SECRET_KEY`
   - **Publishable key** (`pk_test_...`) → `STRIPE_PUBLISHABLE_KEY`

### 2.2 Webhook (essencial — é onde o relatório é gerado)

O pagamento só vira produto quando o Stripe chama `POST /api/webhooks/stripe`.

**Em produção:**
1. Dashboard → **Developers → Webhooks → Add endpoint**
2. URL: `https://<seu-dominio>/api/webhooks/stripe`
3. Evento: `checkout.session.completed`
4. Copie o **Signing secret** (`whsec_...`) → `STRIPE_WEBHOOK_SECRET`

**Em desenvolvimento local** (Stripe CLI):
```bash
stripe login
stripe listen --forward-to localhost:3001/api/webhooks/stripe
# copie o whsec_... que ele imprime para STRIPE_WEBHOOK_SECRET
```
Dispare um teste:
```bash
stripe trigger checkout.session.completed
```

### 2.3 Variáveis
```
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

> O preço (R$ 99) é montado inline em `server/routes/checkout.ts` via `price_data`
> — não precisa criar Produto/Preço no painel do Stripe.

---

## 3. E-mail para clientes — opção GRÁTIS

O código já usa **[Resend](https://resend.com)**, que tem free tier suficiente:

| Plano | Preço | Limite |
|-------|-------|--------|
| **Free** | R$ 0 | **3.000 e-mails/mês, 100/dia** |

Para o volume de um SaaS de nicho começando, o free tier cobre. Nenhuma mudança
de código é necessária — só configurar.

### Setup
1. Crie conta em [resend.com](https://resend.com).
2. **Domains → Add Domain** → adicione `emailcorreto.com.br`.
3. Publique os registros DNS que o Resend mostrar (SPF/DKIM) — ironia útil: é o
   mesmo tipo de configuração que o produto corrige.
4. **API Keys → Create** → copie (`re_...`) → `RESEND_API_KEY`.
5. Defina o remetente (precisa ser no domínio verificado):
   ```
   RESEND_FROM=EmailCorreto <noreply@emailcorreto.com.br>
   ```

> **Sem domínio próprio ainda?** Para testar, o Resend permite enviar de
> `onboarding@resend.dev` apenas para o seu próprio e-mail cadastrado. Serve para
> validar o fluxo, não para produção.

### Alternativas grátis (se trocar de provedor)
| Serviço | Free tier | Troca de código |
|---------|-----------|-----------------|
| **Resend** (atual) | 3.000/mês | nenhuma |
| Brevo | 300/dia | trocar SDK em `server/routes/webhook.ts` |
| AWS SES | 3.000/mês (1º ano) | trocar SDK + setup IAM |

Recomendado ficar no **Resend** — já está integrado.

---

## 4. App
```
APP_URL=http://localhost:5173   # em prod: https://emailcorreto.com.br
PORT=3001
```

---

## 5. Fluxo completo (como as peças se conectam)

```
1. Cliente digita domínio       → POST /api/scan
                                    scanner.ts faz lookups DNS + DETECTA o provedor (MX/DKIM/SPF)
                                    devolve ScanResult (com detectedProvider)

2. Cliente paga                 → POST /api/checkout
                                    salva ScanResult + registrar + email_provider(opcional) no Supabase
                                    cria Stripe Checkout Session

3. Stripe confirma pagamento    → POST /api/webhooks/stripe
                                    carrega o pedido, roda generateFix(scan, registrar, override?)
                                    SALVA fix_result no Supabase
                                    envia e-mail (Resend) com link do relatório

4. Cliente abre o relatório     → GET /api/report/:orderId
                                    devolve fix_result (só se status='paid')
```

> O provedor de e-mail do cliente é **detectado automaticamente** no passo 1
> (via registros MX). O cliente não precisa escolher. `email_provider` no checkout
> é só um override manual opcional caso a detecção erre.
