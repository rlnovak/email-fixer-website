import { useRef, useLayoutEffect } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Search, CheckCircle, Zap, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

gsap.registerPlugin(ScrollTrigger);

interface HeroSectionProps {
  domain: string;
  setDomain: (value: string) => void;
  scanning: boolean;
  onScan: () => void;
}

export default function HeroSection({ domain, setDomain, scanning, onScan }: HeroSectionProps) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const headlineRef = useRef<HTMLHeadingElement>(null);
  const inputRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const section = sectionRef.current;
    const card = cardRef.current;
    const headline = headlineRef.current;
    const input = inputRef.current;

    if (!section || !card || !headline || !input) return;

    const ctx = gsap.context(() => {
      // Initial load animation
      gsap.fromTo(card,
        { y: '18vh', scale: 0.92, opacity: 0 },
        { y: 0, scale: 1, opacity: 1, duration: 0.8, ease: 'power3.out', delay: 0.2 }
      );

      gsap.fromTo(headline.querySelectorAll('.word'),
        { y: 24, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.5, stagger: 0.03, ease: 'power2.out', delay: 0.4 }
      );

      gsap.fromTo(input,
        { y: 30, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.5, ease: 'power2.out', delay: 0.6 }
      );

      // Scroll-driven animation
      const scrollTl = gsap.timeline({
        scrollTrigger: {
          trigger: section,
          start: 'top top',
          end: '+=130%',
          pin: true,
          scrub: 0.6,
          onLeaveBack: () => {
            // Reset to visible when scrolling back
            gsap.set(card, { x: 0, scale: 1, opacity: 1 });
          }
        }
      });

      // EXIT (70%-100%)
      scrollTl.fromTo(card,
        { x: 0, scale: 1, opacity: 1 },
        { x: '-55vw', scale: 0.96, opacity: 0, ease: 'power2.in' },
        0.7
      );

    }, section);

    return () => ctx.revert();
  }, []);

  const headlineWords = 'Seus e-mails estão caindo no spam?'.split(' ');

  return (
    <section
      ref={sectionRef}
      id="hero"
      className="relative w-screen h-screen flex items-center justify-center overflow-hidden z-[101]"
      style={{ backgroundColor: '#F6F7F6' }}
    >
      {/* Dot grid background */}
      <div className="absolute inset-0 dot-grid opacity-50" />

      {/* Hero Card */}
      <div
        ref={cardRef}
        className="relative w-[min(920px,86vw)] bg-white rounded-[28px] card-shadow card-border p-6 sm:p-10 lg:p-12"
      >
        {/* Tag pill */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-green-50 border border-green-100 rounded-full mb-6">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="font-mono text-xs uppercase tracking-wider text-green-700 font-medium">
            Verificação gratuita · Sem cadastro
          </span>
        </div>

        {/* Headline */}
        <h1
          ref={headlineRef}
          className="font-display font-bold text-display-1 text-textprimary mb-4"
        >
          {headlineWords.map((word, i) => (
            <span key={i} className="word inline-block mr-[0.25em]">
              {word}
            </span>
          ))}
        </h1>

        {/* Subheadline */}
        <p className="text-lg sm:text-xl text-textsecondary mb-8 max-w-xl">
          Descubra gratuitamente o que impede seus e-mails de chegar na caixa de entrada dos seus clientes.
          Correção completa por <strong className="text-textprimary font-semibold">R$ 99</strong> — pagamento único, sem mensalidade.
        </p>

        {/* Scanner Input */}
        <div ref={inputRef} className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Input
              type="text"
              placeholder="seuempresa.com.br"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && onScan()}
              className="w-full h-14 pl-5 pr-4 text-base rounded-xl border-gray-200 focus:border-orange-500 focus:ring-orange-500/20"
            />
          </div>
          <Button
            onClick={onScan}
            disabled={scanning || !domain}
            className="h-14 px-8 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl transition-all hover:-translate-y-0.5 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {scanning ? (
              <span className="flex items-center gap-2">
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Verificando...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Search className="w-5 h-5" />
                Verificar agora
              </span>
            )}
          </Button>
        </div>

        {/* Trust microcopy */}
        <p className="text-sm text-textsecondary mb-10">
          Diagnóstico em segundos · Mais de 50 blacklists · Sem cadastro
        </p>

        {/* Stats row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6 border-t border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center flex-shrink-0">
              <CheckCircle className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <p className="font-display font-bold text-textprimary">+2.000</p>
              <p className="text-xs text-textsecondary">domínios verificados</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
              <Zap className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <p className="font-display font-bold text-textprimary">Google/Microsoft</p>
              <p className="text-xs text-textsecondary">totalmente compatível</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center flex-shrink-0">
              <Clock className="w-5 h-5 text-orange-500" />
            </div>
            <div>
              <p className="font-display font-bold text-textprimary">R$ 99</p>
              <p className="text-xs text-textsecondary">pagamento único · sem mensalidade</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
