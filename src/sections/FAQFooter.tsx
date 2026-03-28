import { useRef, useLayoutEffect, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ChevronDown, Mail, MessageCircle } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

export default function FAQFooter() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const faqRef = useRef<HTMLDivElement>(null);
  const footerRef = useRef<HTMLDivElement>(null);
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  useLayoutEffect(() => {
    const section = sectionRef.current;
    const header = headerRef.current;
    const faq = faqRef.current;
    const footer = footerRef.current;

    if (!section || !header || !faq || !footer) return;

    const ctx = gsap.context(() => {
      // Header animation
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
            toggleActions: 'play none none reverse',
          }
        }
      );

      // FAQ items animation
      const items = faq.querySelectorAll('.faq-item');
      gsap.fromTo(items,
        { y: 12, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.4,
          stagger: 0.08,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: faq,
            start: 'top 75%',
            toggleActions: 'play none none reverse',
          }
        }
      );

      // Footer animation
      gsap.fromTo(footer,
        { opacity: 0 },
        {
          opacity: 1,
          duration: 0.6,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: footer,
            start: 'top 90%',
            toggleActions: 'play none none reverse',
          }
        }
      );

    }, section);

    return () => ctx.revert();
  }, []);

  const faqs = [
    {
      question: 'O que é SPF, DKIM e DMARC?',
      answer: 'SPF (Sender Policy Framework), DKIM (DomainKeys Identified Mail) e DMARC (Domain-based Message Authentication) são protocolos de autenticação de e-mail que ajudam a prevenir spoofing e phishing. Eles verificam se o remetente está autorizado a enviar e-mails em nome de um domínio.',
    },
    {
      question: 'Por que meus e-mails caem no spam?',
      answer: 'E-mails frequentemente caem no spam devido a registros SPF, DKIM ou DMARC ausentes ou mal configurados. Isso informa aos provedores de e-mail que suas mensagens podem ser fraudulentas, levando-as a serem marcadas como spam ou rejeitadas.',
    },
    {
      question: 'Quanto tempo leva para corrigir?',
      answer: 'A maioria dos problemas pode ser corrigida em 5-10 minutos. Depois de adicionar os registros DNS, a propagação geralmente leva de alguns minutos até 24 horas, dependendo do seu provedor de DNS.',
    },
    {
      question: 'Preciso ser técnico para usar?',
      answer: 'Não. Nosso relatório inclui instruções passo a passo específicas para as principais plataformas de DNS (Cloudflare, GoDaddy, Registro.br, etc.). Se você conseguir acessar as configurações de DNS do seu domínio, conseguirá fazer as correções.',
    },
    {
      question: 'E se eu não conseguir corrigir?',
      answer: 'Oferecemos garantia de 7 dias. Se você não conseguir corrigir seus problemas de entregabilidade com nosso relatório, devolvemos seu dinheiro. Sem perguntas.',
    },
  ];

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section
      ref={sectionRef}
      id="faq"
      className="relative py-20 sm:py-28"
      style={{ backgroundColor: '#F6F7F6' }}
    >
      {/* Dot grid background */}
      <div className="absolute inset-0 dot-grid opacity-50" />

      <div className="relative max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div ref={headerRef} className="text-center mb-12">
          <h2 className="font-display font-bold text-display-2 text-textprimary mb-4">
            Perguntas frequentes
          </h2>
          <p className="text-lg text-textsecondary">
            Tire suas dúvidas sobre o EmailCorreto
          </p>
        </div>

        {/* FAQ List */}
        <div ref={faqRef} className="space-y-3 mb-20">
          {faqs.map((faq, index) => (
            <div
              key={index}
              className="faq-item bg-white rounded-2xl card-border overflow-hidden"
            >
              <button
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="w-full flex items-center justify-between p-5 text-left hover:bg-gray-50 transition-colors"
              >
                <span className="font-display font-semibold text-textprimary pr-4">
                  {faq.question}
                </span>
                <ChevronDown
                  className={`w-5 h-5 text-textsecondary flex-shrink-0 transition-transform ${
                    openIndex === index ? 'rotate-180' : ''
                  }`}
                />
              </button>
              {openIndex === index && (
                <div className="px-5 pb-5">
                  <p className="text-textsecondary leading-relaxed">
                    {faq.answer}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <footer
        ref={footerRef}
        className="relative border-t border-gray-200 pt-16 pb-8"
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
            {/* Logo & tagline */}
            <div className="md:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-orange-500 flex items-center justify-center">
                  <Mail className="w-4 h-4 text-white" />
                </div>
                <span className="font-display font-bold text-lg text-textprimary">
                  EmailCorreto
                </span>
              </div>
              <p className="text-textsecondary mb-4 max-w-sm">
                Corrija sua entregabilidade em minutos. Descubra e resolva problemas de SPF, DKIM e DMARC.
              </p>
              <div className="flex items-center gap-2 text-sm text-textsecondary">
                <MessageCircle className="w-4 h-4" />
                <a href="mailto:suporte@emailcorreto.com.br" className="hover:text-orange-500 transition-colors">
                  suporte@emailcorreto.com.br
                </a>
              </div>
            </div>

            {/* Links */}
            <div>
              <h4 className="font-display font-semibold text-textprimary mb-4">
                Navegação
              </h4>
              <ul className="space-y-3">
                {[
                  { label: 'Como funciona', id: 'how-it-works' },
                  { label: 'Depoimentos', id: 'testimonials' },
                  { label: 'Preço', id: 'pricing' },
                  { label: 'FAQ', id: 'faq' },
                ].map((link) => (
                  <li key={link.id}>
                    <button
                      onClick={() => scrollToSection(link.id)}
                      className="text-textsecondary hover:text-textprimary transition-colors"
                    >
                      {link.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h4 className="font-display font-semibold text-textprimary mb-4">
                Legal
              </h4>
              <ul className="space-y-3">
                <li>
                  <a href="#" className="text-textsecondary hover:text-textprimary transition-colors">
                    Termos de Serviço
                  </a>
                </li>
                <li>
                  <a href="#" className="text-textsecondary hover:text-textprimary transition-colors">
                    Política de Privacidade
                  </a>
                </li>
                <li>
                  <a href="#" className="text-textsecondary hover:text-textprimary transition-colors">
                    Política de Reembolso
                  </a>
                </li>
              </ul>
            </div>
          </div>

          {/* Copyright */}
          <div className="pt-8 border-t border-gray-200 text-center">
            <p className="text-sm text-textsecondary">
              © 2026 EmailCorreto. Todos os direitos reservados.
            </p>
          </div>
        </div>
      </footer>
    </section>
  );
}
