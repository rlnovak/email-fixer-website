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
      const scrollTl = gsap.timeline({
        scrollTrigger: {
          trigger: section,
          start: 'top top',
          end: '+=130%',
          pin: true,
          scrub: 0.6,
          onUpdate: (self) => {
            // Animate score number during entrance
            if (self.progress < 0.3) {
              const newScore = Math.round((self.progress / 0.3) * 72);
              setScore(newScore);
            }
          }
        }
      });

      // ENTRANCE (0%-30%)
      scrollTl.fromTo(card,
        { y: '22vh', scale: 0.94, opacity: 0 },
        { y: 0, scale: 1, opacity: 1, ease: 'none' },
        0
      );

      // Bars animation
      const barFills = bars.querySelectorAll('.bar-fill');
      scrollTl.fromTo(barFills,
        { scaleX: 0 },
        { scaleX: 1, stagger: 0.06, ease: 'none', transformOrigin: 'left' },
        0.14
      );

      const barContainers = bars.querySelectorAll('.bar-container');
      scrollTl.fromTo(barContainers,
        { y: 10, opacity: 0 },
        { y: 0, opacity: 1, stagger: 0.06, ease: 'none' },
        0.14
      );

      // SETTLE (30%-70%) - hold position

      // EXIT (70%-100%)
      scrollTl.fromTo(card,
        { x: 0, opacity: 1 },
        { x: '55vw', opacity: 0, ease: 'power2.in' },
        0.7
      );

    }, section);

    return () => ctx.revert();
  }, []);

  const healthBars = [
    { label: 'SPF', percentage: 100, color: 'bg-green-500', status: 'Configurado' },
    { label: 'DKIM', percentage: 45, color: 'bg-yellow-500', status: 'Incompleto' },
    { label: 'DMARC', percentage: 0, color: 'bg-red-500', status: 'Não encontrado' },
  ];

  // SVG circle progress
  const circumference = 2 * Math.PI * 80;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <section
      ref={sectionRef}
      className="relative w-screen h-screen flex items-center justify-center overflow-hidden z-[103]"
      style={{ backgroundColor: '#F6F7F6' }}
    >
      {/* Dot grid background */}
      <div className="absolute inset-0 dot-grid opacity-50" />

      {/* Score Card */}
      <div
        ref={cardRef}
        className="relative w-[min(920px,86vw)] bg-white rounded-[28px] card-shadow card-border p-6 sm:p-10"
      >
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
                    bar.percentage === 100 ? 'text-green-600' :
                    bar.percentage > 0 ? 'text-yellow-600' : 'text-red-600'
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
            Pequenos ajustes de DNS podem recuperar de <strong>15–30 pontos</strong> na sua pontuação.
          </p>
        </div>
      </div>
    </section>
  );
}
