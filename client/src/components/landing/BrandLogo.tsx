import React from 'react';

interface BrandLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const BrandLogo: React.FC<BrandLogoProps> = ({ className = '', size = 'md' }) => {
  const iconSize = size === 'sm' ? 'w-5 h-5' : size === 'lg' ? 'w-8 h-8' : 'w-6 h-6';
  const textSize = size === 'sm' ? 'text-lg' : size === 'lg' ? 'text-2xl' : 'text-xl';

  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      {/* 8-Pointed Geometric Sparkle Brand Mark */}
      <svg
        className={`${iconSize} text-brand-700 flex-shrink-0`}
        viewBox="0 0 24 24"
        fill="currentColor"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <path d="M12 0L13.8 8.2L22 10L13.8 11.8L12 20L10.2 11.8L2 10L10.2 8.2L12 0Z" />
        <path
          d="M12 5.5L13.2 10.8L18.5 12L13.2 13.2L12 18.5L10.8 13.2L5.5 12L10.8 10.8L12 5.5Z"
          fill="#8b5cf6"
          opacity="0.85"
        />
        <circle cx="12" cy="12" r="2" fill="#ffffff" />
      </svg>

      {/* Brand Text */}
      <span className={`${textSize} font-bold tracking-tight text-slate-900`}>
        Access<span className="text-brand-700">AI</span>
      </span>
    </div>
  );
};
