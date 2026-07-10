// Cloudflare Workers não têm o módulo `dns` do Node. Usamos DNS-over-HTTPS.
import { dohTxt, dohMx, dohResolves } from "./doh.js";

// ─── Types ────────────────────────────────────────────────────────────────────

export type Status = "pass" | "warning" | "fail";
export type DnsError = "nxdomain" | "nodata" | "timeout" | "servfail" | null;

/**
 * Provedores de email suportados. Definido aqui (e não no generator) porque a
 * detecção do provedor é resultado do scan de DNS, não da geração de correções.
 * O generator importa este tipo.
 */
export type EmailProvider =
  | "google"
  | "microsoft365"
  | "locaweb"
  | "kinghost"
  | "hostgator_br"
  | "rdstation"
  | "brevo"
  | "mailchimp"
  | "sendgrid"
  | "zoho"
  | "fastmail"
  | "titan"
  | "smtp_generic"
  | "unknown";

export interface DnsResolution {
  records: string[][];
  error: DnsError;
}

export interface ProtocolResult {
  status: Status;
  record: string | null;
  issues: string[];
  impact: string;
}

export interface DkimResult extends ProtocolResult {
  foundSelector: string | null;
  keyRevoked: boolean;  // p= presente mas vazia (chave revogada)
  testMode: boolean;    // t=y detectado (modo de teste)
}

export interface DmarcResult extends ProtocolResult {
  policy: "none" | "quarantine" | "reject" | null;
  subdomainPolicy: "none" | "quarantine" | "reject" | null; // sp=
  dkimAlignment: "r" | "s" | null; // adkim=
  spfAlignment: "r" | "s" | null;  // aspf=
}

export interface ProviderDetection {
  provider: EmailProvider;
  confidence: "high" | "medium" | "low";
  /** Como o provedor foi inferido — para exibir ao cliente e permitir correção manual. */
  source: "mx" | "dkim_selector" | "spf_include" | "none";
  mxHosts: string[];
}

export interface ScanResult {
  domain: string;
  domainExists: boolean;
  spf: ProtocolResult;
  dkim: DkimResult;
  dmarc: DmarcResult;
  detectedProvider: ProviderDetection;
  overallStatus: "healthy" | "issues_found" | "domain_not_found";
}

// ─── Constants ────────────────────────────────────────────────────────────────

const DNS_TIMEOUT_MS = 5000;

/**
 * Seletores DKIM comuns, ordenados por frequência de uso no mercado brasileiro.
 * Node.js segue CNAMEs automaticamente, então seletores CNAME (M365, Brevo,
 * Mailchimp) são resolvidos corretamente sem código adicional.
 */
const COMMON_SELECTORS = [
  "google",    // Google Workspace
  "selector1", // Microsoft 365
  "selector2", // Microsoft 365 (rotação de chaves)
  "default",   // cPanel/hospedagens BR genéricas
  "mail",      // genérico
  "titan1",    // Titan Email (popular via Hostinger BR)
  "brevo1",    // Brevo / ex-Sendinblue (CNAME)
  "brevo2",    // Brevo / ex-Sendinblue (CNAME)
  "mte1",      // Mailchimp / Mandrill (CNAME, obrigatório desde mar/2024)
  "mte2",      // Mailchimp / Mandrill (CNAME)
  "mandrill",  // Mandrill legado (TXT)
  "zoho",      // Zoho Mail
  "s1",        // SendGrid
  "s2",        // SendGrid
  "dkim",      // genérico
  "k1",        // genérico
  "smtp",      // genérico
  "mxvault",   // MXvault
  "em",        // SendGrid legado
  "sendgrid",  // SendGrid manual
] as const;

// ─── DNS helpers ──────────────────────────────────────────────────────────────

/**
 * Faz lookup TXT com timeout explícito e categorização de erro.
 * Substitui o catch vazio anterior que silenciava NXDOMAIN e timeouts.
 */
