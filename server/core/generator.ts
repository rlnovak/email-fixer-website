import type { ScanResult, EmailProvider } from "./scanner.js";

export type { EmailProvider } from "./scanner.js";

// ─── Types ────────────────────────────────────────────────────────────────────

/** Nome legível por provedor — exibido ao cliente em vez do slug do enum. */
const PROVIDER_LABELS: Record<EmailProvider, string> = {
  google:       "Google Workspace",
  microsoft365: "Microsoft 365",
  locaweb:      "Locaweb",
  kinghost:     "KingHost",
  hostgator_br: "HostGator Brasil",
  rdstation:    "RD Station",
  brevo:        "Brevo",
  mailchimp:    "Mailchimp",
  sendgrid:     "SendGrid",
  zoho:         "Zoho Mail",
  fastmail:     "Fastmail",
  titan:        "Titan Email",
  smtp_generic: "seu provedor SMTP",
  unknown:      "seu servidor de e-mail",
};

/**
 * Provedores que assinam com domínio próprio e NÃO oferecem DKIM com o domínio
 * do cliente. Para esses, o DKIM nunca alinha com o From: → DMARC só pode passar
 * via SPF. Avisamos o cliente em vez de gerar um registro DKIM que não funciona.
 * Fonte: docs/dns-research.md §5.5, §5.6, §5.7.
 */
const NO_CUSTOM_DKIM: ReadonlySet<EmailProvider> = new Set<EmailProvider>([
  "locaweb",
  "kinghost",
]);

/** Provedores cujo DKIM é publicado como CNAME (apontando para a infra deles), não TXT. */
const DKIM_CNAME_PROVIDERS: ReadonlySet<EmailProvider> = new Set<EmailProvider>([
  "microsoft365",
  "sendgrid",
  "brevo",
  "mailchimp",
]);

export type Registrar =
  | "registro_br"
  | "locaweb"
  | "kinghost"
  | "uolhost"
  | "hostgator_br"
  | "hostinger"
  | "cloudflare"
  | "cpanel_generic"
  | "godaddy"
  | "namecheap"
  | "google_domains"
  | "bluehost"
  | "siteground"
  | "hostgator"
  | "aws_route53"
  | "other";

export interface DnsRecord {
  name: string;       // Campo Host / Nome
  type: string;       // Tipo do registro (TXT, CNAME, etc.)
  value: string;      // Valor completo do registro
  ttl: string | null; // null para registradores que não expõem TTL
}

export interface ProtocolFix {
  protocol: "SPF" | "DKIM" | "DMARC";
  action: "add" | "replace" | "none";
  explanation: string;
  record: DnsRecord;
  instructions: string[];
}

export interface FixResult {
  domain: string;
  emailProvider: EmailProvider;
  emailProviderLabel: string;
  /** Como o provedor foi determinado: detecção automática ou escolha manual. */
  providerSource: "auto" | "manual";
  registrar: Registrar;
  fixes: ProtocolFix[];
  summary: string;
}

// ─── SPF includes por provedor ────────────────────────────────────────────────

const SPF_INCLUDES: Record<EmailProvider, string> = {
  google:       "include:_spf.google.com",
  microsoft365: "include:spf.protection.outlook.com",
  locaweb:      "include:spf.locaweb.com.br",
  kinghost:     "include:kinghost.net",
  hostgator_br: "include:hostgator.com.br",
  rdstation:    "include:_spf.rdstation.com.br",
  brevo:        "include:spf.brevo.com",
  mailchimp:    "include:servers.mcsv.net",
  sendgrid:     "include:sendgrid.net",
  zoho:         "include:zoho.com",
  fastmail:     "include:spf.messagingengine.com",
  titan:        "include:spf.titan.email",
  smtp_generic: "include:SPF_DO_SEU_PROVEDOR_SMTP",
  unknown:      "",
};

// ─── Gerador de registro SPF ──────────────────────────────────────────────────

