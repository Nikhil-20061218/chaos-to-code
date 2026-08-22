import React from 'react';
import { Sparkles, Accessibility, Lock, Shield } from 'lucide-react';

export const TrustIndicators: React.FC = () => {
  const indicators = [
    {
      label: 'AI Powered',
      icon: <Sparkles className="w-4 h-4 text-brand-600" aria-hidden="true" />,
    },
    {
      label: 'Accessible',
      icon: <Accessibility className="w-4 h-4 text-brand-600" aria-hidden="true" />,
    },
    {
      label: 'Secure',
      icon: <Lock className="w-4 h-4 text-brand-600" aria-hidden="true" />,
    },
    {
      label: 'Private',
      icon: <Shield className="w-4 h-4 text-brand-600" aria-hidden="true" />,
    },
  ];

  return (
    <div
      role="list"
      aria-label="AccessAI Trust & Capabilities"
      className="flex flex-wrap items-center gap-x-6 gap-y-3 pt-2"
    >
      {indicators.map((item) => (
        <div
          key={item.label}
          role="listitem"
          className="inline-flex items-center gap-2 text-xs sm:text-sm font-medium text-slate-600 select-none"
        >
          <span className="p-1 rounded-md bg-brand-50 border border-brand-100 flex items-center justify-center">
            {item.icon}
          </span>
          <span>{item.label}</span>
        </div>
      ))}
    </div>
  );
};
