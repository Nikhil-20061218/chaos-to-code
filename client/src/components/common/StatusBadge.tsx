import React from 'react';
import { CheckCircle2, Clock, AlertTriangle, FileCheck, CheckCheck, Loader2, UploadCloud } from 'lucide-react';

export type DocumentStatus =
  | 'uploaded'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'ready_for_review'
  | 'confirmed'
  | 'pdf_generated';

interface StatusBadgeProps {
  status: DocumentStatus | string;
  className?: string;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  className = '',
  size = 'md',
}) => {
  const normalized = (status || '').toLowerCase().replace(/\s+/g, '_');

  const config: Record<
    string,
    { label: string; bg: string; text: string; border: string; icon: React.ReactNode }
  > = {
    uploaded: {
      label: 'Uploaded',
      bg: 'bg-slate-100',
      text: 'text-slate-800',
      border: 'border-slate-200',
      icon: <UploadCloud className="w-3.5 h-3.5" aria-hidden="true" />,
    },
    processing: {
      label: 'Processing',
      bg: 'bg-amber-50',
      text: 'text-amber-800',
      border: 'border-amber-200',
      icon: <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />,
    },
    completed: {
      label: 'Completed',
      bg: 'bg-emerald-50',
      text: 'text-emerald-800',
      border: 'border-emerald-200',
      icon: <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />,
    },
    failed: {
      label: 'Failed',
      bg: 'bg-rose-50',
      text: 'text-rose-800',
      border: 'border-rose-200',
      icon: <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />,
    },
    ready_for_review: {
      label: 'Ready for Review',
      bg: 'bg-indigo-50',
      text: 'text-indigo-800',
      border: 'border-indigo-200',
      icon: <Clock className="w-3.5 h-3.5" aria-hidden="true" />,
    },
    confirmed: {
      label: 'Confirmed',
      bg: 'bg-teal-50',
      text: 'text-teal-800',
      border: 'border-teal-200',
      icon: <CheckCheck className="w-3.5 h-3.5" aria-hidden="true" />,
    },
    pdf_generated: {
      label: 'PDF Generated',
      bg: 'bg-brand-50',
      text: 'text-brand-800',
      border: 'border-brand-200',
      icon: <FileCheck className="w-3.5 h-3.5" aria-hidden="true" />,
    },
  };

  const item = config[normalized] || {
    label: status,
    bg: 'bg-slate-100',
    text: 'text-slate-800',
    border: 'border-slate-200',
    icon: <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />,
  };

  const sizeClasses =
    size === 'sm'
      ? 'px-2 py-0.5 text-xs gap-1 font-medium'
      : 'px-2.5 py-1 text-xs gap-1.5 font-semibold';

  return (
    <span
      role="status"
      aria-label={`Status: ${item.label}`}
      className={`inline-flex items-center rounded-full border ${item.bg} ${item.text} ${item.border} ${sizeClasses} select-none ${className}`}
    >
      {item.icon}
      <span>{item.label}</span>
    </span>
  );
};
