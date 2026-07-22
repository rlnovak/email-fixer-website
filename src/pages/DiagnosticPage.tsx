import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CheckCircle, AlertTriangle, XCircle, ArrowLeft, ShieldCheck, Loader2, Lock } from 'lucide-react';
import {
  scanDomain,
  createCheckout,
  deliverabilityScore,
  type ScanResult,
  type Status,
} from '../lib/api';

const REGISTRARS = [
  { value: 'registro_br', label: 'Registro.br' },
  { value: 'locaweb', label: 'Locaweb' },
  { value: 'kinghost', label: 'KingHost' },
  { value: 'uolhost', label: 'UOLHost' },
  { value: 'hostgator_br', label: 'HostGator Brasil' },
  { value: 'hostinger', label: 'Hostinger' },
  { value: 'cloudflare', label: 'Cloudflare' },
  { value: 'godaddy', label: 'GoDaddy' },
  { value: 'namecheap', label: 'Namecheap' },
  { value: 'aws_route53', label: 'AWS Route 53' },
  { value: 'other', label: 'Outro / não sei' },
];

const STATUS_META: Record<Status, { label: string; color: string; bg: string; Icon: typeof CheckCircle }> = {
  pass: { label: 'OK', color: '#27D07C', bg: 'bg-green-50', Icon: CheckCircle },
  warning: { label: 'Atenção', color: '#E6A100', bg: 'bg-yellow-50', Icon: AlertTriangle },
  fail: { label: 'Problema', color: '#FF3B3B', bg: 'bg-red-50', Icon: XCircle },
};

// Rótulos leigos + impacto de negócio (sem jargão técnico e sem revelar a solução).
const PROTOCOL_META: Record<'spf' | 'dkim' | 'dmarc', { label: string; businessImpact: string }> = {
  spf: {
    label: 'Autorização de envio',
    businessImpact:
      'Sem isso ajustado, o Gmail desconfia de quem está enviando e joga seus e-mails no spam — e o cliente nunca vê seu orçamento.',
  },
  dkim: {
    label: 'Assinatura dos e-mails',
    businessImpact:
      'Sem a assinatura correta, o provedor do destinatário não confia no seu envio e sua taxa de entrega despenca — vendas e leads perdidos.',
  },
  dmarc: {
    label: 'Proteção contra fraude',
    businessImpact:
      'Sem essa proteção, seu domínio fica exposto a golpes e sua reputação cai — mais e-mails legítimos parando no spam.',
  },
};

