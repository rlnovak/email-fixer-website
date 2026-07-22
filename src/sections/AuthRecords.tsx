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
      // Reveal simples ao rolar até a seção (sem pin, sem exit)
      gsap.fromTo(card,
        { y: 24, opacity: 0 },
        {
          y: 0, opacity: 1, duration: 0.6, ease: 'power2.out',
          scrollTrigger: { trigger: card, start: 'top 85%', toggleActions: 'play none none none' },
        }
      );

      const rowElements = rows.querySelectorAll('.record-row');
      gsap.fromTo(rowElements,
        { y: 18, opacity: 0 },
        {
          y: 0, opacity: 1, duration: 0.5, stagger: 0.10, ease: 'power2.out',
          scrollTrigger: { trigger: rows, start: 'top 85%', toggleActions: 'play none none none' },
        }
      );
    }, section);

    return () => ctx.revert();
  }, []);

  const records = [
    {
      icon: FileText,
      title: 'Autorização de envio',
      description: 'Diz quais servidores têm permissão pra enviar e-mail em nome do seu domínio.',
      impact: 'Sem isso correto, qualquer servidor pode se passar por você — e o Gmail joga seu e-mail no spam.',
      status: 'Configurado errado',
      statusType: 'error',
      iconBg: 'bg-red-50',
      iconColor: 'text-red-500',
    },
    {
      icon: Lock,
      title: 'Assinatura dos e-mails',
      description: 'Assina cada e-mail com uma chave que prova que ele saiu mesmo do seu domínio.',
      impact: 'Sem a assinatura, o provedor do destinatário não confia no envio e a entrega despenca.',
      status: 'Ausente',
      statusType: 'error',
      iconBg: 'bg-red-50',
      iconColor: 'text-red-500',
    },
    {
      icon: Shield,
      title: 'Proteção contra fraude',
      description: 'Define a regra do que fazer quando um e-mail falha na verificação.',
      impact: 'Sem essa proteção, golpistas usam seu domínio em fraudes e queimam sua reputação.',
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
      className="relative w-full flex items-center justify-center py-20 sm:py-28"
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
          Os 3 registros que decidem se seu e-mail chega
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

              {/* Description + impact */}
              <div className="flex-1">
                <p className="text-textsecondary text-sm sm:text-base">{record.description}</p>
                <p className={`text-xs mt-1 font-medium ${
                  record.statusType === 'success' ? 'text-green-600' :
                  record.statusType === 'warning' ? 'text-yellow-700' : 'text-red-600'
                }`}>
                  {record.impact}
                </p>
              </div>

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
