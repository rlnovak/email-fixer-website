import { useState } from 'react';
import './App.css';

// Import sections
import Navigation from './sections/Navigation';
import HeroSection from './sections/HeroSection';
import DiagnosticDashboard from './sections/DiagnosticDashboard';
import ScoreHealthBars from './sections/ScoreHealthBars';
import AuthRecords from './sections/AuthRecords';
import BlacklistCheck from './sections/BlacklistCheck';
import FixKit from './sections/FixKit';
import SpamToInbox from './sections/SpamToInbox';
import DeliverySimulation from './sections/DeliverySimulation';
import WhyNotChatGPT from './sections/WhyNotChatGPT';
import HowItWorks from './sections/HowItWorks';
import Testimonials from './sections/Testimonials';
import Pricing from './sections/Pricing';
import FAQFooter from './sections/FAQFooter';

function App() {
  const [domain, setDomain] = useState('');
  const [scanning, setScanning] = useState(false);
  const [scanComplete, setScanComplete] = useState(false);

  const handleScan = () => {
    if (!domain) return;
    setScanning(true);
    setTimeout(() => {
      setScanning(false);
      setScanComplete(true);
      // Scroll to next section
      const diagnosticSection = document.getElementById('diagnostic');
      if (diagnosticSection) {
        diagnosticSection.scrollIntoView({ behavior: 'smooth' });
      }
    }, 2000);
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
        />
        <DiagnosticDashboard scanComplete={scanComplete} />
        <ScoreHealthBars />
        <AuthRecords />
        <BlacklistCheck />
        <FixKit />
        <DeliverySimulation />
        <SpamToInbox />
        <WhyNotChatGPT />
        <HowItWorks />
        <Testimonials />
        <Pricing />
        <FAQFooter />
      </main>

      {/* Mobile sticky CTA — aparece após o diagnóstico */}
      {scanComplete && (
        <div className="fixed bottom-0 left-0 right-0 z-[200] sm:hidden">
          <div className="bg-white border-t border-gray-100 px-4 pt-3 pb-4 shadow-[0_-8px_30px_rgba(0,0,0,0.10)]">
            <button
              onClick={() => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })}
              className="w-full h-12 bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white font-semibold rounded-xl text-sm transition-colors"
            >
              Corrigir agora — R$ 99
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