function generateSpfRecord(
  domain: string,
  provider: EmailProvider,
  existingRecord: string | null
): { record: string; action: "add" | "replace" } {
  const include = SPF_INCLUDES[provider];

  // Caso 1: NÃO existe SPF → gerar do zero (só o include do provedor detectado).
  if (!existingRecord) {
    const mech = include ? `v=spf1 ${include} ~all` : "v=spf1 ip4:IP_DO_SEU_SERVIDOR_EMAIL ~all";
    return { record: mech, action: "add" };
  }

  // Caso 2: JÁ existe SPF → PRESERVAR o que está lá. Nunca descartar includes/IPs
  // (o domínio pode enviar por vários provedores — HubSpot, Mandrill, etc.).
  // Só ajustamos cirurgicamente: (a) garantir que o include do provedor detectado
  // esteja presente; (b) NÃO mexer no qualificador `all` aqui (isso é recomendação,
  // tratada como issue no scanner — não regeneramos por causa disso).
  let record = existingRecord.trim();

  const includeMissing = include && !record.includes(include.replace("include:", ""));
  if (includeMissing) {
    // Insere o include ANTES do mecanismo `all` final, preservando todo o resto.
    const allMatch = record.match(/\s+[+~?-]?all\s*$/i);
    if (allMatch) {
      record = record.slice(0, allMatch.index) + ` ${include}` + allMatch[0];
    } else {
      record = `${record} ${include}`;
    }
    return { record, action: "replace" };
  }

  // O SPF já cobre o provedor detectado e está funcional — não há o que substituir.
  // Retornamos o registro atual inalterado; o chamador decide não gerar um "fix".
  return { record, action: "replace" };
}

// ─── Gerador de registro DMARC ────────────────────────────────────────────────

function generateDmarcRecord(
  domain: string,
  spfFixed: boolean,
  dkimFixed: boolean,
  existingPolicy: string | null
): string {
  // Começa com p=none se estamos tocando em SPF/DKIM para não interromper o fluxo
  const policy = spfFixed || dkimFixed ? "none" : "quarantine";
  const reportEmail = `postmaster@${domain}`;
  return `v=DMARC1; p=${policy}; rua=mailto:${reportEmail}; ruf=mailto:${reportEmail}; pct=100; adkim=r; aspf=r`;
}

// ─── Metadados por registrador ────────────────────────────────────────────────
//
// PROVENIÊNCIA das instruções de painel:
//  - VERIFICADO contra a documentação oficial (2026-07-10):
//      hostinger (support.hostinger.com), registro_br (registro.br).
//  - NÃO VERIFICADO (compilado de docs/dns-research.md, gerado por pesquisa em
//    2026-03-30; caminhos de menu podem estar desatualizados): locaweb, kinghost,
//    uolhost, hostgator_br, cloudflare, godaddy, namecheap, google_domains,
//    bluehost, siteground, hostgator, aws_route53.
//  Os VALORES técnicos (SPF/DKIM/DMARC) são corretos por RFC; revisar os CAMINHOS
//  de cada painel contra a realidade antes de escalar as vendas.

interface RegistrarMeta {
  hostFormat: (name: string) => string;
  hasTtl: boolean;
  extraNotes: string[];
}

const domain_placeholder = "__DOMAIN_ROOT__";

