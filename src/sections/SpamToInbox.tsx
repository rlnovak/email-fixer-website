import { useRef, useLayoutEffect } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { X, Check, ArrowRight } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

export default function SpamToInbox() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const section = sectionRef.current;
    const header = headerRef.current;
    const cards = cardsRef.current;

    if (!section || !header || !cards) return;

    const ctx = gsap.context(() => {
      // Header animation
      gsap.fromTo(header,
        { y: 20, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.6,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: header,
            start: 'top 80%',
            toggleActions: 'play none none none',
          }
        }
      );

      // Cards animation
      const cardElements = cards.querySelectorAll('.compare-card');
      gsap.fromTo(cardElements,
        { y: 30, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.6,
          stagger: 0.15,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: cards,
            start: 'top 75%',
            toggleActions: 'play none none none',
          }
        }
      );

      // Arrow pop
      const arrow = cards.querySelector('.compare-arrow');
      if (arrow) {
        gsap.fromTo(arrow,
          { scale: 0.6, opacity: 0 },
          {
            scale: 1,
            opacity: 1,
            duration: 0.4,
            ease: 'back.out(1.7)',
            scrollTrigger: {
              trigger: cards,
              start: 'top 70%',
              toggleActions: 'play none none none',
            }
          }
        );
      }

    }, section);

    return () => ctx.revert();
  }, []);

  const beforeItems = [
    'Autorização de envio errada — servidores não autorizados',
    'Assinatura dos e-mails ausente — nada prova que o envio é seu',
    'Proteção contra fraude não encontrada — domínio exposto',
    'E-mails caindo direto no spam do Gmail e do Outlook',
    'Clientes respondendo "não recebi seu orçamento"',
    'Reputação do domínio em queda',
  ];

  const afterItems = [
    'Autorização de envio correta — só seus servidores enviam',
    'Assinatura dos e-mails ativa — cada envio verificado',
    'Proteção contra fraude configurada — domínio protegido',
    'E-mails chegando na caixa de entrada principal',
    'Orçamentos e propostas sendo lidos no mesmo dia',
    'Reputação do domínio recuperada e estável',
  ];

  return (
    <section
      ref={sectionRef}
      id="spam-to-inbox"
      className="relative py-20 sm:py-28"
      style={{ backgroundColor: '#F6F7F6' }}
    >
      {/* Dot grid background */}
      <div className="absolute inset-0 dot-grid opacity-50" />

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div ref={headerRef} className="text-center mb-16">
          <h2 className="font-display font-bold text-display-2 text-textprimary mb-4">
            De spam para caixa de entrada
          </h2>
          <p className="text-lg text-textsecondary max-w-2xl mx-auto">
            Mesmo domínio. Diferença de cinco minutos de configuração.
          </p>
        </div>

        {/* Comparison */}
        <div ref={cardsRef} className="relative grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
          {/* ANTES */}
          <div className="compare-card bg-red-50 border border-red-100 rounded-[28px] card-shadow p-8">
            <div className="flex items-center justify-between mb-6">
              <span className="inline-flex items-center px-3 py-1 rounded-full bg-red-500/10 font-mono text-xs uppercase tracking-wider text-[#FF3B3B] font-semibold">
                Antes
              </span>
            </div>
            <div className="mb-6">
              <p className="font-display font-bold text-5xl text-[#FF3B3B] leading-none">
                15<span className="text-2xl text-[#FF3B3B]/60">/100</span>
              </p>
              <p className="text-sm font-medium text-[#FF3B3B] mt-2">
                Entregabilidade crítica
              </p>
            </div>
            <ul className="space-y-3">
              {beforeItems.map((item, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="w-5 h-5 rounded-full bg-red-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <X className="w-3 h-3 text-[#FF3B3B]" />
                  </span>
                  <span className="text-sm text-textprimary leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* DEPOIS */}
          <div className="compare-card bg-green-50 border border-green-100 rounded-[28px] card-shadow p-8">
            <div className="flex items-center justify-between mb-6">
              <span className="inline-flex items-center px-3 py-1 rounded-full bg-green-500/10 font-mono text-xs uppercase tracking-wider text-[#27D07C] font-semibold">
                Depois
              </span>
            </div>
            <div className="mb-6">
              <p className="font-display font-bold text-5xl text-[#27D07C] leading-none">
                98<span className="text-2xl text-[#27D07C]/60">/100</span>
              </p>
              <p className="text-sm font-medium text-[#27D07C] mt-2">
                Entregabilidade excelente
              </p>
            </div>
            <ul className="space-y-3">
              {afterItems.map((item, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="w-5 h-5 rounded-full bg-green-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check className="w-3 h-3 text-[#27D07C]" />
                  </span>
                  <span className="text-sm text-textprimary leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Arrow between columns (desktop only) */}
          <div className="compare-arrow hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 w-14 h-14 rounded-full bg-orange-500 items-center justify-center shadow-lg">
            <ArrowRight className="w-6 h-6 text-white" />
          </div>
        </div>
      </div>
    </section>
  );
}
