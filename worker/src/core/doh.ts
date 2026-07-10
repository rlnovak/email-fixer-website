// DNS-over-HTTPS para Cloudflare Workers (que não têm o módulo `dns` do Node).
// Usa o resolver DoH JSON da Cloudflare (RFC 8484 / formato JSON do Google/Cloudflare).
// https://developers.cloudflare.com/1.1.1.1/encryption/dns-over-https/make-api-requests/dns-json/

const DOH_URL = 'https://cloudflare-dns.com/dns-query';
const DNS_TIMEOUT_MS = 5000;

// Códigos DNS RCODE relevantes
const RCODE_NOERROR = 0;
const RCODE_NXDOMAIN = 3;

interface DohAnswer {
  name: string;
  type: number;
  TTL: number;
  data: string;
}

interface DohResponse {
  Status: number;      // RCODE
  Answer?: DohAnswer[];
}

export type DohError = 'nxdomain' | 'nodata' | 'timeout' | 'servfail' | null;

// Tipos de registro DNS (números)
const TYPE = { A: 1, AAAA: 28, TXT: 16, MX: 15 } as const;

async function query(name: string, type: keyof typeof TYPE): Promise<DohResponse | 'timeout'> {
  const url = `${DOH_URL}?name=${encodeURIComponent(name)}&type=${type}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DNS_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: { accept: 'application/dns-json' },
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return { Status: 2 }; // SERVFAIL-ish
    return (await res.json()) as DohResponse;
  } catch {
    clearTimeout(timer);
    return 'timeout';
  }
}

/** Classifica a resposta em erro (ou null se ok com respostas). */
function classify(resp: DohResponse, want: number): { answers: DohAnswer[]; error: DohError } {
  if (resp.Status === RCODE_NXDOMAIN) return { answers: [], error: 'nxdomain' };
  if (resp.Status !== RCODE_NOERROR) return { answers: [], error: 'servfail' };
  const answers = (resp.Answer ?? []).filter((a) => a.type === want);
  if (answers.length === 0) return { answers: [], error: 'nodata' };
  return { answers, error: null };
}

/**
 * TXT lookup. Retorna as strings TXT (já sem aspas) e um erro categorizado,
 * espelhando o contrato de resolveTxtSafe do scanner Node.
 * Cada registro TXT vira um array de fragmentos (RFC 1035) — aqui a resposta DoH
 * já vem com o valor entre aspas; separamos fragmentos por `" "`.
 */
export async function dohTxt(name: string): Promise<{ records: string[][]; error: DohError }> {
  const resp = await query(name, 'TXT');
  if (resp === 'timeout') return { records: [], error: 'timeout' };
  const { answers, error } = classify(resp, TYPE.TXT);
  if (error) return { records: [], error };
  // data vem como: "\"frag1\" \"frag2\"" — extrai cada trecho entre aspas.
  const records = answers.map((a) => {
    const frags = a.data.match(/"([^"]*)"/g);
    if (frags) return frags.map((f) => f.slice(1, -1));
    return [a.data.replace(/^"|"$/g, '')];
  });
  return { records, error: null };
}

/** MX lookup. Retorna hosts em minúsculas ordenados por prioridade. */
export async function dohMx(name: string): Promise<string[]> {
  const resp = await query(name, 'MX');
  if (resp === 'timeout') return [];
  const { answers, error } = classify(resp, TYPE.MX);
  if (error) return [];
  // data MX: "10 aspmx.l.google.com."
  return answers
    .map((a) => {
      const parts = a.data.trim().split(/\s+/);
      const priority = parseInt(parts[0], 10);
      const host = (parts[1] ?? '').toLowerCase().replace(/\.$/, '');
      return { priority: isNaN(priority) ? 999 : priority, host };
    })
    .filter((r) => r.host)
    .sort((a, b) => a.priority - b.priority)
    .map((r) => r.host);
}

/** True se o domínio resolve para algum A ou AAAA. */
export async function dohResolves(name: string): Promise<boolean> {
  const a = await query(name, 'A');
  if (a !== 'timeout' && classify(a, TYPE.A).error === null) return true;
  const aaaa = await query(name, 'AAAA');
  if (aaaa !== 'timeout' && classify(aaaa, TYPE.AAAA).error === null) return true;
  return false;
}
