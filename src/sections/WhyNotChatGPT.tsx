import { useRef, useLayoutEffect } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { EyeOff, FileQuestion, SearchX, AlertTriangle, Sparkles } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

export default function WhyNotChatGPT() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<HTMLDivElement>(null);
  const bandRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const section = sectionRef.current;
    const header = headerRef.current;
    const cards = cardsRef.current;
    const band = bandRef.current;

    if (!section || !header || !cards || !band) return;

    const ctx = gsap.context(() => {
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

      const cardElements = cards.querySelectorAll('.reason-card');
      gsap.fromTo(cardElements,
        { y: 28, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.6,
          stagger: 0.1,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: cards,
            start: 'top 75%',
            toggleActions: 'play none none none',
          }
        }
      );

      gsap.fromTo(band,
        { y: 20, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.6,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: band,
            start: 'top 85%',
            toggleActions: 'play none none none',
          }
        }
      );

    }, section);

    return () => ctx.revert();
  }, []);

  const reasons = [
    {
      icon: EyeOff,
      title: 'Ele não lê o seu DNS',
      description: 'O ChatGPT não consegue acessar os registros reais do seu domínio. Ele responde no escuro, sem nunca ter olhado pra sua configuração.',
    },
    {
      icon: FileQuestion,
      title: 'Conselho genérico não resolve',
      description: 'Você recebe um modelo padrão de SPF que serve pra todo mundo e pra ninguém. Cada provedor exige valores específicos — e o seu caso é o seu caso.',
    },
    {
      icon: SearchX,
      title: 'Ele não enxerga o que já está lá',
      description: 'Talvez você já tenha um SPF meio certo, um DKIM pela metade. Sem ver isso, qualquer sugestão pode entrar em conflito com o que já existe.',
    },
    {
      icon: AlertTriangle,
      title: 'Pode inventar registros errados',
      description: 'A IA chuta valores que parecem certos, mas não são. Um registro errado piora a entrega em vez de consertar — e você nem percebe até perder a próxima venda.',
    },
  ];

  return (
    <section
      ref={sectionRef}
      id="why-not-chatgpt"
      className="relative py-20 sm:py-28"
      style={{ backgroundColor: '#F6F7F6' }}
    >
      {/* Dot grid background */}
      <div className="absolute inset-0 dot-grid opacity-50" />

      <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div ref={headerRef} className="text-center mb-16">
          <h2 className="font-display font-bold text-display-2 text-textprimary mb-4">
            Por que não perguntar ao ChatGPT?
          </h2>
          <p className="text-lg text-textsecondary max-w-2xl mx-auto">
            Porque o ChatGPT não faz ideia de como o seu domínio está configurado agora.
          </p>
        </div>

        {/* Reason cards */}
        <div ref={cardsRef} className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          {reasons.map((reason) => (
            <div
              key={reason.title}
              className="reason-card bg-white rounded-[28px] card-shadow card-border p-8"
            >
              <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center mb-6">
                <reason.icon className="w-7 h-7 text-[#FF3B3B]" />
              </div>
              <h3 className="font-display font-bold text-xl text-textprimary mb-3">
                {reason.title}
              </h3>
              <p className="text-textsecondary leading-relaxed">
                {reason.description}
              </p>
            </div>
          ))}
        </div>

        {/* Closing band */}
        <div
          ref={bandRef}
          className="bg-orange-50 border border-orange-100 rounded-[28px] p-8 sm:p-10 flex flex-col sm:flex-row items-start gap-5"
        >
          <div className="w-12 h-12 rounded-2xl bg-orange-500 flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <p className="text-lg text-textprimary leading-relaxed">
            O <strong className="text-orange-600 font-semibold">EmailCorreto</strong> lê o DNS real do seu domínio, detecta seu provedor pelos registros MX e te entrega os valores exatos pra copiar e colar. Nada de chute.
          </p>
        </div>
      </div>
    </section>
  );
}
