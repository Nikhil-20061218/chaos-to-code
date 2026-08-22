import React from 'react';
import { ArrowDown, Check, FileText, Sparkles, CheckSquare } from 'lucide-react';

export const WorkflowVisual: React.FC = () => {
  return (
    <div className="relative w-full max-w-md mx-auto lg:max-w-none">
      {/* Soft Ambient Background Glow */}
      <div
        className="absolute -inset-4 bg-gradient-to-tr from-brand-200/40 via-purple-100/30 to-indigo-100/40 rounded-3xl blur-2xl -z-10 opacity-70"
        aria-hidden="true"
      />

      {/* Main Workflow Container Card */}
      <div className="relative bg-gradient-to-b from-white/95 via-slate-50/90 to-white/95 border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-card-elevated backdrop-blur-xs">
        
        {/* Subtle Decorative Star Accent */}
        <div
          className="absolute -top-3 -left-3 p-1.5 rounded-full bg-white shadow-sm border border-slate-100 text-brand-500 animate-pulse"
          aria-hidden="true"
        >
          <Sparkles className="w-4 h-4" />
        </div>

        <div className="flex flex-col items-center space-y-3">
          
          {/* Card 1: Original Document */}
          <div className="w-full bg-white border border-slate-200/90 rounded-2xl p-4 shadow-card-soft flex items-center gap-4 hover:border-brand-300 transition-colors group">
            <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 group-hover:bg-brand-50 group-hover:text-brand-700 transition-colors flex-shrink-0 border border-slate-200/60">
              <FileText className="w-6 h-6" aria-hidden="true" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-bold text-slate-800 tracking-tight truncate">
                Original Document
              </h3>
              <p className="text-xs text-slate-400 font-medium">Form / PDF</p>
            </div>
          </div>

          {/* Connector Arrow 1 */}
          <div className="flex items-center justify-center text-brand-400 my-0.5" aria-hidden="true">
            <div className="w-0.5 h-3 bg-brand-200" />
            <ArrowDown className="w-4 h-4 text-brand-500 absolute" />
          </div>

          {/* Card 2: AI Analysis */}
          <div className="w-full bg-white border border-slate-200/90 rounded-2xl p-4 shadow-card-soft flex items-center gap-4 hover:border-brand-300 transition-colors group">
            <div className="w-12 h-12 rounded-xl bg-brand-50 flex items-center justify-center text-brand-700 group-hover:bg-brand-100 transition-colors flex-shrink-0 border border-brand-100">
              <Sparkles className="w-6 h-6" aria-hidden="true" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-bold text-slate-800 tracking-tight truncate">
                AI Analysis
              </h3>
              <p className="text-xs text-slate-400 font-medium">Vision</p>
            </div>
          </div>

          {/* Connector Arrow 2 */}
          <div className="flex items-center justify-center text-brand-400 my-0.5" aria-hidden="true">
            <div className="w-0.5 h-3 bg-brand-200" />
            <ArrowDown className="w-4 h-4 text-brand-500 absolute" />
          </div>

          {/* Card 3: Guided Accessible Form */}
          <div className="w-full bg-white border border-slate-200/90 rounded-2xl p-4 shadow-card-soft flex items-center gap-4 hover:border-brand-300 transition-colors group">
            <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700 group-hover:bg-brand-50 group-hover:text-brand-700 transition-colors flex-shrink-0 border border-slate-200/60">
              <CheckSquare className="w-6 h-6" aria-hidden="true" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-bold text-slate-800 tracking-tight truncate">
                Guided Accessible Form
              </h3>
              <p className="text-xs text-slate-400 font-medium">Step by step</p>
            </div>
          </div>

          {/* Connector Arrow 3 */}
          <div className="flex items-center justify-center text-brand-400 my-0.5" aria-hidden="true">
            <div className="w-0.5 h-3 bg-brand-200" />
            <ArrowDown className="w-4 h-4 text-brand-500 absolute" />
          </div>

          {/* Card 4: Completed PDF */}
          <div className="w-full bg-white border border-slate-200/90 rounded-2xl p-4 shadow-card-soft flex items-center gap-4 hover:border-brand-300 transition-colors group relative">
            <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center text-red-600 group-hover:bg-red-100 transition-colors flex-shrink-0 border border-red-100 font-bold text-xs">
              <span className="font-extrabold tracking-tighter">PDF</span>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-bold text-slate-800 tracking-tight truncate">
                Completed PDF
              </h3>
              <p className="text-xs text-slate-400 font-medium">Sign & DL</p>
            </div>
          </div>

        </div>

        {/* Floating Green Success Badge in Corner */}
        <div
          className="absolute -bottom-3 -right-3 w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-md border-2 border-white"
          aria-hidden="true"
          title="Conversion Successful"
        >
          <Check className="w-4 h-4 stroke-[3]" />
        </div>

      </div>
    </div>
  );
};
