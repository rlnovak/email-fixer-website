import { useRef, useLayoutEffect, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { FileCode, ExternalLink, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';

gsap.registerPlugin(ScrollTrigger);

export default function FixKit() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const blocksRef = useRef<HTMLDivElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);
  const [captureEmail, setCaptureEmail] = useState('');
  const [captureRegistrar, setCaptureRegistrar] = useState('');

  useLayoutEffect(() => {
    const section = sectionRef.current;
    const card = cardRef.current;
    const blocks = blocksRef.current;
    const cta = ctaRef.current;

    if (!section || !card || !blocks || !cta) return;

    const ctx = gsap.context(() => {
      // Reveal simples ao rolar até a seção (sem pin, sem exit)
      gsap.fromTo(card,
        { y: 24, opacity: 0 },
        {
          y: 0, opacity: 1, duration: 0.6, ease: 'power2.out',
          scrollTrigger: { trigger: card, start: 'top 85%', toggleActions: 'play none none none' },
        }
      );

      const codeBlocks = blocks.querySelectorAll('.code-block');
      gsap.fromTo(codeBlocks,
        { y: 18, opacity: 0 },
        {
          y: 0, opacity: 1, duration: 0.5, stagger: 0.10, ease: 'power2.out',
          scrollTrigger: { trigger: blocks, start: 'top 85%', toggleActions: 'play none none none' },
        }
      );

      gsap.fromTo(cta,
        { y: 16, opacity: 0 },
        {
          y: 0, opacity: 1, duration: 0.5, ease: 'power2.out',
          scrollTrigger: { trigger: cta, start: 'top 90%', toggleActions: 'play none none none' },
        }
      );
    }, section);

    return () => ctx.revert();
  }, []);

  const dnsRecords = [
    {
      label: 'Autorização de envio',
      value: 'v=spf1 include:_spf.google.com include:sendgrid.net ~all',
      description: 'Autoriza os servidores certos a enviar em nome do seu domínio',
    },
    {
      label: 'Assinatura dos e-mails',
      value: 'v=DKIM1; k=rsa; p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQC...',
      description: 'Prova que o e-mail saiu mesmo do seu domínio',
    },
    {
      label: 'Proteção contra fraude',
      value: 'v=DMARC1; p=quarantine; rua=mailto:dmarc@seuempresa.com.br',
      description: 'Define a regra quando um e-mail falha na verificação',
    },
  ];

  return (
    <section
      ref={sectionRef}
      className="relative w-full flex items-center justify-center py-20 sm:py-28"
      style={{ backgroundColor: '#F6F7F6' }}
    >
      {/* Dot grid background */}
      <div className="absolute inset-0 dot-grid opacity-50" />

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
                <span className="flex items-center gap-1.5 text-sm text-textsecondary">
                  <Lock className="w-4 h-4 text-orange-500" />
                  Bloqueado
                </span>
              </div>
              <div className="relative p-4 bg-[#15171A] rounded-xl overflow-hidden border border-black/5">
                <code
                  className="font-mono text-sm text-green-400 whitespace-nowrap select-none"
                  style={{ filter: 'blur(6px)', userSelect: 'none', pointerEvents: 'none' }}
                  aria-hidden="true"
                >
                  {record.value}
                </code>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-white bg-white/10 border border-white/20 rounded-full px-3 py-1 backdrop-blur-sm">
                    <Lock className="w-3.5 h-3.5 text-orange-400" />
                    Liberado no relatório completo
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Capture form */}
        <div ref={ctaRef} className="bg-gray-50 rounded-2xl p-5 sm:p-6 mb-6">
          <p className="font-display font-semibold text-textprimary text-sm mb-4">
            Informe onde enviar o relatório completo:
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="email"
              placeholder="seu@email.com.br"
              value={captureEmail}
              onChange={(e) => setCaptureEmail(e.target.value)}
              className="flex-1 h-11 px-4 rounded-xl border border-gray-200 bg-white text-sm text-textprimary placeholder:text-textsecondary focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20"
            />
            <select
              value={captureRegistrar}
              onChange={(e) => setCaptureRegistrar(e.target.value)}
              className="h-11 px-4 rounded-xl border border-gray-200 bg-white text-sm text-textprimary focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20 sm:w-52"
            >
              <option value="">Onde fica seu domínio?</option>
              <option value="registro_br">Registro.br</option>
              <option value="locaweb">Locaweb</option>
              <option value="kinghost">KingHost</option>
              <option value="uolhost">UOLHost</option>
              <option value="hostgator_br">HostGator Brasil</option>
              <option value="cloudflare">Cloudflare</option>
              <option value="godaddy">GoDaddy</option>
              <option value="outro">Outro</option>
            </select>
          </div>
        </div>

        {/* CTA */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button
            className="h-14 px-8 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl transition-all hover:-translate-y-0.5"
          >
            <span className="flex items-center gap-2">
              Corrigir meu domínio —
              <span className="line-through opacity-70">R$ 99</span>
              <strong className="font-bold">R$ 49</strong>
            </span>
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