function ProtocolRow({
  protocol,
  result,
}: {
  protocol: 'spf' | 'dkim' | 'dmarc';
  result: { status: Status; issues: string[]; impact: string };
}) {
  const meta = STATUS_META[result.status];
  const info = PROTOCOL_META[protocol];
  const { Icon } = meta;
  const isProblem = result.status !== 'pass';
  // Texto técnico que ensina a solução — fica borrado atrás do cadeado.
  const lockedDetail = result.issues.length > 0 ? result.issues[0] : result.impact;

  return (
    <div className="flex items-start gap-4 p-5 rounded-2xl border border-gray-100 bg-white">
      <span className={`w-10 h-10 rounded-xl ${meta.bg} flex items-center justify-center flex-shrink-0`}>
        <Icon className="w-5 h-5" style={{ color: meta.color }} />
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-display font-bold text-textprimary">{info.label}</span>
          <span
            className="text-xs font-mono uppercase tracking-wider px-2 py-0.5 rounded-full"
            style={{ color: meta.color, backgroundColor: `${meta.color}1A` }}
          >
            {meta.label}
          </span>
        </div>

        {/* Impacto de negócio — sempre visível (não ensina a resolver) */}
        <p className="text-sm text-textsecondary leading-relaxed">
          {isProblem ? info.businessImpact : 'Este item está corretamente configurado no seu domínio.'}
        </p>

        {/* Detalhe técnico acionável — ofuscado atrás do cadeado */}
        {isProblem && (
          <div className="relative mt-3 rounded-xl border border-gray-100 bg-gray-50 overflow-hidden">
            <p
              className="text-sm text-textsecondary leading-relaxed p-3 select-none"
              style={{ filter: 'blur(6px)', userSelect: 'none', pointerEvents: 'none' }}
              aria-hidden="true"
            >
              {lockedDetail}
            </p>
            <div className="absolute inset-0 flex items-center justify-center bg-white/30">
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-textprimary bg-white/90 border border-gray-200 rounded-full px-3 py-1 shadow-sm">
                <Lock className="w-3.5 h-3.5 text-orange-500" />
                Desbloqueie a solução no relatório completo
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function DiagnosticPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const stateScan = (location.state as { scan?: ScanResult } | null)?.scan ?? null;
  const [scan, setScan] = useState<ScanResult | null>(stateScan);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form de compra
  const [email, setEmail] = useState('');
  const [registrar, setRegistrar] = useState('');
  const [checkingOut, setCheckingOut] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  // Se a página foi aberta direto (sem state) com ?domain=, re-escaneia.
  useEffect(() => {
    if (scan) return;
    const params = new URLSearchParams(location.search);
    const domain = params.get('domain');
    if (!domain) return;
    setLoading(true);
    scanDomain(domain)
      .then(setScan)
      .catch((e) => setError(e instanceof Error ? e.message : 'Erro ao escanear.'))
      .finally(() => setLoading(false));
  }, [scan, location.search]);

  const score = useMemo(() => (scan ? deliverabilityScore(scan) : 0), [scan]);
  const issueCount = useMemo(() => {
    if (!scan) return 0;
    return [scan.spf, scan.dkim, scan.dmarc].filter((p) => p.status !== 'pass').length;
  }, [scan]);
  const healthy = scan?.overallStatus === 'healthy';

  const scoreColor = score >= 80 ? '#27D07C' : score >= 50 ? '#E6A100' : '#FF3B3B';

  async function handleBuy() {
    if (!scan || !email || checkingOut) return;
    setCheckingOut(true);
    setCheckoutError(null);
    try {
      const { url } = await createCheckout({
        domain: scan.domain,
        email,
        registrar: registrar || undefined,
        scanResult: scan,
      });
      window.location.href = url; // redireciona para o Stripe
    } catch (e) {
      setCheckoutError(e instanceof Error ? e.message : 'Erro ao iniciar o pagamento.');
      setCheckingOut(false);
    }
  }

  // Estados de borda
  if (loading) {
    return (
      <Shell>
        <div className="flex flex-col items-center justify-center py-32 text-textsecondary">
          <Loader2 className="w-8 h-8 animate-spin mb-4 text-orange-500" />
          Escaneando seu domínio...
        </div>
      </Shell>
    );
  }

  if (!scan) {
    return (
      <Shell>
        <div className="text-center py-32">
          <p className="text-textsecondary mb-6">{error ?? 'Nenhum diagnóstico encontrado.'}</p>
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-2 h-12 px-6 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl"
          >
            <ArrowLeft className="w-4 h-4" /> Escanear um domínio
          </button>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <button
        onClick={() => navigate('/')}
        className="inline-flex items-center gap-2 text-sm text-textsecondary hover:text-textprimary mb-8"
      >
        <ArrowLeft className="w-4 h-4" /> Escanear outro domínio
      </button>

      {/* Cabeçalho + Score */}
      <div className="bg-white rounded-[28px] card-shadow card-border p-8 mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center gap-8">
          {/* Score */}
          <div className="flex-shrink-0 text-center">
            <div
              className="w-32 h-32 rounded-full flex items-center justify-center mx-auto"
              style={{ background: `conic-gradient(${scoreColor} ${score * 3.6}deg, #EEF0EE 0deg)` }}
            >
              <div className="w-24 h-24 rounded-full bg-white flex flex-col items-center justify-center">
                <span className="font-display font-bold text-3xl leading-none" style={{ color: scoreColor }}>
                  {score}
                </span>
                <span className="text-xs text-textsecondary">/ 100</span>
              </div>
            </div>
          </div>

          {/* Resumo */}
          <div className="flex-1 text-center sm:text-left">
            <p className="font-mono text-xs uppercase tracking-wider text-textsecondary mb-1">
              Diagnóstico de {scan.domain}
            </p>
            {healthy ? (
              <>
                <h1 className="font-display font-bold text-display-2 text-textprimary mb-2 flex items-center gap-2 justify-center sm:justify-start">
                  <ShieldCheck className="w-7 h-7 text-[#27D07C]" /> Está tudo certo!
                </h1>
                <p className="text-textsecondary">
                  A autenticação do seu domínio está corretamente configurada. Seus e-mails têm tudo
                  para chegar na caixa de entrada. Não há nada a corrigir.
                </p>
              </>
            ) : (
              <>
                <h1 className="font-display font-bold text-display-2 text-textprimary mb-2">
                  Você tem {issueCount === 1 ? '1 problema' : `${issueCount} problemas`} travando a
                  entrega dos seus e-mails
                </h1>
                <p className="text-textsecondary">
                  Provedor detectado: <strong className="text-textprimary">
                    {scan.detectedProvider.provider === 'unknown' ? 'não identificado' : scan.detectedProvider.provider}
                  </strong>. Enquanto isso não é corrigido, seus e-mails estão caindo no spam — ou seja,
                  vendas e leads perdidos. Veja exatamente como resolver no relatório completo, com a
                  configuração pronta para copiar e colar.
                </p>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Protocolos */}
      <div className="grid gap-4 mb-8">
        <ProtocolRow protocol="spf" result={scan.spf} />
        <ProtocolRow protocol="dkim" result={scan.dkim} />
        <ProtocolRow protocol="dmarc" result={scan.dmarc} />
      </div>

      {/* CTA de compra — só quando há problemas */}
      {!healthy && (
        <div className="bg-white rounded-[28px] card-shadow card-border p-8">
          <h2 className="font-display font-bold text-xl text-textprimary mb-2">
            Desbloqueie o relatório completo
          </h2>
          <p className="text-textsecondary mb-6">
            A configuração de e-mail do seu domínio corrigida e pronta + instruções passo a passo
            para o seu registrador. Enviamos por e-mail e liberamos a página do relatório na hora.
          </p>

          {/* Preço com promoção de lançamento */}
          <div className="inline-flex items-center gap-3 mb-6 px-4 py-3 rounded-2xl bg-orange-50 border border-orange-100">
            <span className="font-mono text-xs uppercase tracking-wider text-orange-600 font-semibold">
              Oferta de lançamento
            </span>
            <span className="line-through text-textsecondary text-lg">R$ 99</span>
            <span className="font-display font-bold text-3xl text-orange-500 leading-none">R$ 49</span>
            <span className="text-xs text-textsecondary">pagamento único, sem mensalidade</span>
          </div>

          <div className="grid sm:grid-cols-2 gap-3 mb-4">
            <input
              type="email"
              placeholder="seu@email.com.br"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-12 px-4 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
            />
            <select
              value={registrar}
              onChange={(e) => setRegistrar(e.target.value)}
              className="h-12 px-4 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
            >
              <option value="">Onde fica seu domínio? (opcional)</option>
              {REGISTRARS.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>

          {checkoutError && <p className="text-sm text-[#FF3B3B] mb-3">{checkoutError}</p>}

          <button
            onClick={handleBuy}
            disabled={!email || checkingOut}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 h-14 px-8 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl transition-all hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0"
          >
            {checkingOut ? (
              <><Loader2 className="w-5 h-5 animate-spin" /> Redirecionando...</>
            ) : (
              <span className="flex items-center gap-2">
                Desbloquear relatório —
                <span className="line-through opacity-70">R$ 99</span>
                <strong className="font-bold">R$ 49</strong>
              </span>
            )}
          </button>
          <p className="text-xs text-textsecondary mt-3">
            Pagamento seguro via Stripe. Se não identificarmos correções aplicáveis, devolvemos seu dinheiro.
          </p>
        </div>
      )}
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F6F7F6' }}>
      <div className="absolute inset-0 dot-grid opacity-40 pointer-events-none" />
      <div className="relative max-w-3xl mx-auto px-4 sm:px-6 py-12 sm:py-16">{children}</div>
    </div>
  );
}
