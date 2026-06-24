// Tipos e helpers de chamada às rotas /api do backend.
// Os tipos espelham os retornos de email-fixer-code (ScanResult, FixResult).

export type Status = 'pass' | 'warning' | 'fail';

export interface ProtocolResult {
  status: Status;
  record: string | null;
  issues: string[];
  impact: string;
}

export interface DkimResult extends ProtocolResult {
  foundSelector: string | null;
  keyRevoked: boolean;
  testMode: boolean;
}

export interface DmarcResult extends ProtocolResult {
  policy: 'none' | 'quarantine' | 'reject' | null;
  subdomainPolicy: 'none' | 'quarantine' | 'reject' | null;
  dkimAlignment: 'r' | 's' | null;
  spfAlignment: 'r' | 's' | null;
}

export interface ProviderDetection {
  provider: string;
  confidence: 'high' | 'medium' | 'low';
  source: 'mx' | 'dkim_selector' | 'spf_include' | 'none';
  mxHosts: string[];
}

export interface ScanResult {
  domain: string;
  domainExists: boolean;
  spf: ProtocolResult;
  dkim: DkimResult;
  dmarc: DmarcResult;
  detectedProvider: ProviderDetection;
  overallStatus: 'healthy' | 'issues_found' | 'domain_not_found';
}

export interface DnsRecord {
  name: string;
  type: string;
  value: string;
  ttl: string | null;
}

export interface ProtocolFix {
  protocol: 'SPF' | 'DKIM' | 'DMARC';
  action: 'add' | 'replace' | 'none';
  explanation: string;
  record: DnsRecord;
  instructions: string[];
}

export interface FixResult {
  domain: string;
  emailProvider: string;
  emailProviderLabel: string;
  providerSource: 'auto' | 'manual';
  registrar: string;
  fixes: ProtocolFix[];
  summary: string;
}

export interface ReportResponse {
  domain: string;
  deliveredAt: string | null;
  fix: FixResult;
}

const API_BASE = import.meta.env.VITE_API_BASE ?? '';

async function parseError(res: Response): Promise<string> {
  try {
    const body = await res.json();
    return body?.error ?? `Erro ${res.status}`;
  } catch {
    return `Erro ${res.status}`;
  }
}

/** Escaneia um domínio. Lança Error com mensagem amigável em falha. */
export async function scanDomain(domain: string): Promise<ScanResult> {
  const res = await fetch(`${API_BASE}/api/scan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ domain }),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export interface CheckoutInput {
  domain: string;
  email: string;
  registrar?: string;
  emailProvider?: string;
  scanResult: ScanResult;
}

/** Cria a sessão de checkout no Stripe e retorna a URL de pagamento. */
export async function createCheckout(input: CheckoutInput): Promise<{ url: string }> {
  const res = await fetch(`${API_BASE}/api/checkout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

/**
 * Calcula um score de entregabilidade 0–100 a partir dos 3 protocolos.
 * Pesos: SPF 35, DKIM 35, DMARC 30. pass=cheio, warning=meio, fail=0.
 */
export function deliverabilityScore(scan: ScanResult): number {
  const w = { spf: 35, dkim: 35, dmarc: 30 } as const;
  const factor = (s: Status) => (s === 'pass' ? 1 : s === 'warning' ? 0.5 : 0);
  const total =
    w.spf * factor(scan.spf.status) +
    w.dkim * factor(scan.dkim.status) +
    w.dmarc * factor(scan.dmarc.status);
  return Math.round(total);
}

/** Busca o relatório de um pedido pago. */
export async function fetchReport(orderId: string): Promise<ReportResponse> {
  const res = await fetch(`${API_BASE}/api/report/${orderId}`);
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}
