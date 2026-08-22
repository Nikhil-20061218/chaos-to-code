import React from 'react';
import { Header } from '../components/landing/Header';
import { HeroSection } from '../components/landing/HeroSection';
import { SkipLink } from '../components/accessibility/SkipLink';

interface LandingPageProps {
  onNavigate?: (path: string) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onNavigate }) => {
  return (
    <div className="min-h-screen flex flex-col bg-white text-slate-900 selection:bg-brand-500 selection:text-white">
      {/* Accessible Skip Link for Keyboard Users */}
      <SkipLink />

      {/* Landing Page Header */}
      <Header onNavigate={onNavigate} />

      {/* Main Hero Content Landmark */}
      <main id="main-content" tabIndex={-1} className="flex-1 focus:outline-none">
        <HeroSection onNavigate={onNavigate} />
      </main>

      {/* Minimal Clean Footer */}
      <footer role="contentinfo" className="py-8 border-t border-slate-100 bg-slate-50/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 font-medium">
          <p>© {new Date().getFullYear()} AccessAI. Universal digital accessibility for all.</p>
          <div className="flex items-center gap-6">
            <a href="#privacy" className="hover:text-slate-900 transition-colors">Privacy</a>
            <a href="#terms" className="hover:text-slate-900 transition-colors">Terms</a>
            <a href="#accessibility" className="hover:text-slate-900 transition-colors">Accessibility Statement</a>
          </div>
        </div>
      </footer>
    </div>
  );
};
