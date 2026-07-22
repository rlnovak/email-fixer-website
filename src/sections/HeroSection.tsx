import { useRef, useLayoutEffect } from 'react';
import { gsap } from 'gsap';
import { Search, CheckCircle, Zap, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface HeroSectionProps {
  domain: string;
  setDomain: (value: string) => void;
  scanning: boolean;
  onScan: () => void;
  error?: string | null;
}

export default function HeroSection({ domain, setDomain, scanning, onScan, error }: HeroSectionProps) {
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
    }, section);

    return () => ctx.revert();
  }, []);

  const headlineWords = 'Seus clientes não estão recebendo os seus e-mails?'.split(' ');

  return (
    <section
      ref={sectionRef}
      id="hero"
      className="relative w-full min-h-screen flex items-center justify-center py-20"
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
            Diagnóstico grátis · sem cadastro
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

        {/* Big idea */}
        <div className="border-l-4 border-orange-500 bg-orange-50 rounded-r-xl pl-4 pr-5 py-3 mb-6">
          <p className="font-display font-bold text-lg sm:text-xl text-textprimary leading-snug">
            Você está pagando pra mandar e-mail que ninguém recebe.
          </p>
        </div>

        {/* Subheadline */}
        <p className="text-lg sm:text-xl text-textsecondary mb-8 max-w-xl">
          Verifique seu domínio em 10 segundos. Corrija em 5 minutos. A autenticação do seu domínio ajustada pro seu provedor, pronta pra copiar e colar.
        </p>

        {/* Scanner Input */}
        <div ref={inputRef} className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Input
              type="text"
              placeholder="seudominio.com.br"
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
                Verificar grátis
              </span>
            )}
          </Button>
        </div>

        {/* Erro de scan */}
        {error && (
          <p className="text-sm text-[#FF3B3B] mb-4 -mt-1">
            {error}
          </p>
        )}

        {/* Trust microcopy */}
        <p className="text-sm text-textsecondary mb-10">
          Sem cadastro. Sem cartão. Você vê o diagnóstico antes de pagar qualquer coisa.
        </p>

        {/* Stats row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6 border-t border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
              <Zap className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <p className="font-display font-bold text-textprimary">10s</p>
              <p className="text-xs text-textsecondary">para o diagnóstico completo</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center flex-shrink-0">
              <Clock className="w-5 h-5 text-orange-500" />
            </div>
            <div>
              <p className="font-display font-bold text-textprimary flex items-baseline gap-1.5">
                <span className="line-through text-textsecondary text-sm font-medium">R$ 99</span>
                <span className="text-orange-500 text-xl">R$ 49</span>
              </p>
              <p className="text-xs text-textsecondary">oferta de lançamento · pagamento único</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center flex-shrink-0">
              <CheckCircle className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <p className="font-display font-bold text-textprimary">7 dias</p>
              <p className="text-xs text-textsecondary">de garantia ou seu dinheiro de volta</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