const REGISTRAR_META: Record<Registrar, RegistrarMeta> = {
  registro_br: {
    hostFormat: (n) => (n === domain_placeholder ? "@" : n),
    hasTtl: true,
    extraNotes: [
      "No Registro.br, o campo 'Nome' deve ser o hostname relativo (sem o domínio). Use '@' para o domínio raiz.",
      "O TTL recomendado é 3600 (1 hora). O mínimo aceito pelo Registro.br é 300 segundos.",
    ],
  },
  locaweb: {
    hostFormat: (n) => (n === domain_placeholder ? "@" : n),
    hasTtl: true,
    extraNotes: [
      "No painel Locaweb, use '@' no campo 'Subdomínio' quando o registro for para o domínio raiz.",
      "Alterações de DNS na Locaweb podem levar até 24 horas para propagar completamente.",
    ],
  },
  kinghost: {
    hostFormat: (n) => (n === domain_placeholder ? "@" : n),
    hasTtl: true,
    extraNotes: [
      "No KingHost, use '@' no campo 'Entrada' quando o registro for para o domínio raiz.",
    ],
  },
  uolhost: {
    hostFormat: (n) => (n === domain_placeholder ? "@" : n),
    hasTtl: true,
    extraNotes: [
      "No UOLHost, use '@' no campo 'Hostname' quando o registro for para o domínio raiz.",
      "Caso não haja campo de TTL visível, deixe o valor padrão (geralmente 3600).",
    ],
  },
  hostgator_br: {
    hostFormat: (n) => (n === domain_placeholder ? "@" : n),
    hasTtl: true,
    extraNotes: [
      "O HostGator Brasil usa cPanel. Caminho completo: Painel de Controle → cPanel → Editor de Zona DNS → Gerenciar.",
      "Use '@' no campo 'Nome' quando o registro for para o domínio raiz.",
    ],
  },
  // Fonte: support.hostinger.com — "Como Adicionar e Remover Registros TXT na Hostinger"
  // e "Como gerenciar seus registros DNS no hPanel". Verificado em 2026-07-10.
  hostinger: {
    hostFormat: (n) => (n === domain_placeholder ? "@" : n),
    hasTtl: true,
    extraNotes: [
      "Use '@' no campo 'Nome' (host) para o domínio raiz; para DKIM/DMARC, informe apenas o prefixo (ex.: '_dmarc' ou 'selector._domainkey'), sem repetir o domínio.",
      "Mantenha o TTL no valor padrão (recomendado pela Hostinger).",
      "⚠️  Se o domínio estiver apontando para outro provedor via NS, a zona DNS é gerenciada lá, não na Hostinger.",
    ],
  },
  cloudflare: {
    hostFormat: (n) => (n === domain_placeholder ? "@" : n),
    hasTtl: true,
    extraNotes: [
      "⚠️  Certifique-se de que o status do Proxy está como 'Somente DNS' (ícone de nuvem cinza). Registros TXT com proxy ativado podem não funcionar corretamente.",
      "No Cloudflare, use '@' no campo 'Nome' para o domínio raiz; para DKIM/DMARC, informe apenas o prefixo (ex.: '_dmarc'), sem repetir o domínio.",
    ],
  },
  cpanel_generic: {
    hostFormat: (n) => (n === domain_placeholder ? "@" : n),
    hasTtl: true,
    extraNotes: [
      "No cPanel: navegue até 'Editor de Zona' e clique em 'Gerenciar' ao lado do seu domínio.",
      "Use '@' no campo 'Nome' quando o registro for para o domínio raiz.",
    ],
  },
  godaddy: {
    hostFormat: (n) => (n === domain_placeholder ? "@" : n),
    hasTtl: true,
    extraNotes: [
      "O GoDaddy remove automaticamente o domínio raiz do campo Host. Use '@' para o domínio raiz.",
    ],
  },
  namecheap: {
    hostFormat: (n) => (n === domain_placeholder ? "@" : n),
    hasTtl: true,
    extraNotes: [
      "O Namecheap usa nomes relativos. Use '@' para o domínio raiz.",
    ],
  },
  google_domains: {
    hostFormat: (n) => (n === domain_placeholder ? "@" : n),
    hasTtl: false,
    extraNotes: [
      "O Google Domains / Squarespace Domains não exibe campo de TTL — deixe o valor padrão.",
    ],
  },
  bluehost: {
    hostFormat: (n) => (n === domain_placeholder ? "@" : n),
    hasTtl: true,
    extraNotes: [
      "O Bluehost usa cPanel. Caminho: Hospedagem → cPanel → Editor de Zona → Gerenciar.",
    ],
  },
  siteground: {
    hostFormat: (n) => (n === domain_placeholder ? "@" : n),
    hasTtl: true,
    extraNotes: [
      "No SiteGround: acesse Site Tools → Domínios → Editor de Zona DNS.",
    ],
  },
  hostgator: {
    hostFormat: (n) => (n === domain_placeholder ? "@" : n),
    hasTtl: true,
    extraNotes: [
      "O HostGator usa cPanel. Caminho: cPanel → Editor de Zona → Gerenciar.",
    ],
  },
  aws_route53: {
    hostFormat: (n) => `${n}.`,
    hasTtl: true,
    extraNotes: [
      "O Route 53 exige ponto final nos nomes dos registros (ex.: '_dmarc.seudominio.com.').",
      'Os valores de registros TXT no Route 53 devem estar entre aspas duplas (ex.: "v=spf1 include:... ~all").',
    ],
  },
  other: {
    hostFormat: (n) => (n === domain_placeholder ? "@" : n),
    hasTtl: true,
    extraNotes: [
      "Seu painel de DNS terá campos chamados 'Nome' ou 'Host', 'Tipo', 'Valor' ou 'Conteúdo', e 'TTL'.",
      "Use '@' (ou deixe em branco) no campo 'Nome' para o domínio raiz.",
    ],
  },
};

