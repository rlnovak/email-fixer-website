import { useRef, useLayoutEffect } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Check, Shield, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';

gsap.registerPlugin(ScrollTrigger);

export default function Pricing() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const section = sectionRef.current;
    const header = headerRef.current;
    const card = cardRef.current;

    if (!section || !header || !card) return;

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

      // Card animation
      gsap.fromTo(card,
        { y: 28, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.6,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: card,
            start: 'top 75%',
            toggleActions: 'play none none reverse',
          }
        }
      );

      // Bullets stagger
      const bullets = card.querySelectorAll('.bullet-item');
      gsap.fromTo(bullets,
        { x: -10, opacity: 0 },
        {
          x: 0,
          opacity: 1,
          duration: 0.4,
          stagger: 0.06,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: card,
            start: 'top 70%',
            toggleActions: 'play none none reverse',
          }
        }
      );

    }, section);

    return () => ctx.revert();
  }, []);

  const features = [
    'Registros SPF, DKIM, DMARC prontos',
    'Verificação em mais de 50 blacklists',
    'Instruções para sua plataforma de DNS',
    'Reverificações ilimitadas',
    'Suporte por e-mail',
    'Garantia de 7 dias',
  ];

  return (
    <section
      ref={sectionRef}
      id="pricing"
      className="relative py-20 sm:py-28"
      style={{ backgroundColor: '#F6F7F6' }}
    >
      {/* Dot grid background */}
      <div className="absolute inset-0 dot-grid opacity-50" />

      <div className="relative max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div ref={headerRef} className="text-center mb-12">
          <h2 className="font-display font-bold text-display-2 text-textprimary mb-4">
            Preço simples
          </h2>
          <p className="text-lg text-textsecondary">
            Sem assinatura. Pague uma vez, use para sempre.
          </p>
        </div>

        {/* Pricing Card */}
        <div
          ref={cardRef}
          className="bg-white rounded-[28px] card-shadow card-border p-8 sm:p-12"
        >
          {/* Title */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-orange-50 border border-orange-100 rounded-full mb-4">
              <Shield className="w-4 h-4 text-orange-500" />
              <span className="font-mono text-xs uppercase tracking-wider text-orange-600 font-medium">
                Relatório completo
              </span>
            </div>
            <h3 className="font-display font-bold text-2xl text-textprimary mb-2">
              Relatório completo de entregabilidade
            </h3>
          </div>

          {/* Price */}
          <div className="text-center mb-8">
            <div className="flex items-baseline justify-center gap-1">
              <span className="font-display font-bold text-6xl text-textprimary">
                R$ 97
              </span>
            </div>
            <p className="text-textsecondary mt-2">Pagamento único · Sem mensalidade</p>
          </div>

          {/* Features */}
          <div className="space-y-4 mb-10">
            {features.map((feature, index) => (
              <div key={index} className="bullet-item flex items-center gap-3">
                <div className="w-6 h-6 bg-green-50 rounded-full flex items-center justify-center flex-shrink-0">
                  <Check className="w-4 h-4 text-green-500" />
                </div>
                <span className="text-textprimary">{feature}</span>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div className="text-center">
            <Button
              className="w-full sm:w-auto h-14 px-10 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl transition-all hover:-translate-y-0.5"
            >
              Verificar meu domínio
            </Button>
            <div className="flex items-center justify-center gap-2 mt-4 text-sm text-textsecondary">
              <Lock className="w-4 h-4" />
              <span>Pagamento seguro · 7 dias de garantia</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
