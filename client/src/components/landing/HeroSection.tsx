import React from 'react';
import { Button } from '../common/Button';
import { TrustIndicators } from './TrustIndicators';
import { WorkflowVisual } from './WorkflowVisual';

interface HeroSectionProps {
  onNavigate?: (path: string) => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ onNavigate }) => {
  const navigate = (path: string) => {
    if (onNavigate) {
      onNavigate(path);
    } else {
      window.location.hash = path.replace('/', '#');
    }
  };

  return (
    <section aria-labelledby="hero-title" className="relative pt-12 pb-20 md:pt-20 md:pb-28 overflow-hidden">
      {/* Background Soft Purple Glow Decor */}
      <div
        className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-brand-100/30 rounded-full blur-3xl -z-10 pointer-events-none"
        aria-hidden="true"
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          
          {/* Left Column: Hero Copy & Actions (7 cols on lg) */}
          <div className="lg:col-span-7 space-y-8 text-left">
            
            {/* Main Headline */}
            <h1
              id="hero-title"
              className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight leading-[1.12]"
            >
              Turn complex <br className="hidden sm:inline" />
              forms into{' '}
              <span className="text-brand-700 bg-gradient-to-r from-brand-700 to-brand-500 bg-clip-text text-transparent">
                simple conversations.
              </span>
            </h1>

            {/* Supporting Text */}
            <p className="text-lg sm:text-xl text-slate-600 font-normal leading-relaxed max-w-xl">
              AccessAI uses AI to transform difficult documents into clear, guided and accessible forms.
            </p>

            {/* CTA Action Buttons */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-2">
              <Button
                variant="primary"
                size="lg"
                onClick={() => navigate('/login')}
                className="rounded-xl px-7 py-4 text-base font-semibold shadow-md hover:shadow-lg transition-all"
              >
                Upload a Form
              </Button>

              <Button
                variant="secondary"
                size="lg"
                onClick={() => navigate('/login')}
                className="rounded-xl px-7 py-4 text-base font-medium border-slate-300 text-slate-700 hover:bg-slate-50 transition-all"
              >
                Continue as Guest
              </Button>
            </div>

            {/* Trust Badges */}
            <div className="pt-4 border-t border-slate-100">
              <TrustIndicators />
            </div>

          </div>

          {/* Right Column: Interactive Workflow Visual (5 cols on lg) */}
          <div className="lg:col-span-5 flex justify-center lg:justify-end">
            <WorkflowVisual />
          </div>

        </div>
      </div>
    </section>
  );
};