/**
 * Resolve o nome do registro para a forma final que o cliente deve digitar no
 * painel do registrador. Trata o sentinel interno `__DOMAIN_ROOT__` (registro
 * na raiz do domínio) e os formatos especiais por registrador. Chamada uma vez
 * em generateFix para que tanto o registro estruturado quanto as instruções
 * fiquem limpos (sem vazar o placeholder).
 */
function resolveHostName(registrar: Registrar, rawName: string, domain: string): string {
  const isRoot = rawName === domain_placeholder;

  // Route 53 exige FQDN com ponto final, tanto para a raiz quanto para subdomínios.
  if (registrar === "aws_route53") {
    return isRoot ? `${domain}.` : `${rawName}.`;
  }

  if (isRoot) {
    // Apex: '@' é aceito por todos os painéis suportados (e equivale a deixar em branco).
    return "@";
  }
  return rawName;
}

function buildInstructions(
  registrar: Registrar,
  record: DnsRecord,
  action: "add" | "replace",
  protocol: string
): string[] {
  const meta = REGISTRAR_META[registrar];
  const steps: string[] = [];
  let step = 1;

  const navSteps: Record<Registrar, string> = {
    registro_br:    "Acesse registro.br → Entrar → selecione o domínio → Editar zona DNS.",
    locaweb:        "Acesse o painel Locaweb (painel.locaweb.com.br) → Hospedagem → DNS do Domínio.",
    kinghost:       "Acesse o painel KingHost (painel.kinghost.com.br) → Domínios → Gerenciar DNS.",
    uolhost:        "Acesse o painel UOLHost (painel.uolhost.com.br) → Domínios → Zona DNS.",
    hostgator_br:   "Acesse o HostGator Brasil (financeiro.hostgator.com.br) → Painel de Controle → cPanel → Editor de Zona DNS.",
    hostinger:      "Acesse a Hostinger (hpanel.hostinger.com) → Domínios → selecione o domínio → Editor de Zona DNS (DNS / Gerenciamento de DNS).",
    cloudflare:     "Acesse o Cloudflare (dash.cloudflare.com) → selecione o domínio → DNS → Registros.",
    cpanel_generic: "Acesse o cPanel da sua hospedagem → Editor de Zona → clique em 'Gerenciar' ao lado do seu domínio.",
    godaddy:        "Acesse o GoDaddy (dcc.godaddy.com) → Meus Produtos → DNS → Gerenciar Zonas → selecione o domínio.",
    namecheap:      "Acesse o Namecheap (ap.www.namecheap.com) → Lista de Domínios → Gerenciar → DNS Avançado.",
    google_domains: "Acesse o Google Domains (domains.google.com) ou Squarespace Domains → DNS → Registros personalizados.",
    bluehost:       "Acesse o Bluehost → Hospedagem → cPanel → Editor de Zona → Gerenciar.",
    siteground:     "Acesse o SiteGround Site Tools (my.siteground.com) → Domínios → Editor de Zona DNS.",
    hostgator:      "Acesse o HostGator → cPanel → Editor de Zona → Gerenciar.",
    aws_route53:    "Acesse a AWS (console.aws.amazon.com/route53) → Route 53 → Zonas hospedadas → selecione o domínio.",
    other:          "Acesse o painel do seu provedor de DNS e navegue até a seção de registros DNS do seu domínio.",
  };

  steps.push(`${step++}. ${navSteps[registrar]}`);

  for (const note of meta.extraNotes) {
    steps.push(`${step++}. Obs.: ${note}`);
  }

  if (action === "replace") {
    steps.push(
      `${step++}. Localize o registro ${protocol} existente (tipo ${record.type}) e EXCLUA-O antes de adicionar o novo.`
    );
  }

  steps.push(`${step++}. Clique em 'Adicionar Registro' (ou '+ Adicionar' / 'Novo registro', conforme o painel).`);

  // record.name já vem resolvido por resolveHostName() em generateFix.
  steps.push(`${step++}. No campo 'Nome' / 'Host', preencha: ${record.name}`);
  steps.push(`${step++}. No campo 'Tipo', selecione: ${record.type}`);
  steps.push(`${step++}. No campo 'Valor' / 'Conteúdo', preencha:\n   ${record.value}`);

  if (meta.hasTtl && record.ttl) {
    steps.push(`${step++}. No campo 'TTL', preencha: ${record.ttl} (ou o menor valor disponível).`);
  }

  steps.push(`${step++}. Salve / confirme o registro.`);

  return steps;
}

