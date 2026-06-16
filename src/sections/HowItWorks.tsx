import { useRef, useLayoutEffect } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Search, ShoppingCart, RefreshCw } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

export default function HowItWorks() {
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
            toggleActions: 'play none none reverse',
          }
        }
      );

      // Cards animation
      const cardElements = cards.querySelectorAll('.step-card');
      gsap.fromTo(cardElements,
        { y: 30, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.6,
          stagger: 0.12,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: cards,
            start: 'top 75%',
            toggleActions: 'play none none reverse',
          }
        }
      );

      // Number badges
      const badges = cards.querySelectorAll('.number-badge');
      gsap.fromTo(badges,
        { scale: 0.9, opacity: 0 },
        {
          scale: 1,
          opacity: 1,
          duration: 0.4,
          stagger: 0.12,
          ease: 'back.out(1.7)',
          scrollTrigger: {
            trigger: cards,
            start: 'top 70%',
            toggleActions: 'play none none reverse',
          }
        }
      );

    }, section);

    return () => ctx.revert();
  }, []);

  const steps = [
    {
      number: '1',
      icon: Search,
      title: 'Verificação grátis',
      description: 'Digite seu domínio e receba o diagnóstico completo de SPF, DKIM e DMARC em 10 segundos. Sem cadastro, sem cartão.',
      color: 'bg-blue-50',
      iconColor: 'text-blue-500',
    },
    {
      number: '2',
      icon: ShoppingCart,
      title: 'Compre o kit de correção — R$ 99',
      description: 'Pagamento único. Você recebe os registros DNS prontos pra copiar e colar, com instruções específicas pro seu registrador: Registro.br, Locaweb, KingHost, HostGator e outros.',
      color: 'bg-orange-50',
      iconColor: 'text-orange-500',
    },
    {
      number: '3',
      icon: RefreshCw,
      title: 'Reverifique quantas vezes quiser',
      description: 'Aplicou os registros? Reverifique de graça, quantas vezes precisar, pra sempre. Acesso vitalício, sem cobrança extra.',
      color: 'bg-green-50',
      iconColor: 'text-green-500',
    },
  ];

  return (
    <section
      ref={sectionRef}
      id="how-it-works"
      className="relative py-20 sm:py-28"
      style={{ backgroundColor: '#F6F7F6' }}
    >
      {/* Dot grid background */}
      <div className="absolute inset-0 dot-grid opacity-50" />

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div ref={headerRef} className="text-center mb-16">
          <h2 className="font-display font-bold text-display-2 text-textprimary mb-4">
            Três passos pra parar de cair no spam
          </h2>
          <p className="text-lg text-textsecondary max-w-2xl mx-auto">
            Você vê o problema antes de pagar. Depois é copiar, colar e reverificar.
          </p>
        </div>

        {/* Credibility stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-12">
          {[
            { stat: '5 min', label: 'tempo médio pra aplicar a correção' },
            { stat: 'Vitalício', label: 'reverificação ilimitada, sem mensalidade' },
            { stat: '100%', label: 'dos registros prontos pra copiar e colar' },
          ].map((item, i) => (
            <div key={i} className="bg-white rounded-2xl card-border p-5 text-center">
              <p className="font-display font-bold text-xl text-orange-500 mb-1">{item.stat}</p>
              <p className="text-sm text-textsecondary">{item.label}</p>
            </div>
          ))}
        </div>

        {/* Step cards */}
        <div ref={cardsRef} className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {steps.map((step) => (
            <div
              key={step.number}
              className="step-card relative bg-white rounded-[28px] card-shadow card-border p-8"
            >
              {/* Number badge */}
              <div className="number-badge absolute -top-4 -left-2 w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center shadow-lg">
                <span className="font-display font-bold text-white">{step.number}</span>
              </div>

              {/* Icon */}
              <div className={`w-14 h-14 ${step.color} rounded-2xl flex items-center justify-center mb-6 mt-2`}>
                <step.icon className={`w-7 h-7 ${step.iconColor}`} />
              </div>

              {/* Content */}
              <h3 className="font-display font-bold text-xl text-textprimary mb-3">
                {step.title}
              </h3>
              <p className="text-textsecondary leading-relaxed">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
