import React, { forwardRef } from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  rightElement?: React.ReactNode;
  containerClassName?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      id,
      label,
      error,
      rightElement,
      className = '',
      containerClassName = '',
      type = 'text',
      required,
      ...props
    },
    ref
  ) => {
    const inputId = id || `input-${label.toLowerCase().replace(/\s+/g, '-')}`;
    const errorId = `${inputId}-error`;

    return (
      <div className={`space-y-1.5 text-left ${containerClassName}`}>
        <label
          htmlFor={inputId}
          className="block text-sm font-semibold text-slate-800 select-none"
        >
          {label}
          {required && <span className="text-brand-700 ml-1" aria-hidden="true">*</span>}
        </label>

        <div className="relative">
          <input
            ref={ref}
            id={inputId}
            name={inputId}
            type={type}
            required={required}
            aria-invalid={!!error}
            aria-describedby={error ? errorId : undefined}
            className={`w-full min-h-[46px] px-4 py-2.5 text-sm rounded-xl border bg-white text-slate-900 placeholder:text-slate-400 transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-brand-700 ${
              error
                ? 'border-red-400 focus-visible:ring-red-500 bg-red-50/20'
                : 'border-slate-300 hover:border-slate-400'
            } ${rightElement ? 'pr-12' : ''} ${className}`}
            {...props}
          />

          {rightElement && (
            <div className="absolute inset-y-0 right-0 pr-1.5 flex items-center">
              {rightElement}
            </div>
          )}
        </div>

        {error && (
          <p id={errorId} role="alert" className="text-xs font-medium text-red-600 flex items-center gap-1 mt-1">
            <span>{error}</span>
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
