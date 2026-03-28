import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import './App.css';

// Import sections
import Navigation from './sections/Navigation';
import HeroSection from './sections/HeroSection';
import DiagnosticDashboard from './sections/DiagnosticDashboard';
import ScoreHealthBars from './sections/ScoreHealthBars';
import AuthRecords from './sections/AuthRecords';
import BlacklistCheck from './sections/BlacklistCheck';
import FixKit from './sections/FixKit';
import HowItWorks from './sections/HowItWorks';
import Testimonials from './sections/Testimonials';
import Pricing from './sections/Pricing';
import FAQFooter from './sections/FAQFooter';

gsap.registerPlugin(ScrollTrigger);

function App() {
  const mainRef = useRef<HTMLDivElement>(null);
  const [domain, setDomain] = useState('');
  const [scanning, setScanning] = useState(false);
  const [scanComplete, setScanComplete] = useState(false);

  useEffect(() => {
    // Wait for all ScrollTriggers to be created
    const timer = setTimeout(() => {
      const pinned = ScrollTrigger.getAll()
        .filter(st => st.vars.pin)
        .sort((a, b) => a.start - b.start);

      const maxScroll = ScrollTrigger.maxScroll(window);
      if (!maxScroll || pinned.length === 0) return;

      const pinnedRanges = pinned.map(st => ({
        start: st.start / maxScroll,
        end: (st.end ?? st.start) / maxScroll,
        center: (st.start + ((st.end ?? st.start) - st.start) * 0.5) / maxScroll,
      }));

      ScrollTrigger.create({
        snap: {
          snapTo: (value: number) => {
            const inPinned = pinnedRanges.some(r => value >= r.start - 0.02 && value <= r.end + 0.02);
            if (!inPinned) return value;

            let target = pinnedRanges[0]?.center ?? 0;
            for (const r of pinnedRanges) {
              if (Math.abs(r.center - value) < Math.abs(target - value)) target = r.center;
            }
            return target;
          },
          duration: { min: 0.15, max: 0.35 },
          delay: 0,
          ease: "power2.out",
        },
      });
    }, 500);

    return () => {
      clearTimeout(timer);
      ScrollTrigger.getAll().forEach(st => st.kill());
    };
  }, []);

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
    <div ref={mainRef} className="relative">
      {/* Grain overlay */}
      <div className="grain-overlay" />
      
      {/* Navigation */}
      <Navigation />
      
      {/* Main content */}
      <main className="relative">
        {/* Pinned Sections Wrapper */}
        <div className="relative z-[100]">
          {/* Section 1: Hero */}
          <HeroSection 
            domain={domain} 
            setDomain={setDomain} 
            scanning={scanning}
            onScan={handleScan}
          />
          
          {/* Section 2: Diagnostic Dashboard */}
          <DiagnosticDashboard scanComplete={scanComplete} />
          
          {/* Section 3: Score + Health Bars */}
          <ScoreHealthBars />
          
          {/* Section 4: Authentication Records */}
          <AuthRecords />
          
          {/* Section 5: Blacklist Check */}
          <BlacklistCheck />
          
          {/* Section 6: Fix Kit */}
          <FixKit />
        </div>
        
        {/* Flowing Sections */}
        <HowItWorks />
        <Testimonials />
        <Pricing />
        <FAQFooter />
      </main>
    </div>
  );
}

export default App;
