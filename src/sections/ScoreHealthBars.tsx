import { useRef, useLayoutEffect, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Info } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

export default function ScoreHealthBars() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const scoreRef = useRef<HTMLDivElement>(null);
  const barsRef = useRef<HTMLDivElement>(null);
  const [score, setScore] = useState(0);

  useLayoutEffect(() => {
    const section = sectionRef.current;
    const card = cardRef.current;
    const scoreEl = scoreRef.current;
    const bars = barsRef.current;

    if (!section || !card || !scoreEl || !bars) return;

    const ctx = gsap.context(() => {
      // Reveal do card + contador do score ao rolar até a seção (sem pin)
      gsap.fromTo(card,
        { y: 24, opacity: 0 },
        {
          y: 0, opacity: 1, duration: 0.6, ease: 'power2.out',
          scrollTrigger: {
            trigger: card,
            start: 'top 85%',
            toggleActions: 'play none none none',
            onEnter: () => {
              gsap.to({ v: 0 }, {
                v: 42, duration: 0.9, ease: 'power2.out',
                onUpdate: function () { setScore(Math.round(this.targets()[0].v)); },
              });
            },
          },
        }
      );

      const barFills = bars.querySelectorAll('.bar-fill');
      gsap.fromTo(barFills,
        { scaleX: 0 },
        {
          scaleX: 1, duration: 0.6, stagger: 0.06, ease: 'power2.out', transformOrigin: 'left',
          scrollTrigger: { trigger: bars, start: 'top 85%', toggleActions: 'play none none none' },
        }
      );

      const barContainers = bars.querySelectorAll('.bar-container');
      gsap.fromTo(barContainers,
        { y: 10, opacity: 0 },
        {
          y: 0, opacity: 1, duration: 0.5, stagger: 0.06, ease: 'power2.out',
          scrollTrigger: { trigger: bars, start: 'top 85%', toggleActions: 'play none none none' },
        }
      );
    }, section);

    return () => ctx.revert();
  }, []);

  const healthBars = [
    { label: 'SPF', percentage: 40, color: 'bg-red-500', status: 'Configurado errado' },
    { label: 'DKIM', percentage: 0, color: 'bg-red-500', status: 'Ausente' },
    { label: 'DMARC', percentage: 0, color: 'bg-red-500', status: 'Não encontrado' },
  ];

  // SVG circle progress
  const circumference = 2 * Math.PI * 80;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <section
      ref={sectionRef}
      className="relative w-full flex items-center justify-center py-20 sm:py-28"
      style={{ backgroundColor: '#F6F7F6' }}
    >
      {/* Dot grid background */}
      <div className="absolute inset-0 dot-grid opacity-50" />

      {/* Score Card */}
      <div
        ref={cardRef}
        className="relative w-[min(920px,86vw)] bg-white rounded-[28px] card-shadow card-border p-6 sm:p-10"
      >
        {/* Section title */}
        <h2 className="font-display font-bold text-display-2 text-textprimary text-center mb-8">
          Sua pontuação de entregabilidade
        </h2>

        {/* Score circle */}
        <div ref={scoreRef} className="flex flex-col items-center mb-10">
          <div className="relative w-48 h-48 mb-4">
            {/* Background circle */}
            <svg className="w-full h-full -rotate-90" viewBox="0 0 200 200">
              <circle
                cx="100"
                cy="100"
                r="80"
                fill="none"
                stroke="#E5E7EB"
                strokeWidth="12"
              />
              {/* Progress circle */}
              <circle
                cx="100"
                cy="100"
                r="80"
                fill="none"
                stroke="#FF4D2E"
                strokeWidth="12"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                style={{ transition: 'stroke-dashoffset 0.1s ease-out' }}
              />
            </svg>
            {/* Score number */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-display font-bold text-5xl text-textprimary">
                {score}
              </span>
              <span className="font-mono text-sm text-textsecondary">/100</span>
            </div>
          </div>
          <p className="font-mono text-xs uppercase tracking-wider text-textsecondary">
            Pontuação de entregabilidade
          </p>
        </div>

        {/* Health bars */}
        <div ref={barsRef} className="space-y-6 mb-8">
          {healthBars.map((bar) => (
            <div key={bar.label} className="bar-container">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <span className="font-display font-semibold text-textprimary w-16">
                    {bar.label}
                  </span>
                  <span className={`text-sm ${
                    bar.color === 'bg-green-500' ? 'text-green-600' :
                    bar.color === 'bg-yellow-500' ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    {bar.status}
                  </span>
                </div>
                <span className="font-mono text-sm text-textsecondary">
                  {bar.percentage}%
                </span>
              </div>
              <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`bar-fill h-full ${bar.color} rounded-full`}
                  style={{ transform: 'scaleX(0)', transformOrigin: 'left' }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Microcopy */}
        <div className="flex items-start gap-3 p-4 bg-orange-50 rounded-2xl">
          <Info className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-orange-700">
            Pequenos ajustes nos seus registros recuperam de <strong>15 a 30 pontos</strong>. É a diferença entre cair no spam e cair na caixa de entrada.
          </p>
        </div>
      </div>
    </section>
  );
}
