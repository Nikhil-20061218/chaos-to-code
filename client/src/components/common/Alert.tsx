import React from 'react';
import { AlertCircle, CheckCircle, Info } from 'lucide-react';

export interface AlertProps {
  variant?: 'error' | 'success' | 'info';
  children: React.ReactNode;
  className?: string;
}

export const Alert: React.FC<AlertProps> = ({
  variant = 'error',
  children,
  className = '',
}) => {
  const variantStyles = {
    error: 'bg-red-50/90 border-red-200 text-red-900',
    success: 'bg-emerald-50/90 border-emerald-200 text-emerald-900',
    info: 'bg-brand-50/90 border-brand-200 text-brand-950',
  };

  const iconStyles = {
    error: <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" aria-hidden="true" />,
    success: <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" aria-hidden="true" />,
    info: <Info className="w-5 h-5 text-brand-600 flex-shrink-0" aria-hidden="true" />,
  };

  const role = variant === 'error' ? 'alert' : 'status';

  return (
    <div
      role={role}
      aria-live={variant === 'error' ? 'assertive' : 'polite'}
      className={`p-3.5 rounded-xl border text-sm flex items-start gap-3 transition-all ${variantStyles[variant]} ${className}`}
    >
      {iconStyles[variant]}
      <div className="flex-1 font-medium">{children}</div>
    </div>
  );
};