async function resolveTxtSafe(name: string): Promise<DnsResolution> {
  // dohTxt já categoriza nxdomain/nodata/timeout/servfail igual ao contrato Node.
  const { records, error } = await dohTxt(name);
  return { records, error };
}

/** Concatena as strings internas de cada record TXT (RFC 1035 §3.3.14) */
function flattenTxt(resolution: DnsResolution): string[] {
  return resolution.records.map((r) => r.join(""));
}

/** Conta mecanismos SPF que fazem consultas DNS (limite: 10) */
function countSpfLookups(spf: string): number {
  const lookupMechanisms = /\b(a|mx|include|exists|ptr|redirect)\b/gi;
  const matches = spf.match(lookupMechanisms);
  return matches ? matches.length : 0;
}

// ─── SPF — análise pura (exportada para testes unitários) ─────────────────────

export function analyzeSpf(records: string[]): ProtocolResult {
  const spfRecords = records.filter((r) => r.startsWith("v=spf1"));

  if (spfRecords.length === 0) {
    return {
      status: "fail",
      record: null,
      issues: ["Nenhum registro SPF encontrado."],
      impact:
        "Servidores de email não conseguem verificar se você tem autorização para enviar " +
        "emails pelo seu domínio. Isso aumenta muito a chance de seus emails caírem no " +
        "spam ou serem rejeitados.",
    };
  }

  const issues: string[] = [];
  const record = spfRecords[0];

  if (spfRecords.length > 1) {
    issues.push(
      `Foram encontrados ${spfRecords.length} registros SPF — apenas um é permitido pelo ` +
        "protocolo. O excesso causa um erro permanente (PermError) e o SPF falha para " +
        "todos os remetentes."
    );
  }

  if (record.includes("+all")) {
    issues.push(
      'Seu SPF contém "+all", que autoriza qualquer servidor do mundo a enviar email como ' +
        "se fosse você. Isso anula completamente a proteção do SPF."
    );
  }

  if (record.includes("?all")) {
    issues.push(
      '"?all" (neutro) não oferece nenhuma proteção — é equivalente a não ter SPF. ' +
        'Mude para "~all" (soft fail) ou "-all" (hard fail).'
    );
  }

  const hasAllMechanism =
    record.includes("~all") ||
    record.includes("-all") ||
    record.includes("+all") ||
    record.includes("?all");

  if (!hasAllMechanism) {
    issues.push(
      'O registro SPF está incompleto: falta o mecanismo "all" no final ' +
        '(ex: "~all" ou "-all"). Sem ele, o comportamento é indefinido em vários ' +
        "servidores de email."
    );
  }

  if (record.includes("~all") && !record.includes("+all") && !record.includes("?all")) {
    issues.push(
      '"~all" (soft fail) está configurado: emails de remetentes não autorizados ainda ' +
        "são aceitos, mas marcados como suspeitos. Considere migrar para " +
        '"-all" (hard fail) quando sua configuração estiver estável.'
    );
  }

  const lookupCount = countSpfLookups(record);
  if (lookupCount > 10) {
    issues.push(
      `Seu SPF tem ${lookupCount} mecanismos que fazem consultas DNS — o limite é 10. ` +
        "Acima desse limite, o SPF falha com um erro permanente (PermError) para todos " +
        "os remetentes, independentemente de qualquer outra configuração."
    );
  }

  const hasCriticalIssue =
    spfRecords.length > 1 ||
    record.includes("+all") ||
    !hasAllMechanism ||
    lookupCount > 10;

  const status: Status = issues.length === 0 ? "pass" : hasCriticalIssue ? "fail" : "warning";

  return {
    status,
    record,
    issues,
    impact:
      issues.length === 0
        ? "O SPF está configurado corretamente. Servidores de email conseguem verificar seus remetentes autorizados."
        : "Um SPF mal configurado reduz a entregabilidade dos seus emails e pode permitir que outros falsifiquem seu domínio.",
  };
}

// ─── DKIM — análise pura (exportada para testes unitários) ────────────────────

