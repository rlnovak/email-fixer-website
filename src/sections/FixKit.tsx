import { useRef, useLayoutEffect, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Copy, Check, FileCode, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

gsap.registerPlugin(ScrollTrigger);

export default function FixKit() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const blocksRef = useRef<HTMLDivElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState<string | null>(null);

  useLayoutEffect(() => {
    const section = sectionRef.current;
    const card = cardRef.current;
    const blocks = blocksRef.current;
    const cta = ctaRef.current;

    if (!section || !card || !blocks || !cta) return;

    const ctx = gsap.context(() => {
      const scrollTl = gsap.timeline({
        scrollTrigger: {
          trigger: section,
          start: 'top top',
          end: '+=130%',
          pin: true,
          scrub: 0.6,
        }
      });

      // ENTRANCE (0%-30%)
      scrollTl.fromTo(card,
        { y: '26vh', scale: 0.96, opacity: 0 },
        { y: 0, scale: 1, opacity: 1, ease: 'none' },
        0
      );

      // Code blocks
      const codeBlocks = blocks.querySelectorAll('.code-block');
      scrollTl.fromTo(codeBlocks,
        { x: -30, opacity: 0 },
        { x: 0, opacity: 1, stagger: 0.10, ease: 'none' },
        0.12
      );

      // CTA
      scrollTl.fromTo(cta,
        { y: 16, scale: 0.98, opacity: 0 },
        { y: 0, scale: 1, opacity: 1, ease: 'none' },
        0.18
      );

      // SETTLE (30%-70%) - hold position

      // EXIT (70%-100%)
      scrollTl.fromTo(card,
        { y: 0, opacity: 1 },
        { y: '-30vh', opacity: 0, ease: 'power2.in' },
        0.7
      );

    }, section);

    return () => ctx.revert();
  }, []);

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  };

  const dnsRecords = [
    {
      label: 'SPF',
      value: 'v=spf1 include:_spf.google.com include:sendgrid.net ~all',
      description: 'Autoriza Google e SendGrid a enviar e-mails',
    },
    {
      label: 'DKIM',
      value: 'v=DKIM1; k=rsa; p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQC...',
      description: 'Chave pública para verificação de assinatura',
    },
    {
      label: 'DMARC',
      value: 'v=DMARC1; p=quarantine; rua=mailto:dmarc@seuempresa.com.br',
      description: 'Política de tratamento para falhas de autenticação',
    },
  ];

  return (
    <section
      ref={sectionRef}
      className="relative w-screen h-screen flex items-center justify-center overflow-hidden z-[106]"
      style={{ backgroundColor: '#0B0D0C' }}
    >
      {/* Subtle pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0 dot-grid" style={{ filter: 'invert(1)' }} />
      </div>

      {/* Fix Kit Card */}
      <div
        ref={cardRef}
        className="relative w-[min(980px,88vw)] bg-white rounded-[28px] card-shadow p-6 sm:p-10"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-orange-50 border border-orange-100 rounded-full mb-4">
            <FileCode className="w-4 h-4 text-orange-500" />
            <span className="font-mono text-xs uppercase tracking-wider text-orange-600 font-medium">
              Solução completa
            </span>
          </div>
          <h2 className="font-display font-bold text-display-2 text-textprimary mb-2">
            Kit de correção de DNS
          </h2>
          <p className="text-textsecondary">
            Registros prontos para copiar e colar.
          </p>
        </div>

        {/* Code blocks */}
        <div ref={blocksRef} className="space-y-4 mb-8">
          {dnsRecords.map((record) => (
            <div key={record.label} className="code-block">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs uppercase tracking-wider text-textsecondary">
                    {record.label}
                  </span>
                  <span className="text-xs text-textsecondary">—</span>
                  <span className="text-xs text-textsecondary">{record.description}</span>
                </div>
                <button
                  onClick={() => handleCopy(record.value, record.label)}
                  className="flex items-center gap-1.5 text-sm text-orange-500 hover:text-orange-600 transition-colors"
                >
                  {copied === record.label ? (
                    <>
                      <Check className="w-4 h-4" />
                      Copiado!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      Copiar
                    </>
                  )}
                </button>
              </div>
              <div className="p-4 bg-gray-900 rounded-xl overflow-x-auto">
                <code className="font-mono text-sm text-green-400 whitespace-nowrap">
                  {record.value}
                </code>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div ref={ctaRef} className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button
            className="h-14 px-8 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl transition-all hover:-translate-y-0.5"
          >
            Comprar o relatório completo — R$ 97
          </Button>
          <button className="flex items-center gap-2 text-textsecondary hover:text-textprimary font-medium transition-colors group">
            Ver exemplo de relatório
            <ExternalLink className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>
      </div>
    </section>
  );
}
