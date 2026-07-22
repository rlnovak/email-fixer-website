import { useRef, useLayoutEffect, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { X, Check, ArrowRight, Info, Inbox, AlertTriangle, Ban } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

type BreakdownItem = {
  label: string;
  percentage: number;
  icon: typeof Inbox;
  fillClass: string;
};

const mariaBreakdown: BreakdownItem[] = [
  { label: 'Caixa de entrada', percentage: 12, icon: Inbox, fillClass: 'bg-[#FF3B3B]' },
  { label: 'Spam', percentage: 58, icon: AlertTriangle, fillClass: 'bg-[#FF3B3B]/50' },
  { label: 'Bloqueado ou rejeitado', percentage: 30, icon: Ban, fillClass: 'bg-gray-400' },
];

const joaoBreakdown: BreakdownItem[] = [
  { label: 'Caixa de entrada', percentage: 96, icon: Inbox, fillClass: 'bg-[#27D07C]' },
  { label: 'Spam', percentage: 3, icon: AlertTriangle, fillClass: 'bg-[#27D07C]/40' },
  { label: 'Bloqueado ou rejeitado', percentage: 1, icon: Ban, fillClass: 'bg-gray-400' },
];

export default function DeliverySimulation() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<HTMLDivElement>(null);
  const microcopyRef = useRef<HTMLDivElement>(null);

  const [inboxMaria, setInboxMaria] = useState(0);
  const [inboxJoao, setInboxJoao] = useState(0);

  useLayoutEffect(() => {
    const section = sectionRef.current;
    const header = headerRef.current;
    const cards = cardsRef.current;
    const microcopy = microcopyRef.current;

    if (!section || !header || !cards || !microcopy) return;

    const ctx = gsap.context(() => {
      // Header
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
          },
        }
      );

      // Cards reveal + contadores no onEnter
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
            onEnter: () => {
              gsap.to({ v: 0 }, {
                v: 12, duration: 0.9, ease: 'power2.out',
                onUpdate: function () { setInboxMaria(Math.round(this.targets()[0].v)); },
              });
              gsap.to({ v: 0 }, {
                v: 96, duration: 1.1, ease: 'power2.out',
                onUpdate: function () { setInboxJoao(Math.round(this.targets()[0].v)); },
              });
            },
          },
        }
      );

      // Seta laranja central (desktop)
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
            },
          }
        );
      }

      // Barras de breakdown
      const barFills = cards.querySelectorAll('.bar-fill');
      gsap.fromTo(barFills,
        { scaleX: 0 },
        {
          scaleX: 1, duration: 0.6, stagger: 0.08, ease: 'power2.out', transformOrigin: 'left',
          scrollTrigger: {
            trigger: cards,
            start: 'top 75%',
            toggleActions: 'play none none none',
          },
        }
      );

      // Microcopy laranja
      gsap.fromTo(microcopy,
        { y: 20, opacity: 0 },
        {
          y: 0, opacity: 1, duration: 0.6, ease: 'power2.out',
          scrollTrigger: {
            trigger: microcopy,
            start: 'top 85%',
            toggleActions: 'play none none none',
          },
        }
      );
    }, section);

    return () => ctx.revert();
  }, []);

  const renderBreakdown = (items: BreakdownItem[]) => (
    <div className="space-y-4">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <div key={item.label} className="bar-container">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Icon className="w-4 h-4 text-textsecondary flex-shrink-0" />
                <span className="text-sm text-textprimary">{item.label}</span>
              </div>
              <span className="font-mono text-sm text-textsecondary">{item.percentage}%</span>
            </div>
            <div className="h-3 bg-white/70 rounded-full overflow-hidden">
              <div
                className={`bar-fill h-full ${item.fillClass} rounded-full`}
                style={{ transform: 'scaleX(0)', transformOrigin: 'left', width: `${item.percentage}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <section
      ref={sectionRef}
      id="delivery-simulation"
      className="relative py-20 sm:py-28"
      style={{ backgroundColor: '#F6F7F6' }}
    >
      {/* Dot grid background */}
      <div className="absolute inset-0 dot-grid opacity-50" />

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div ref={headerRef} className="text-center mb-16">
          <h2 className="font-display font-bold text-display-2 text-textprimary mb-4">
            De cada 100 e-mails, quantos chegam de verdade?
          </h2>
          <p className="text-lg text-textsecondary max-w-2xl mx-auto">
            Mesmo público, mesma oferta, mesmo texto. A única diferença são os registros DNS do remetente.
          </p>
        </div>

        {/* Comparison */}
        <div ref={cardsRef} className="relative grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
          {/* MARIA */}
          <div className="compare-card bg-red-50 border border-red-100 rounded-[28px] card-shadow p-8">
            <div className="flex items-center justify-between mb-5">
              <span className="inline-flex items-center px-3 py-1 rounded-full bg-red-500/10 font-mono text-xs uppercase tracking-wider text-[#FF3B3B] font-semibold">
                Sem ajustar o DNS
              </span>
              <span className="w-7 h-7 rounded-full bg-red-500/10 flex items-center justify-center flex-shrink-0">
                <X className="w-4 h-4 text-[#FF3B3B]" />
              </span>
            </div>

            <p className="text-sm text-textsecondary leading-relaxed mb-6">
              Maria disparou a campanha sem configurar a autenticação do domínio.
            </p>

            <div className="mb-2">
              <p className="font-display font-bold text-7xl text-[#FF3B3B] leading-none">
                {inboxMaria}<span className="text-4xl text-[#FF3B3B]/60">%</span>
              </p>
              <p className="text-sm font-medium text-[#FF3B3B] mt-2">
                Chegam na caixa de entrada
              </p>
            </div>

            <p className="text-sm font-semibold text-textprimary mt-5 mb-6">
              88 de 100 clientes nunca viram o e-mail dela.
            </p>

            {renderBreakdown(mariaBreakdown)}
          </div>

          {/* JOÃO */}
          <div className="compare-card bg-green-50 border border-green-100 rounded-[28px] card-shadow p-8">
            <div className="flex items-center justify-between mb-5">
              <span className="inline-flex items-center px-3 py-1 rounded-full bg-green-500/10 font-mono text-xs uppercase tracking-wider text-[#27D07C] font-semibold">
                Com o EmailCorreto
              </span>
              <span className="w-7 h-7 rounded-full bg-green-500/10 flex items-center justify-center flex-shrink-0">
                <Check className="w-4 h-4 text-[#27D07C]" />
              </span>
            </div>

            <p className="text-sm text-textsecondary leading-relaxed mb-6">
              João corrigiu a autenticação do domínio antes de disparar a mesma campanha.
            </p>

            <div className="mb-2">
              <p className="font-display font-bold text-7xl text-[#27D07C] leading-none">
                {inboxJoao}<span className="text-4xl text-[#27D07C]/60">%</span>
              </p>
              <p className="text-sm font-medium text-[#27D07C] mt-2">
                Chegam na caixa de entrada
              </p>
            </div>

            <p className="text-sm font-semibold text-textprimary mt-5 mb-6">
              96 de 100 chegam na caixa de entrada de quem importa.
            </p>

            {renderBreakdown(joaoBreakdown)}
          </div>

          {/* Arrow between columns (desktop only) */}
          <div className="compare-arrow hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 w-14 h-14 rounded-full bg-orange-500 items-center justify-center shadow-lg">
            <ArrowRight className="w-6 h-6 text-white" />
          </div>
        </div>

        {/* Microcopy laranja */}
        <div ref={microcopyRef} className="max-w-3xl mx-auto mt-12">
          <div className="flex items-start gap-3 p-4 bg-orange-50 rounded-2xl">
            <Info className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-orange-700">
              Desde fevereiro de 2024, Gmail e Yahoo barram quem não autentica o domínio. Ajustar a autenticação do seu domínio é o que separa <strong>12 de 96</strong>.
            </p>
          </div>
        </div>

        {/* Nota de rodapé */}
        <p className="text-xs text-textsecondary text-center max-w-3xl mx-auto mt-6">
          Estimativa ilustrativa baseada em benchmarks de entregabilidade do setor e nas exigências de autenticação de Gmail/Yahoo (2024). Resultados reais variam por domínio, provedor e histórico de envio.
        </p>
      </div>
    </section>
  );
}