export function analyzeDkim(selector: string, record: string): DkimResult {
  const issues: string[] = [];
  let keyRevoked = false;
  let testMode = false;

  // Verificar chave pública
  const keyMatch = record.match(/p=([^;]*)/);
  if (!keyMatch) {
    issues.push(
      "O registro DKIM existe mas não contém a tag de chave pública (p=). " +
        "O registro é inválido e não autentica nenhum email."
    );
  } else if (keyMatch[1].trim() === "") {
    keyRevoked = true;
    issues.push(
      "Chave DKIM revogada: o registro existe mas a chave pública está vazia (p=). " +
        "Você precisa gerar e publicar uma nova chave no seu provedor de email."
    );
  } else {
    const keyLen = keyMatch[1].length;
    if (keyLen < 200) {
      issues.push(
        `A chave DKIM parece ter menos de 1024 bits (tamanho estimado: ${keyLen} caracteres). ` +
          "Chaves menores que 1024 bits são consideradas fracas e rejeitadas por alguns " +
          "provedores. Gere uma nova chave de 2048 bits."
      );
    }
  }

  // Verificar modo de teste (t=y)
  const flagsMatch = record.match(/\bt=([^;]+)/);
  if (flagsMatch) {
    const flags = flagsMatch[1].split(":").map((f) => f.trim());
    if (flags.includes("y")) {
      testMode = true;
      issues.push(
        "O registro DKIM está em modo de teste (t=y). Isso indica que a configuração " +
          "ainda não foi finalizada. Remova a tag t=y quando estiver tudo validado."
      );
    }
  }

  const status: Status = keyRevoked ? "fail" : issues.length === 0 ? "pass" : "warning";

  return {
    status,
    record,
    foundSelector: selector,
    keyRevoked,
    testMode,
    issues,
    impact:
      issues.length === 0
        ? `DKIM configurado corretamente (seletor: ${selector}). Seus emails têm assinatura digital, reduzindo o risco de spam.`
        : "Um DKIM inválido ou fraco compromete a autenticidade dos seus emails. Gmail e Outlook usam essa assinatura para decidir se o email é legítimo.",
  };
}

// ─── DMARC — análise pura (exportada para testes unitários) ───────────────────

export function analyzeDmarc(record: string | null): DmarcResult {
  if (!record) {
    return {
      status: "fail",
      record: null,
      policy: null,
      subdomainPolicy: null,
      dkimAlignment: null,
      spfAlignment: null,
      issues: ["Nenhum registro DMARC encontrado."],
      impact:
        "Sem DMARC, não há política dizendo aos servidores o que fazer com emails que " +
        "falham na autenticação. Spammers podem falsificar seu domínio e você não recebe " +
        "nenhum relatório sobre isso.",
    };
  }

  const issues: string[] = [];

  const policyMatch = record.match(/\bp=(\w+)/);
  const policy = (policyMatch?.[1] ?? null) as DmarcResult["policy"];

  if (!policy) {
    issues.push(
      'O registro DMARC está sem a tag obrigatória de política (p=). ' +
        "Sem ela, o registro é inválido. " +
        'Adicione p=none para começar no modo monitoramento.'
    );
  } else if (policy === "none") {
    issues.push(
      'Sua política DMARC está em modo monitoramento (p=none). Emails falsificados ' +
        "usando seu domínio ainda são entregues normalmente — você só fica sabendo pelos " +
        'relatórios. Quando estiver pronto, mude para "p=quarantine" e depois "p=reject".'
    );
  }

  // Tag sp= (política para subdomínios)
  const spMatch = record.match(/\bsp=(\w+)/);
  const subdomainPolicy = (spMatch?.[1] ?? null) as DmarcResult["subdomainPolicy"];

  if (policy === "reject" && (!subdomainPolicy || subdomainPolicy === "none")) {
    issues.push(
      'Seu domínio principal tem p=reject, mas os subdomínios não estão protegidos. ' +
        'Adicione "sp=reject" para proteger também endereços como ' +
        "mail.seudominio.com.br ou newsletter.seudominio.com.br."
    );
  }

  if (!record.includes("rua=")) {
    issues.push(
      'Falta a tag "rua=" para recebimento de relatórios agregados. Sem ela, você não ' +
        "saberá quem está enviando emails usando seu domínio. " +
        "Adicione: rua=mailto:seu@email.com.br"
    );
  }

  const pctMatch = record.match(/\bpct=(\d+)/);
  if (pctMatch) {
    const pct = parseInt(pctMatch[1], 10);
    if (pct < 100) {
      issues.push(
        `"pct=${pct}" significa que a política DMARC só se aplica a ${pct}% dos emails ` +
          "que falham na autenticação. Defina pct=100 para aplicação completa."
      );
    }
  }

  // Tags de alinhamento (informativo — não geram issues por padrão)
  const adkimMatch = record.match(/\badkim=([rs])/);
  const aspfMatch = record.match(/\baspf=([rs])/);
  const dkimAlignment = (adkimMatch?.[1] ?? null) as DmarcResult["dkimAlignment"];
  const spfAlignment = (aspfMatch?.[1] ?? null) as DmarcResult["spfAlignment"];

  const hasCriticalIssue = !policy;
  const status: Status = issues.length === 0 ? "pass" : hasCriticalIssue ? "fail" : "warning";

  return {
    status,
    record,
    policy,
    subdomainPolicy,
    dkimAlignment,
    spfAlignment,
    issues,
    impact:
      issues.length === 0
        ? "O DMARC está bem configurado. Você tem visibilidade e controle sobre emails não autenticados enviados com seu domínio."
        : "Um DMARC fraco ou ausente deixa seu domínio vulnerável a falsificações e reduz a entregabilidade dos seus emails.",
  };
}

