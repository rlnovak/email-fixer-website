import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { scanDomain } from './lib/api';
import './App.css';

// Import sections
import Navigation from './sections/Navigation';
import HeroSection from './sections/HeroSection';
import DiagnosticDashboard from './sections/DiagnosticDashboard';
import ScoreHealthBars from './sections/ScoreHealthBars';
import AuthRecords from './sections/AuthRecords';
import FixKit from './sections/FixKit';
import SpamToInbox from './sections/SpamToInbox';
import DeliverySimulation from './sections/DeliverySimulation';
import WhyNotChatGPT from './sections/WhyNotChatGPT';
import HowItWorks from './sections/HowItWorks';
import Testimonials from './sections/Testimonials';
import Pricing from './sections/Pricing';
import FAQFooter from './sections/FAQFooter';

function App() {
  const navigate = useNavigate();
  const [domain, setDomain] = useState('');
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);

  const handleScan = async () => {
    if (!domain || scanning) return;
    setScanning(true);
    setScanError(null);
    try {
      const result = await scanDomain(domain);
      // Leva o resultado real para a página de diagnóstico via state de navegação.
      navigate('/diagnostico', { state: { scan: result } });
    } catch (err) {
      setScanError(err instanceof Error ? err.message : 'Erro ao escanear. Tente novamente.');
      setScanning(false);
    }
  };

  return (
    <div className="relative">
      {/* Grain overlay */}
      <div className="grain-overlay" />

      {/* Navigation */}
      <Navigation />

      {/* Main content — scroll vertical simples, sem pin/snap */}
      <main className="relative">
        <HeroSection
          domain={domain}
          setDomain={setDomain}
          scanning={scanning}
          onScan={handleScan}
          error={scanError}
        />
        <DiagnosticDashboard scanComplete={true} />
        <ScoreHealthBars />
        <AuthRecords />
        <FixKit />
        <DeliverySimulation />
        <SpamToInbox />
        <WhyNotChatGPT />
        <HowItWorks />
        <Testimonials />
        <Pricing />
        <FAQFooter />
      </main>

      {/* Mobile sticky CTA — leva o usuário de volta ao campo de scan */}
      <div className="fixed bottom-0 left-0 right-0 z-[200] sm:hidden">
        <div className="bg-white border-t border-gray-100 px-4 pt-3 pb-4 shadow-[0_-8px_30px_rgba(0,0,0,0.10)]">
          <button
            onClick={() => document.getElementById('hero')?.scrollIntoView({ behavior: 'smooth' })}
            className="w-full h-12 bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white font-semibold rounded-xl text-sm transition-colors"
          >
            Verificar meu domínio grátis
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;
