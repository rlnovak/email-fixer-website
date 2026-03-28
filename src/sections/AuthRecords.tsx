import { useRef, useLayoutEffect } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { CheckCircle, AlertTriangle, XCircle, FileText, Lock, Shield } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

export default function AuthRecords() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const rowsRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const section = sectionRef.current;
    const card = cardRef.current;
    const rows = rowsRef.current;

    if (!section || !card || !rows) return;

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
        { x: '-60vw', rotate: -1.5, opacity: 0 },
        { x: 0, rotate: 0, opacity: 1, ease: 'none' },
        0
      );

      // Rows stagger
      const rowElements = rows.querySelectorAll('.record-row');
      scrollTl.fromTo(rowElements,
        { x: -40, opacity: 0 },
        { x: 0, opacity: 1, stagger: 0.10, ease: 'none' },
        0.10
      );

      // Status chips pop
      const chips = rows.querySelectorAll('.status-chip');
      scrollTl.fromTo(chips,
        { scale: 0.92, opacity: 0 },
        { scale: 1, opacity: 1, stagger: 0.10, ease: 'none' },
        0.18
      );

      // SETTLE (30%-70%) - hold position

      // EXIT (70%-100%)
      scrollTl.fromTo(card,
        { y: 0, opacity: 1 },
        { y: '-35vh', opacity: 0, ease: 'power2.in' },
        0.7
      );

    }, section);

    return () => ctx.revert();
  }, []);

  const records = [
    {
      icon: FileText,
      title: 'SPF',
      description: 'Define quem pode enviar e-mails pelo seu domínio.',
      status: 'Validado',
      statusType: 'success',
      iconBg: 'bg-green-50',
      iconColor: 'text-green-500',
    },
    {
      icon: Lock,
      title: 'DKIM',
      description: 'Assinatura digital que protege contra alterações.',
      status: 'Incompleto',
      statusType: 'warning',
      iconBg: 'bg-yellow-50',
      iconColor: 'text-yellow-500',
    },
    {
      icon: Shield,
      title: 'DMARC',
      description: 'Política que orienta o que fazer quando há falhas.',
      status: 'Não encontrado',
      statusType: 'error',
      iconBg: 'bg-red-50',
      iconColor: 'text-red-500',
    },
  ];

  const getStatusIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-4 h-4" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4" />;
      case 'error':
        return <XCircle className="w-4 h-4" />;
      default:
        return null;
    }
  };

  return (
    <section
      ref={sectionRef}
      className="relative w-screen h-screen flex items-center justify-center overflow-hidden z-[104]"
      style={{ backgroundColor: '#F6F7F6' }}
    >
      {/* Dot grid background */}
      <div className="absolute inset-0 dot-grid opacity-50" />

      {/* Records Card */}
      <div
        ref={cardRef}
        className="relative w-[min(980px,88vw)] bg-white rounded-[28px] card-shadow card-border p-6 sm:p-10"
      >
        {/* Header */}
        <h2 className="font-display font-bold text-display-2 text-textprimary mb-8">
          Registros de autenticação
        </h2>

        {/* Record rows */}
        <div ref={rowsRef} className="space-y-4">
          {records.map((record) => (
            <div
              key={record.title}
              className="record-row flex flex-col sm:flex-row sm:items-center gap-4 p-5 bg-gray-50 rounded-2xl"
            >
              {/* Icon + Title */}
              <div className="flex items-center gap-4 sm:w-48">
                <div className={`w-12 h-12 rounded-xl ${record.iconBg} flex items-center justify-center flex-shrink-0`}>
                  <record.icon className={`w-6 h-6 ${record.iconColor}`} />
                </div>
                <span className="font-display font-bold text-lg text-textprimary">
                  {record.title}
                </span>
              </div>

              {/* Description */}
              <p className="flex-1 text-textsecondary text-sm sm:text-base">
                {record.description}
              </p>

              {/* Status chip */}
              <div className={`status-chip inline-flex items-center gap-2 px-4 py-2 rounded-full w-fit ${
                record.statusType === 'success' ? 'status-success' :
                record.statusType === 'warning' ? 'status-warning' : 'status-error'
              }`}>
                {getStatusIcon(record.statusType)}
                <span className="font-mono text-xs uppercase tracking-wider font-medium">
                  {record.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