// ─── SPF — wrapper com DNS ────────────────────────────────────────────────────

export async function scanSpf(
  domain: string,
  probe?: DnsResolution
): Promise<ProtocolResult> {
  const resolution = probe ?? (await resolveTxtSafe(domain));

  if (resolution.error === "timeout") {
    return {
      status: "warning",
      record: null,
      issues: [
        `Não foi possível consultar o SPF de "${domain}" — o servidor DNS não respondeu ` +
          `em ${DNS_TIMEOUT_MS / 1000} segundos. Tente novamente.`,
      ],
      impact:
        "O scan do SPF não foi concluído. O resultado pode não refletir a configuração real do domínio.",
    };
  }

  return analyzeSpf(flattenTxt(resolution));
}

// ─── DKIM — wrapper com DNS ───────────────────────────────────────────────────

export async function scanDkim(domain: string): Promise<DkimResult> {
  for (const selector of COMMON_SELECTORS) {
    const dkimHost = `${selector}._domainkey.${domain}`;
    const resolution = await resolveTxtSafe(dkimHost);

    if (resolution.error === "timeout") {
      return {
        status: "warning",
        record: null,
        foundSelector: null,
        keyRevoked: false,
        testMode: false,
        issues: [
          `Não foi possível consultar o DKIM de "${domain}" — timeout no DNS. Tente novamente.`,
        ],
        impact:
          "O scan do DKIM não foi concluído. O resultado pode não refletir a configuração real do domínio.",
      };
    }

    const records = flattenTxt(resolution);
    const dkimRecord = records.find((r) => r.includes("v=DKIM1") || r.includes("p="));

    if (dkimRecord) {
      return analyzeDkim(selector, dkimRecord);
    }
  }

  return {
    status: "fail",
    record: null,
    foundSelector: null,
    keyRevoked: false,
    testMode: false,
    issues: [
      `Nenhum registro DKIM encontrado (testamos ${COMMON_SELECTORS.length} seletores comuns). ` +
        "Se seu provedor de email usa um seletor personalizado, ele não foi detectado automaticamente.",
    ],
    impact:
      "Sem DKIM, seus emails não têm assinatura digital. Gmail e Outlook usam essa " +
      "assinatura para decidir se um email é legítimo. A falta de DKIM aumenta " +
      "significativamente a chance de cair no spam.",
  };
}

// ─── DMARC — wrapper com DNS ──────────────────────────────────────────────────

