import React from 'react';

export const SkipLink: React.FC = () => {
  return (
    <a
      href="#main-content"
      className="sr-only sr-only-focusable fixed top-3 left-3 z-50 bg-brand-700 text-white font-semibold px-4 py-2 rounded-md shadow-lg focus:not-sr-only focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-brand-700"
    >
      Skip to main content
    </a>
  );
};