// ─── Gerador principal de correções ───────────────────────────────────────────

export function generateFix(
  scan: ScanResult,
  registrar: Registrar,
  emailProviderOverride?: EmailProvider
): FixResult {
  const { domain, spf, dkim, dmarc } = scan;
  // Usa o provedor detectado no scan, salvo se o cliente corrigir manualmente.
  const emailProvider: EmailProvider =
    emailProviderOverride ?? scan.detectedProvider.provider;
  const fixes: ProtocolFix[] = [];

  // ── SPF ──────────────────────────────────────────────────────────────────
  if (spf.status !== "pass") {
    const { record: spfValue, action } = generateSpfRecord(domain, emailProvider, spf.record);
    const spfUnchanged = spf.record !== null && spfValue.trim() === spf.record.trim();

    if (spfUnchanged) {
      // SPF JÁ EXISTE e já cobre o provedor — está funcional, só tem avisos (ex.:
      // ~all). NÃO substituímos (isso poderia descartar includes de outros
      // provedores). Mostramos apenas a recomendação de ajuste fino.
      fixes.push({
        protocol: "SPF",
        action: "none",
        explanation:
          `Seu SPF já está publicado e funcional — não mexa nele sem necessidade. ` +
          `Há apenas um ajuste opcional a considerar (veja abaixo). ` +
          `NÃO recomendamos substituir o registro: ele pode autorizar vários serviços de envio que você usa.`,
        record: { name: resolveHostName(registrar, domain_placeholder, domain), type: "TXT", value: spf.record!, ttl: "3600" },
        instructions: [
          `1. Seu SPF atual: ${spf.record}`,
          ...spf.issues.map((iss, i) => `${i + 2}. ${iss}`),
          `${spf.issues.length + 2}. Se decidir aplicar algum ajuste, EDITE o registro existente preservando todos os "include:" e IPs já presentes — nunca apague os outros serviços de envio.`,
        ],
      });
    } else {
      const dnsRecord: DnsRecord = {
        name: resolveHostName(registrar, domain_placeholder, domain),
        type: "TXT",
        value: spfValue,
        ttl: "3600",
      };
      fixes.push({
        protocol: "SPF",
        action,
        explanation:
          action === "replace"
            ? `Ajuste seu registro SPF para incluir também o ${PROVIDER_LABELS[emailProvider]}. O valor abaixo PRESERVA o que você já tinha e apenas acrescenta o que faltava — confira antes de salvar.`
            : `Adicione um registro SPF para informar aos servidores de destino quais remetentes estão autorizados a enviar e-mails por ${domain}.`,
        record: dnsRecord,
        instructions: buildInstructions(registrar, dnsRecord, action, "SPF"),
      });
    }
  }

  // ── DKIM ─────────────────────────────────────────────────────────────────
  if (dkim.status !== "pass") {
    if (NO_CUSTOM_DKIM.has(emailProvider)) {
      // Locaweb/KingHost assinam com domínio próprio — DKIM com o domínio do
      // cliente é impossível. Gerar um registro TXT aqui só confundiria. Em vez
      // disso, explicamos a limitação e que o DMARC dependerá do SPF.
      const label = PROVIDER_LABELS[emailProvider];
      fixes.push({
        protocol: "DKIM",
        action: "none",
        explanation:
          `O ${label} assina os e-mails com o domínio próprio dele, e não com ${domain}. ` +
          `Por isso, não é possível publicar um registro DKIM que alinhe com o seu domínio — ` +
          `o DKIM não contribuirá para o DMARC neste provedor. A entrega continuará protegida pelo SPF.`,
        record: { name: `_dkim_nao_aplicavel.${domain}`, type: "TXT", value: "", ttl: null },
        instructions: [
          `1. Nenhuma ação de DKIM é necessária no seu DNS para o ${label}.`,
          `2. Para que o DMARC funcione, garanta que o SPF (acima) esteja correto — ele será o único mecanismo de alinhamento.`,
          `3. Se precisar de DKIM alinhado ao seu domínio (recomendado para p=reject), considere um provedor que ofereça DKIM personalizado (Google Workspace, Microsoft 365, Zoho) ou um serviço SMTP transacional dedicado.`,
        ],
      });
    } else {
      const selector =
        emailProvider === "google"       ? "google"    :
        emailProvider === "microsoft365" ? "selector1" :
        emailProvider === "brevo"        ? "brevo1"    :
        emailProvider === "mailchimp"    ? "mte1"      :
        emailProvider === "sendgrid"     ? "s1"        :
        emailProvider === "titan"        ? "titan1"    :
        emailProvider === "zoho"         ? "zoho"      :
        "mail";

      const dkimName = resolveHostName(registrar, `${selector}._domainkey.${domain}`, domain);
      const isCname = DKIM_CNAME_PROVIDERS.has(emailProvider);

      const dnsRecord: DnsRecord = {
        name: dkimName,
        type: isCname ? "CNAME" : "TXT",
        value: isCname
          ? "DESTINO_CNAME_DO_PROVEDOR (ex.: selector1-seudominio._domainkey.seudominio.onmicrosoft.com)"
          : "v=DKIM1; k=rsa; p=SUA_CHAVE_PUBLICA_DO_PROVEDOR",
        ttl: "3600",
      };

      const providerInstructions: Record<EmailProvider, string> = {
        google:
          "No Google Admin (admin.google.com): Apps → Google Workspace → Gmail → Autenticar e-mail → Gerar novo registro. Copie o valor TXT exibido.",
        microsoft365:
          "No Centro de Administração do Microsoft 365: Segurança → Políticas e regras → Políticas de ameaças → Configurações de autenticação de e-mail → DKIM → Habilitar para o seu domínio. Copie os DOIS registros CNAME exibidos (selector1 e selector2).",
        locaweb: "",  // tratado em NO_CUSTOM_DKIM acima
        kinghost: "", // tratado em NO_CUSTOM_DKIM acima
        hostgator_br:
          "No cPanel do HostGator BR: E-mail → Autenticação (Email Deliverability). Ative o DKIM e copie o valor TXT gerado.",
        rdstation:
          "No RD Station (app.rdstation.com.br): Configurações → Conta → Configurações de Envio. Siga as instruções para autenticar seu domínio e copie os registros fornecidos.",
        brevo:
          "No painel Brevo (app.brevo.com): Remetentes e IPs → Domínios → Autenticar um domínio. Copie os registros CNAME (brevo1 e brevo2) exibidos.",
        mailchimp:
          "No Mailchimp: Conta → Configurações → Domínios verificados → Verificar domínio. Copie os registros CNAME (mte1 e mte2) — obrigatórios desde março/2024.",
        sendgrid:
          "No SendGrid: Configurações → Autenticação de Remetente → Autenticar seu domínio. Siga o assistente e copie os registros CNAME (s1 e s2) fornecidos.",
        zoho:
          "No Zoho Mail Admin Console: Autenticação de E-mail → DKIM → Adicionar Domínio → Gerar Chave. Copie o valor TXT do registro.",
        fastmail:
          "Nas Configurações do Fastmail: Domínios → seu domínio → Configurar. O registro DKIM é exibido nessa tela.",
        titan:
          "No painel do Titan Email: Configurações → DKIM. Gere o registro e copie o valor TXT exibido.",
        smtp_generic:
          "No painel do seu provedor SMTP, localize a seção DKIM / DomainKeys e gere uma chave para o seu domínio. Copie o valor da chave pública.",
        unknown:
          "Acesse o painel de administração do seu provedor de e-mail e procure por 'DKIM', 'Autenticação de E-mail' ou 'DomainKeys'. Gere uma chave e copie o valor da chave pública.",
      };

      // 'replace' só faz sentido se o registro existente usa o MESMO seletor que
      // vamos gerar. Seletores diferentes são registros DNS distintos — não conflitam.
      const action: "add" | "replace" =
        dkim.foundSelector === selector ? "replace" : "add";

      const placeholderStep = isCname
        ? `2. Com o destino CNAME em mãos, use exatamente o valor fornecido pelo provedor no campo 'Valor'/'Destino'. NÃO crie um registro TXT — este provedor usa CNAME.`
        : `2. Com a chave em mãos, substitua "SUA_CHAVE_PUBLICA_DO_PROVEDOR" no valor do registro acima pela chave real.`;

      fixes.push({
        protocol: "DKIM",
        action,
        explanation:
          `O DKIM exige um registro gerado pelo ${PROVIDER_LABELS[emailProvider]}. ` +
          (isCname
            ? `Este provedor publica o DKIM como CNAME (geralmente dois). Siga os passos abaixo para obtê-los.`
            : `Siga os passos abaixo para obter a chave e adicioná-la ao DNS.`),
        record: dnsRecord,
        instructions: [
          `1. Obtenha o registro DKIM no painel do seu provedor de e-mail:`,
          `   ${providerInstructions[emailProvider]}`,
          placeholderStep,
          ...buildInstructions(registrar, dnsRecord, action, "DKIM").slice(1),
        ],
      });
    }
  }

  // ── DMARC ─────────────────────────────────────────────────────────────────
  if (dmarc.status !== "pass") {
    const dmarcName = resolveHostName(registrar, `_dmarc.${domain}`, domain);
    const reportEmail = `postmaster@${domain}`;

    // CASO CRÍTICO: já existe DMARC com política FORTE (quarantine/reject).
    // NUNCA rebaixar. Preservar e apenas apontar o ajuste que falta (ex.: sp=).
    if (dmarc.record && (dmarc.policy === "reject" || dmarc.policy === "quarantine")) {
      const advice: string[] = [`1. Seu DMARC atual: ${dmarc.record}`];
      let n = 2;
      advice.push(
        `${n++}. ✅ Sua política já está em "p=${dmarc.policy}" — isso é uma proteção FORTE. NÃO rebaixe para p=none.`
      );
      for (const iss of dmarc.issues) advice.push(`${n++}. ${iss}`);
      advice.push(
        `${n++}. Se aplicar algum ajuste, EDITE o registro existente preservando "p=${dmarc.policy}" e as tags de relatório (rua/ruf). Não substitua o registro inteiro.`
      );
      fixes.push({
        protocol: "DMARC",
        action: "none",
        explanation:
          `Seu DMARC já está publicado com uma política forte (p=${dmarc.policy}) — não recomendamos substituir. ` +
          `Há apenas um ajuste opcional a considerar (veja abaixo). Rebaixar para p=none enfraqueceria sua proteção.`,
        record: { name: dmarcName, type: "TXT", value: dmarc.record, ttl: "3600" },
        instructions: advice,
      });
    } else {

    const spfFixed = spf.status !== "pass";
    const dkimFixed = dkim.status !== "pass";
    const dmarcValue = generateDmarcRecord(domain, spfFixed, dkimFixed, dmarc.policy);

    const dnsRecord: DnsRecord = {
      name: dmarcName,
      type: "TXT",
      value: dmarcValue,
      ttl: "3600",
    };

    // Valores prontos das 3 fases, para o cliente copiar quando evoluir a política.
    const dmarcNone = `v=DMARC1; p=none; rua=mailto:${reportEmail}; ruf=mailto:${reportEmail}; pct=100; adkim=r; aspf=r`;
    const dmarcQuarantine = `v=DMARC1; p=quarantine; rua=mailto:${reportEmail}; ruf=mailto:${reportEmail}; pct=100; adkim=r; aspf=r`;
    const dmarcReject = `v=DMARC1; p=reject; sp=reject; rua=mailto:${reportEmail}; ruf=mailto:${reportEmail}; pct=100; adkim=r; aspf=r`;

    const evolutionGuide: string[] = [
      "",
      "── Como fortalecer sua proteção depois (opcional, recomendado) ──",
      "O DMARC tem 3 níveis. Começamos no mais seguro (p=none) para não bloquear",
      "nenhum e-mail legítimo por engano. Conforme você confirma que está tudo certo,",
      "vá subindo o nível — basta EDITAR o valor do registro _dmarc no seu DNS:",
      "",
      "  Fase 1 — MONITORAR (o valor que você acabou de adicionar):",
      `    ${dmarcNone}`,
      "    Não bloqueia nada; só coleta relatórios. Deixe por ~30 dias.",
      "",
      "  Fase 2 — QUARENTENA (e-mails falsos vão para o spam do destinatário):",
      `    ${dmarcQuarantine}`,
      "    Use depois de confirmar, pelos relatórios, que seus e-mails reais passam.",
      "",
      "  Fase 3 — REJEITAR (proteção máxima; e-mails falsos são bloqueados):",
      `    ${dmarcReject}`,
      "    Use quando tiver certeza de que 100% dos seus envios legítimos estão autenticados.",
      "",
      "✅ Reverificar o seu domínio aqui é GRÁTIS e ilimitado. Sempre que mudar o registro,",
      "   volte e escaneie o domínio de novo para conferir se está tudo passando — sem pagar nada.",
    ];

    fixes.push({
      protocol: "DMARC",
      action: dmarc.record ? "replace" : "add",
      explanation:
        `${dmarc.record ? "Substitua" : "Adicione"} uma política DMARC para que os servidores de destino ` +
        `saibam o que fazer com e-mails não autenticados e enviem relatórios para você. ` +
        `Começamos no modo seguro (p=none): ele não bloqueia nada — apenas monitora. ` +
        `Você pode fortalecer a proteção depois, seguindo o guia no fim das instruções (é grátis reverificar).`,
      record: dnsRecord,
      instructions: [
        ...buildInstructions(registrar, dnsRecord, dmarc.record ? "replace" : "add", "DMARC"),
        ...evolutionGuide,
      ],
    });
    } // fim do else (DMARC ausente ou fraco)
  }

  const issueCount = fixes.length;
  const summary =
    issueCount === 0
      ? `${domain} não tem problemas de autenticação de e-mail — SPF, DKIM e DMARC estão corretamente configurados.`
      : `Encontramos ${issueCount} problema${issueCount > 1 ? "s" : ""} de autenticação de e-mail em ${domain}. Siga as instruções abaixo para adicionar ou atualizar os registros DNS.`;

  return {
    domain,
    emailProvider,
    emailProviderLabel: PROVIDER_LABELS[emailProvider],
    providerSource: emailProviderOverride ? "manual" : "auto",
    registrar,
    fixes,
    summary,
  };
}