export async function scanDmarc(domain: string): Promise<DmarcResult> {
  const resolution = await resolveTxtSafe(`_dmarc.${domain}`);

  if (resolution.error === "timeout") {
    return {
      status: "warning",
      record: null,
      policy: null,
      subdomainPolicy: null,
      dkimAlignment: null,
      spfAlignment: null,
      issues: [
        `Não foi possível consultar o DMARC de "${domain}" — timeout no DNS. Tente novamente.`,
      ],
      impact:
        "O scan do DMARC não foi concluído. O resultado pode não refletir a configuração real do domínio.",
    };
  }

  const records = flattenTxt(resolution);
  const dmarcRecord = records.find((r) => r.startsWith("v=DMARC1")) ?? null;
  return analyzeDmarc(dmarcRecord);
}

// ─── Detecção de provedor de email ────────────────────────────────────────────

/**
 * Mapa de fragmentos de host MX → provedor. Casamos por substring (case-insensitive)
 * porque o host MX completo varia (ex.: aspmx.l.google.com, alt1.aspmx.l.google.com).
 * Ordem importa: padrões mais específicos primeiro.
 */
const MX_PATTERNS: ReadonlyArray<readonly [pattern: string, provider: EmailProvider]> = [
  ["google.com", "google"],
  ["googlemail.com", "google"],
  ["outlook.com", "microsoft365"],
  ["protection.outlook", "microsoft365"],
  ["locaweb.com.br", "locaweb"],
  ["kinghost.net", "kinghost"],
  ["uni5.net", "kinghost"],
  ["hostgator.com.br", "hostgator_br"],
  ["titan.email", "titan"],
  ["zoho.com", "zoho"],
  ["zoho.eu", "zoho"],
  ["messagingengine.com", "fastmail"], // Fastmail
  ["fastmail.com", "fastmail"],
  ["mailgun", "smtp_generic"],
  ["sendgrid", "sendgrid"],
] as const;

/**
 * Mapa de seletor DKIM encontrado → provedor. Usado como fonte secundária quando
 * o MX não é conclusivo (ex.: domínio usa email marketing além do email primário).
 */
const SELECTOR_TO_PROVIDER: Partial<Record<string, EmailProvider>> = {
  google: "google",
  selector1: "microsoft365",
  selector2: "microsoft365",
  titan1: "titan",
  brevo1: "brevo",
  brevo2: "brevo",
  mte1: "mailchimp",
  mte2: "mailchimp",
  mandrill: "mailchimp",
  zoho: "zoho",
  s1: "sendgrid",
  s2: "sendgrid",
  em: "sendgrid",
  sendgrid: "sendgrid",
};

/** True se o domínio resolve para algum A ou AAAA — usado para confirmar existência. */
async function domainResolves(domain: string): Promise<boolean> {
  return dohResolves(domain);
}

/** Resolve registros MX via DoH, retornando hosts em minúsculas ordenados por prioridade. */
async function resolveMxSafe(domain: string): Promise<string[]> {
  return dohMx(domain);
}

/**
 * Infere o provedor de email do domínio combinando três sinais, em ordem de confiança:
 *   1. MX records (high)       — quem recebe email do domínio
 *   2. Seletor DKIM encontrado (medium) — quem assina email do domínio
 *   3. SPF include (low)       — quem está autorizado a enviar
 * Exportada pura para teste; `detectProvider` faz os lookups.
 */
