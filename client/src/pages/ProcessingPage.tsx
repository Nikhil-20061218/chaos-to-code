import React, { useEffect, useState } from 'react';
import { Sparkles, CheckCircle2, Loader2, AlertCircle, ArrowLeft, RefreshCw, Bot } from 'lucide-react';
import { BrandLogo } from '../components/landing/BrandLogo';
import { Button } from '../components/common/Button';
import { Alert } from '../components/common/Alert';
import { SkipLink } from '../components/accessibility/SkipLink';
import { documentService } from '../services/documentService';
import { ApiError } from '../services/apiClient';

interface ProcessingPageProps {
  documentId?: string;
  onNavigate?: (path: string, state?: Record<string, unknown>) => void;
}

export const ProcessingPage: React.FC<ProcessingPageProps> = ({
  documentId: propDocId,
  onNavigate,
}) => {
  // Resolve effective document ID from props, URL query parameter, or sessionStorage
  const resolvedDocId =
    propDocId ||
    new URLSearchParams(window.location.search).get('id') ||
    (typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('currentDocumentId') : null) ||
    '';

  const [statusStep, setStatusStep] = useState<number>(2); // 0..4
  const [progressPercent, setProgressPercent] = useState<number>(40);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(true);

  const navigate = (path: string, state?: Record<string, unknown>) => {
    if (onNavigate) {
      onNavigate(path, state);
    } else {
      window.location.hash = path.replace('/', '#');
    }
  };

  useEffect(() => {
    if (!resolvedDocId) {
      setError('No document found for analysis. Please upload a document first.');
      setIsProcessing(false);
      return;
    }

    let isMounted = true;

    // Simulated progress indicators while waiting for Gemini API response
    const timer1 = setTimeout(() => {
      if (isMounted && isProcessing) {
        setStatusStep(2);
        setProgressPercent(60);
      }
    }, 1200);

    const timer2 = setTimeout(() => {
      if (isMounted && isProcessing) {
        setStatusStep(3);
        setProgressPercent(82);
      }
    }, 2800);

    // Call real backend Gemini analysis
    const runAnalysis = async () => {
      try {
        const completedDoc = await documentService.analyzeDocument(resolvedDocId);
        if (!isMounted) return;

        setStatusStep(4);
        setProgressPercent(100);
        setIsProcessing(false);

        // Store analysis result in sessionStorage for reliable form rendering
        try {
          if (completedDoc.analysis) {
            sessionStorage.setItem(`form_${resolvedDocId}`, JSON.stringify(completedDoc.analysis));
          }
        } catch {
          // Safe fallback
        }

        // Navigate to Guided Form page
        setTimeout(() => {
          if (isMounted) {
            navigate(`/documents/${resolvedDocId}/form`, {
              documentId: resolvedDocId,
              document: completedDoc,
              analysis: completedDoc.analysis,
            });
          }
        }, 800);
      } catch (err: unknown) {
        if (!isMounted) return;
        setIsProcessing(false);
        if (err instanceof ApiError) {
          setError(err.message);
        } else if (err instanceof Error) {
          setError("We couldn't analyze your document. Please try again.");
        } else {
          setError("We couldn't analyze your document. Please try again.");
        }
      }
    };

    runAnalysis();

    return () => {
      isMounted = false;
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [resolvedDocId]);

  const steps = [
    { label: 'Document uploaded', done: statusStep >= 1 },
    { label: 'Reading document structure', done: statusStep >= 2 },
    { label: 'Extracting fields with Gemini AI', active: statusStep === 2, done: statusStep > 2 },
    { label: 'Building accessible form schema', active: statusStep === 3, done: statusStep > 3 },
    { label: 'Preparing your guided experience', active: statusStep === 4, done: statusStep >= 4 },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 selection:bg-brand-500 selection:text-white">
      {/* Keyboard Skip Link */}
      <SkipLink />

      {/* Header Bar */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-700 rounded-md p-1 -ml-1 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
              aria-label="AccessAI Dashboard"
            >
              <BrandLogo size="sm" />
            </button>

            <div className="hidden sm:flex items-center gap-2 text-xs font-semibold text-slate-400">
              <span>/</span>
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                className="hover:text-slate-700 transition-colors cursor-pointer"
              >
                Dashboard
              </button>
              <span>/</span>
              <span className="text-slate-800">Processing</span>
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/upload')}
            leftIcon={<ArrowLeft className="w-4 h-4" />}
            className="text-slate-600 hover:text-slate-900 text-xs"
          >
            Upload Another
          </Button>
        </div>
      </header>

      {/* Main Processing Container */}
      <main
        id="main-content"
        tabIndex={-1}
        className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-10 focus:outline-none"
      >
        <div className="max-w-2xl w-full bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-10 shadow-card-elevated space-y-8 text-center">
          
          {/* Header Title */}
          <div className="space-y-2">
            <div className="w-16 h-16 rounded-3xl bg-brand-50 text-brand-700 mx-auto flex items-center justify-center border border-brand-100 mb-3 shadow-sm">
              <Bot className="w-8 h-8 animate-pulse" aria-hidden="true" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Understanding your document...
            </h1>
            <p className="text-sm text-slate-500 font-medium max-w-md mx-auto">
              Our AI is analyzing your document structure and converting it into a plain-language guided form.
            </p>
          </div>

          {/* Error Banner if Analysis Fails */}
          {error && (
            <div className="space-y-4">
              <Alert variant="error">
                <div className="flex items-center gap-2 text-left">
                  <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-600" />
                  <span>{error}</span>
                </div>
              </Alert>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                <Button
                  variant="primary"
                  size="md"
                  onClick={() => window.location.reload()}
                  leftIcon={<RefreshCw className="w-4 h-4" />}
                  className="rounded-xl font-semibold"
                >
                  Try Again
                </Button>
                <Button
                  variant="secondary"
                  size="md"
                  onClick={() => navigate('/upload')}
                  className="rounded-xl font-medium"
                >
                  Upload a Different File
                </Button>
              </div>
            </div>
          )}

          {/* Progress & Step List when Processing */}
          {!error && (
            <div className="space-y-6 text-left max-w-lg mx-auto">
              {/* Animated Progress Bar */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-600">
                  <span className="flex items-center gap-1.5 text-brand-700">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>AI Processing</span>
                  </span>
                  <span>{progressPercent}%</span>
                </div>
                <div
                  role="progressbar"
                  aria-valuenow={progressPercent}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label="Document AI Analysis Progress"
                  className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200"
                >
                  <div
                    className="h-full bg-gradient-to-r from-brand-600 to-indigo-600 rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>

              {/* Step Checklist */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
                {steps.map((step, index) => (
                  <div key={step.label} className="flex items-center gap-3">
                    <div className="flex-shrink-0">
                      {step.done ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600" aria-hidden="true" />
                      ) : step.active ? (
                        <Loader2 className="w-5 h-5 text-brand-600 animate-spin" aria-hidden="true" />
                      ) : (
                        <div className="w-5 h-5 rounded-full border-2 border-slate-300 flex items-center justify-center text-[10px] font-bold text-slate-400">
                          {index + 1}
                        </div>
                      )}
                    </div>
                    <span
                      className={`text-xs sm:text-sm ${
                        step.done
                          ? 'font-medium text-slate-700'
                          : step.active
                          ? 'font-bold text-brand-900'
                          : 'font-normal text-slate-400'
                      }`}
                    >
                      {step.label}
                    </span>
                  </div>
                ))}
              </div>

              <p className="text-xs text-center text-slate-400">
                This may take a few moments. Please don&apos;t close this page.
              </p>
            </div>
          )}

        </div>
      </main>

      {/* Minimal Footer */}
      <footer role="contentinfo" className="py-4 border-t border-slate-200 bg-white text-center text-xs text-slate-500 font-medium">
        <p>© {new Date().getFullYear()} AccessAI. Universal digital accessibility for all.</p>
      </footer>
    </div>
  );
};
