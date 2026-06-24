import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Copy, Check, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { fetchReport, type ReportResponse, type ProtocolFix } from '../lib/api';

function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div>
      <span className="block text-xs font-mono uppercase tracking-wider text-textsecondary mb-1.5">{label}</span>
      <div className="relative">
        <pre className="bg-[#15171A] text-green-300 text-sm rounded-xl p-4 pr-14 overflow-x-auto font-mono whitespace-pre-wrap break-all">
          {value}
        </pre>
        <button
          onClick={copy}
          aria-label={`Copiar ${label}`}
          className="absolute top-2.5 right-2.5 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs transition-colors"
        >
          {copied ? <><Check className="w-3.5 h-3.5" /> Copiado</> : <><Copy className="w-3.5 h-3.5" /> Copiar</>}
        </button>
      </div>
    </div>
  );
}

function FixCard({ fix }: { fix: ProtocolFix }) {
  const isNone = fix.action === 'none';
  return (
    <div className="bg-white rounded-[24px] card-shadow card-border p-6 sm:p-8">
      <div className="flex items-center gap-3 mb-4">
        <span className="font-display font-bold text-lg text-textprimary">{fix.protocol}</span>
        <span className="text-xs font-mono uppercase tracking-wider px-2 py-0.5 rounded-full bg-orange-50 text-orange-600">
          {fix.action === 'add' ? 'Adicionar' : fix.action === 'replace' ? 'Substituir' : 'Sem ação'}
        </span>
      </div>

      <p className="text-sm text-textsecondary leading-relaxed mb-5">{fix.explanation}</p>

      {!isNone && (
        <div className="grid gap-4 mb-6">
          <CopyField label="Nome / Host" value={fix.record.name} />
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="block text-xs font-mono uppercase tracking-wider text-textsecondary mb-1.5">Tipo</span>
              <div className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm font-mono text-textprimary">
                {fix.record.type}
              </div>
            </div>
            {fix.record.ttl && (
              <div>
                <span className="block text-xs font-mono uppercase tracking-wider text-textsecondary mb-1.5">TTL</span>
                <div className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm font-mono text-textprimary">
                  {fix.record.ttl}
                </div>
              </div>
            )}
          </div>
          {fix.record.value && <CopyField label="Valor / Conteúdo" value={fix.record.value} />}
        </div>
      )}

      {/* Instruções passo a passo */}
      <details className="group">
        <summary className="cursor-pointer text-sm font-medium text-orange-600 hover:text-orange-700 select-none">
          Ver instruções passo a passo
        </summary>
        <ol className="mt-4 space-y-2">
          {fix.instructions.map((step, i) => (
            <li key={i} className="text-sm text-textsecondary leading-relaxed whitespace-pre-line">
              {step}
            </li>
          ))}
        </ol>
      </details>
    </div>
  );
}

export default function ReportPage() {
  const [params] = useSearchParams();
  const orderId = params.get('order');

  const [report, setReport] = useState<ReportResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orderId) {
      setError('Pedido não informado no link.');
      setLoading(false);
      return;
    }
    fetchReport(orderId)
      .then(setReport)
      .catch((e) => setError(e instanceof Error ? e.message : 'Erro ao carregar o relatório.'))
      .finally(() => setLoading(false));
  }, [orderId]);

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F6F7F6' }}>
      <div className="absolute inset-0 dot-grid opacity-40 pointer-events-none" />
      <div className="relative max-w-3xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        {loading && (
          <div className="flex flex-col items-center justify-center py-32 text-textsecondary">
            <Loader2 className="w-8 h-8 animate-spin mb-4 text-orange-500" />
            Carregando seu relatório...
          </div>
        )}

        {!loading && error && (
          <div className="bg-white rounded-[28px] card-shadow card-border p-10 text-center">
            <AlertCircle className="w-10 h-10 text-[#FF3B3B] mx-auto mb-4" />
            <h1 className="font-display font-bold text-xl text-textprimary mb-2">Não foi possível abrir o relatório</h1>
            <p className="text-textsecondary mb-2">{error}</p>
            <p className="text-sm text-textsecondary">
              Em caso de dúvida, escreva para{' '}
              <a href="mailto:suporte@emailcorreto.com.br" className="text-orange-600">suporte@emailcorreto.com.br</a>.
            </p>
          </div>
        )}

        {!loading && report && (
          <>
            <div className="flex items-center gap-2 mb-2 text-[#27D07C]">
              <CheckCircle2 className="w-5 h-5" />
              <span className="font-mono text-xs uppercase tracking-wider font-medium">Relatório liberado</span>
            </div>
            <h1 className="font-display font-bold text-display-2 text-textprimary mb-2">
              Correções para {report.domain}
            </h1>
            <p className="text-textsecondary mb-8">{report.fix.summary}</p>
            <p className="text-sm text-textsecondary mb-8 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
              Provedor de e-mail detectado: <strong className="text-textprimary">{report.fix.emailProviderLabel}</strong>.
              Copie cada registro abaixo e cole no painel do seu registrador. As alterações de DNS podem levar
              algumas horas para propagar.
            </p>

            <div className="grid gap-5">
              {report.fix.fixes.map((fix) => (
                <FixCard key={fix.protocol} fix={fix} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