export function inferProvider(
  mxHosts: string[],
  dkimSelector: string | null,
  spfRecord: string | null
): ProviderDetection {
  // 1. MX — sinal mais forte
  for (const host of mxHosts) {
    for (const [pattern, provider] of MX_PATTERNS) {
      if (host.includes(pattern)) {
        return { provider, confidence: "high", source: "mx", mxHosts };
      }
    }
  }

  // 2. Seletor DKIM
  if (dkimSelector && SELECTOR_TO_PROVIDER[dkimSelector]) {
    return {
      provider: SELECTOR_TO_PROVIDER[dkimSelector]!,
      confidence: "medium",
      source: "dkim_selector",
      mxHosts,
    };
  }

  // 3. SPF include
  if (spfRecord) {
    for (const [pattern, provider] of [
      ["_spf.google.com", "google"],
      ["spf.protection.outlook.com", "microsoft365"],
      ["spf.locaweb.com.br", "locaweb"],
      ["_spf.kinghost.net", "kinghost"],
      ["hostgator.com.br", "hostgator_br"],
      ["_spf.rdstation.com.br", "rdstation"],
      ["spf.brevo.com", "brevo"],
      ["servers.mcsv.net", "mailchimp"],
      ["sendgrid.net", "sendgrid"],
      ["zoho.com", "zoho"],
      ["spf.messagingengine.com", "fastmail"],
      ["spf.titan.email", "titan"],
    ] as ReadonlyArray<readonly [string, EmailProvider]>) {
      if (spfRecord.includes(pattern)) {
        return { provider, confidence: "low", source: "spf_include", mxHosts };
      }
    }
  }

  return { provider: "unknown", confidence: "low", source: "none", mxHosts };
}

// ─── Domain normalization ─────────────────────────────────────────────────────

function normalizeDomain(domain: string): string {
  return domain
    .replace(/^https?:\/\//i, "")
    .replace(/^www\./i, "")
    .replace(/\/.*$/, "")
    .toLowerCase()
    .trim();
}

// ─── Domain not found result ──────────────────────────────────────────────────

function buildDomainNotFoundResult(domain: string): ScanResult {
  const msg = (proto: string): ProtocolResult => ({
    status: "fail",
    record: null,
    issues: [
      `Não foi possível verificar o ${proto}: o domínio "${domain}" não existe no DNS.`,
    ],
    impact: `O domínio "${domain}" não foi encontrado. Verifique se digitou corretamente.`,
  });

  return {
    domain,
    domainExists: false,
    spf: msg("SPF"),
    dkim: {
      ...msg("DKIM"),
      foundSelector: null,
      keyRevoked: false,
      testMode: false,
    },
    dmarc: {
      ...msg("DMARC"),
      policy: null,
      subdomainPolicy: null,
      dkimAlignment: null,
      spfAlignment: null,
    },
    detectedProvider: { provider: "unknown", confidence: "low", source: "none", mxHosts: [] },
    overallStatus: "domain_not_found",
  };
}

// ─── Main Scanner ─────────────────────────────────────────────────────────────

export async function scanDomain(domain: string): Promise<ScanResult> {
  const cleanDomain = normalizeDomain(domain);

  // Probe inicial no TXT raiz — reaproveitado como lookup SPF (evita query duplicada).
  const spfProbe = await resolveTxtSafe(cleanDomain);

  // Só declaramos "domínio não existe" se o TXT deu NXDOMAIN real E o domínio
  // também não tem MX nem A/AAAA. Muitos domínios válidos não têm TXT na raiz
  // (isso retorna ENODATA -> "nodata", que NÃO significa inexistente).
  if (spfProbe.error === "nxdomain") {
    const [mxHosts, resolvable] = await Promise.all([
      resolveMxSafe(cleanDomain),
      domainResolves(cleanDomain),
    ]);
    if (mxHosts.length === 0 && !resolvable) {
      return buildDomainNotFoundResult(cleanDomain);
    }
  }

  const [spf, dkim, dmarc, mxHosts] = await Promise.all([
    scanSpf(cleanDomain, spfProbe),
    scanDkim(cleanDomain),
    scanDmarc(cleanDomain),
    resolveMxSafe(cleanDomain),
  ]);

  const detectedProvider = inferProvider(mxHosts, dkim.foundSelector, spf.record);

  const overallStatus: ScanResult["overallStatus"] =
    spf.status === "pass" && dkim.status === "pass" && dmarc.status === "pass"
      ? "healthy"
      : "issues_found";

  return { domain: cleanDomain, domainExists: true, spf, dkim, dmarc, detectedProvider, overallStatus };
}
