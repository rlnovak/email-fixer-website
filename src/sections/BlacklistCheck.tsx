import { useRef, useLayoutEffect } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Shield, CheckCircle } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

export default function BlacklistCheck() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const section = sectionRef.current;
    const card = cardRef.current;
    const list = listRef.current;

    if (!section || !card || !list) return;

    const ctx = gsap.context(() => {
      // Reveal simples ao rolar até a seção (sem pin, sem exit)
      gsap.fromTo(card,
        { y: 24, opacity: 0 },
        {
          y: 0, opacity: 1, duration: 0.6, ease: 'power2.out',
          scrollTrigger: { trigger: card, start: 'top 85%', toggleActions: 'play none none none' },
        }
      );

      const items = list.querySelectorAll('.blacklist-item');
      gsap.fromTo(items,
        { y: 14, opacity: 0 },
        {
          y: 0, opacity: 1, duration: 0.4, stagger: 0.03, ease: 'power2.out',
          scrollTrigger: { trigger: list, start: 'top 85%', toggleActions: 'play none none none' },
        }
      );
    }, section);

    return () => ctx.revert();
  }, []);

  const blacklists = [
    'Spamhaus', 'Barracuda', 'SORBS', 'SpamCop', 'URIBL',
    'DNSBL', 'DroneBL', 'Blocklist.de', 'Abuse.ch', 'SpamRats',
    'Backscatterer', 'LashBack', 'Invaluement', 'Mailspike', 'PSBL',
    'WPBL', 'BLScore', 'Cybercrime', 'FabelSpams', 'SpamEatingMonkey',
  ];

  return (
    <section
      ref={sectionRef}
      className="relative w-full flex items-center justify-center py-20 sm:py-28"
      style={{ backgroundColor: '#F6F7F6' }}
    >
      {/* Dot grid background */}
      <div className="absolute inset-0 dot-grid opacity-50" />

      {/* Blacklist Card */}
      <div
        ref={cardRef}
        className="relative w-[min(980px,88vw)] bg-white rounded-[28px] card-shadow card-border p-6 sm:p-10"
      >
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h2 className="font-display font-bold text-display-2 text-textprimary mb-2">
              Verificação de blacklists
            </h2>
            <p className="text-textsecondary">
              Consulta em mais de 50 listas em segundos.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 px-4 py-2 status-success rounded-full w-fit">
            <CheckCircle className="w-4 h-4" />
            <span className="font-mono text-xs uppercase tracking-wider font-medium">
              0 listagens
            </span>
          </div>
        </div>

        {/* Blacklist grid */}
        <div ref={listRef} className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          {blacklists.map((blacklist) => (
            <div
              key={blacklist}
              className="blacklist-item flex items-center gap-2 p-3 bg-gray-50 rounded-xl"
            >
              <div className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
              <span className="text-sm text-textprimary font-medium truncate">
                {blacklist}
              </span>
            </div>
          ))}
        </div>

        {/* Summary */}
        <div className="flex items-center gap-4 p-5 bg-green-50 rounded-2xl">
          <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center">
            <Shield className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <p className="font-display font-semibold text-green-800">
              Seu domínio está limpo
            </p>
            <p className="text-sm text-green-600">
              Nenhuma listagem detectada em {blacklists.length}+ blacklists
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
