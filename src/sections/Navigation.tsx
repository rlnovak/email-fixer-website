import { useState, useEffect } from 'react';
import { Menu, X, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Navigation() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 100);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
      setIsMobileMenuOpen(false);
    }
  };

  const navLinks = [
    { label: 'Como funciona', id: 'how-it-works' },
    { label: 'Depoimentos', id: 'testimonials' },
    { label: 'Preço', id: 'pricing' },
    { label: 'FAQ', id: 'faq' },
  ];

  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-[1000] transition-all duration-300 ${
          isScrolled
            ? 'bg-white/90 backdrop-blur-md shadow-sm'
            : 'bg-transparent'
        }`}
      >
        <div className="flex items-center justify-between h-[72px] px-4 sm:px-6 lg:px-[4vw]">
          {/* Logo */}
          <a 
            href="#" 
            onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
            className="flex items-center gap-2 group"
          >
            <div className="w-8 h-8 rounded-lg bg-orange-500 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Mail className="w-4 h-4 text-white" />
            </div>
            <span className="font-display font-bold text-lg text-textprimary">
              EmailCorreto
            </span>
          </a>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <button
                key={link.id}
                onClick={() => scrollToSection(link.id)}
                className="text-sm font-medium text-textsecondary hover:text-textprimary transition-colors"
              >
                {link.label}
              </button>
            ))}
          </div>

          {/* CTA Button */}
          <div className="hidden md:block">
            <Button
              onClick={() => scrollToSection('hero')}
              className="bg-orange-500 hover:bg-orange-600 text-white font-medium px-5 py-2 rounded-full transition-all hover:-translate-y-0.5"
            >
              Verificar meu domínio
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 text-textprimary"
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </nav>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-[999] bg-white md:hidden pt-[72px]">
          <div className="flex flex-col p-6 gap-4">
            {navLinks.map((link) => (
              <button
                key={link.id}
                onClick={() => scrollToSection(link.id)}
                className="text-left text-lg font-medium text-textprimary py-3 border-b border-gray-100"
              >
                {link.label}
              </button>
            ))}
            <Button
              onClick={() => scrollToSection('hero')}
              className="bg-orange-500 hover:bg-orange-600 text-white font-medium py-3 rounded-full mt-4"
            >
              Verificar meu domínio
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
