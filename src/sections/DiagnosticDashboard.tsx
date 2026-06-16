import { useRef, useLayoutEffect } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { CheckCircle, AlertTriangle, Shield, Globe, TrendingDown, ChevronRight } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

interface DiagnosticDashboardProps {
  scanComplete: boolean;
}

export default function DiagnosticDashboard({ scanComplete }: DiagnosticDashboardProps) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const chipsRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const section = sectionRef.current;
    const card = cardRef.current;
    const chips = chipsRef.current;

    if (!section || !card || !chips) return;

    const ctx = gsap.context(() => {
      // Reveal simples ao rolar até a seção (sem pin, sem exit)
      gsap.fromTo(card,
        { y: 24, opacity: 0 },
        {
          y: 0, opacity: 1, duration: 0.6, ease: 'power2.out',
          scrollTrigger: { trigger: card, start: 'top 85%', toggleActions: 'play none none none' },
        }
      );

      const chipElements = chips.querySelectorAll('.metric-chip');
      gsap.fromTo(chipElements,
        { y: 18, scale: 0.98, opacity: 0 },
        {
          y: 0, scale: 1, opacity: 1, duration: 0.5, stagger: 0.08, ease: 'power2.out',
          scrollTrigger: { trigger: chips, start: 'top 85%', toggleActions: 'play none none none' },
        }
      );
    }, section);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      id="diagnostic"
      className="relative w-full flex items-center justify-center py-20 sm:py-28"
      style={{ backgroundColor: '#F6F7F6' }}
    >
      {/* Dot grid background */}
      <div className="absolute inset-0 dot-grid opacity-50" />

      {/* Dashboard Card */}
      <div
        ref={cardRef}
        className="relative w-[min(980px,88vw)] bg-white rounded-[28px] card-shadow card-border p-6 sm:p-10"
      >
        {/* Header row */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
          <div>
            <h2 className="font-display font-bold text-display-2 text-textprimary">
              Seu diagnóstico, em segundos
            </h2>
            <p className="text-textsecondary mt-2 max-w-md">
              A gente lê os registros reais do seu domínio — não um palpite genérico.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 px-4 py-2 status-success rounded-full w-fit flex-shrink-0">
            <CheckCircle className="w-4 h-4" />
            <span className="font-mono text-xs uppercase tracking-wider font-medium">
              Concluído
            </span>
          </div>
        </div>

        {/* Two-column summary */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
          <div className="p-5 bg-gray-50 rounded-2xl">
            <div className="flex items-center gap-2 mb-2">
              <Globe className="w-4 h-4 text-textsecondary" />
              <span className="font-mono text-xs uppercase tracking-wider text-textsecondary">
                Domínio verificado
              </span>
            </div>
            <p className="font-display font-semibold text-lg text-textprimary">
              {scanComplete ? 'empresa.com.br' : '---'}
            </p>
          </div>

          <div className="p-5 bg-gray-50 rounded-2xl">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-4 h-4 text-textsecondary" />
              <span className="font-mono text-xs uppercase tracking-wider text-textsecondary">
                Provedor detectado
              </span>
            </div>
            <p className="font-display font-semibold text-lg text-textprimary">
              Google Workspace
            </p>
            <p className="text-xs text-textsecondary mt-1">
              detectado automaticamente via MX
            </p>
          </div>
        </div>

        {/* Metric chips */}
        <div ref={chipsRef} className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="metric-chip flex items-center gap-3 p-4 status-success rounded-2xl">
            <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
              <Shield className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="font-mono text-xs uppercase tracking-wider text-green-700">Blacklists</p>
              <p className="font-display font-semibold text-green-800">Limpo · 0 listas</p>
            </div>
          </div>

          <div className="metric-chip flex items-center gap-3 p-4 status-warning rounded-2xl">
            <div className="w-10 h-10 rounded-xl bg-yellow-500/10 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="font-mono text-xs uppercase tracking-wider text-yellow-700">Autenticação</p>
              <p className="font-display font-semibold text-yellow-800">2 de 3 falhando</p>
            </div>
          </div>

          <div className="metric-chip flex items-center gap-3 p-4 status-error rounded-2xl">
            <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
              <TrendingDown className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="font-mono text-xs uppercase tracking-wider text-red-700">Reputação</p>
              <p className="font-display font-semibold text-red-800">Em risco</p>
            </div>
          </div>
        </div>

        {/* Link */}
        <button className="flex items-center gap-2 text-orange-500 hover:text-orange-600 font-medium transition-colors group">
          Ver detalhes completos
          <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </button>
      </div>
    </section>
  );
}
