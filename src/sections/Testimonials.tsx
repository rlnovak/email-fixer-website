import { useRef, useLayoutEffect } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Quote } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

export default function Testimonials() {
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
      const cardElements = cards.querySelectorAll('.testimonial-card');
      gsap.fromTo(cardElements,
        { y: 24, opacity: 0 },
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

    }, section);

    return () => ctx.revert();
  }, []);

  const testimonials = [
    {
      quote: 'Eu mandava orçamento e o cliente jurava que não tinha recebido. Achei que era desculpa. Era o spam. Ajustei os três registros numa tarde e parou.',
      author: 'Marcelo Tavares',
      role: 'dono de marcenaria sob medida',
      company: 'Curitiba',
    },
    {
      quote: 'Uso Google Workspace e nem sabia o que era DKIM. O diagnóstico mostrou tudo mastigado e os valores vieram prontos. Colei no Registro.br e resolveu.',
      author: 'Fernanda Lopes',
      role: 'consultora financeira',
      company: 'São Paulo',
    },
    {
      quote: 'Nossa taxa de abertura dobrou depois que os e-mails pararam de cair no spam. R$ 99 uma vez resolveu um problema que me custava venda todo mês.',
      author: 'Rodrigo Menezes',
      role: 'gestor de e-commerce',
      company: 'Belo Horizonte',
    },
  ];

  return (
    <section
      ref={sectionRef}
      id="testimonials"
      className="relative py-20 sm:py-28"
      style={{ backgroundColor: '#F6F7F6' }}
    >
      {/* Dot grid background */}
      <div className="absolute inset-0 dot-grid opacity-50" />

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div ref={headerRef} className="text-center mb-16">
          <h2 className="font-display font-bold text-display-2 text-textprimary mb-4">
            Quem ajustou parou de perder e-mail
          </h2>
          <p className="text-lg text-textsecondary">
            Depoimentos ilustrativos, baseados em casos comuns de quem usa o EmailCorreto.
          </p>
        </div>

        {/* Testimonial cards */}
        <div ref={cardsRef} className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((testimonial, index) => (
            <div
              key={index}
              className="testimonial-card bg-white rounded-[28px] card-shadow card-border p-8"
            >
              {/* Quote icon */}
              <div className="w-12 h-12 bg-orange-50 rounded-xl flex items-center justify-center mb-6">
                <Quote className="w-6 h-6 text-orange-500" />
              </div>

              {/* Quote text */}
              <blockquote className="text-base text-textprimary leading-relaxed mb-6">
                "{testimonial.quote}"
              </blockquote>

              {/* Author */}
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                  <span className="font-display font-bold text-textprimary">
                    {testimonial.author.split(' ').map(n => n[0]).join('')}
                  </span>
                </div>
                <div>
                  <p className="font-display font-semibold text-textprimary">
                    {testimonial.author}
                  </p>
                  <p className="text-sm text-textsecondary">
                    {testimonial.role}, {testimonial.company}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Disclaimer */}
        <p className="text-center text-xs text-textsecondary mt-8">
          Depoimentos ilustrativos para fins de demonstração.
        </p>
      </div>
    </section>
  );
}
