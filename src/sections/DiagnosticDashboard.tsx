import { useRef, useLayoutEffect } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { CheckCircle, AlertTriangle, Shield, Globe, TrendingUp, ChevronRight } from 'lucide-react';

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
      const scrollTl = gsap.timeline({
        scrollTrigger: {
          trigger: section,
          start: 'top top',
          end: '+=130%',
          pin: true,
          scrub: 0.6,
        }
      });

      // ENTRANCE (0%-30%)
      scrollTl.fromTo(card,
        { x: '60vw', rotate: 1.5, opacity: 0 },
        { x: 0, rotate: 0, opacity: 1, ease: 'none' },
        0
      );

      // Chips stagger
      const chipElements = chips.querySelectorAll('.metric-chip');
      scrollTl.fromTo(chipElements,
        { y: 18, scale: 0.98, opacity: 0 },
        { y: 0, scale: 1, opacity: 1, stagger: 0.08, ease: 'none' },
        0.12
      );

      // SETTLE (30%-70%) - hold position

      // EXIT (70%-100%)
      scrollTl.fromTo(card,
        { x: 0, opacity: 1 },
        { x: '-55vw', opacity: 0, ease: 'power2.in' },
        0.7
      );

    }, section);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      id="diagnostic"
      className="relative w-screen h-screen flex items-center justify-center overflow-hidden z-[102]"
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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <h2 className="font-display font-bold text-display-2 text-textprimary">
            Diagnóstico de entregabilidade
          </h2>
          <div className="inline-flex items-center gap-2 px-4 py-2 status-success rounded-full w-fit">
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
              <p className="font-display font-semibold text-green-800">0 listagens</p>
            </div>
          </div>

          <div className="metric-chip flex items-center gap-3 p-4 status-warning rounded-2xl">
            <div className="w-10 h-10 rounded-xl bg-yellow-500/10 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="font-mono text-xs uppercase tracking-wider text-yellow-700">Autenticação</p>
              <p className="font-display font-semibold text-yellow-800">2 problemas</p>
            </div>
          </div>

          <div className="metric-chip flex items-center gap-3 p-4 status-info rounded-2xl">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="font-mono text-xs uppercase tracking-wider text-blue-700">Reputação</p>
              <p className="font-display font-semibold text-blue-800">Estável</p>
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
