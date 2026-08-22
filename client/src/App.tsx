import React, { useState, useEffect } from 'react';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { DashboardPage } from './pages/DashboardPage';
import { UploadPage } from './pages/UploadPage';
import { ProcessingPage } from './pages/ProcessingPage';
import { BrandLogo } from './components/landing/BrandLogo';
import { Button } from './components/common/Button';
import { ArrowLeft, CheckCircle2, FileText, Sparkles } from 'lucide-react';
import { documentService, AccessibilityTask } from './services/documentService';

interface RouteState {
  registeredSuccess?: boolean;
  email?: string;
  documentId?: string;
  document?: unknown;
  analysis?: AccessibilityTask;
  [key: string]: unknown;
}

export const App: React.FC = () => {
  const [currentPath, setCurrentPath] = useState<string>(() => {
    const path = window.location.pathname;
    if (path === '/login' || window.location.hash === '#login') return '/login';
    if (path === '/register' || window.location.hash === '#register') return '/register';
    if (path === '/dashboard' || window.location.hash === '#dashboard') return '/dashboard';
    if (path === '/upload' || window.location.hash === '#upload') return '/upload';
    if (path === '/processing' || window.location.hash === '#processing') return '/processing';
    if (path.startsWith('/documents/') || window.location.hash.startsWith('#documents/')) return path || window.location.hash.replace('#', '/');
    return '/';
  });

  const [routeState, setRouteState] = useState<RouteState>({});
  const [taskData, setTaskData] = useState<AccessibilityTask | null>(null);
  const [taskLoading, setTaskLoading] = useState<boolean>(false);
  const [taskError, setTaskError] = useState<string | null>(null);

  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname;
      if (path === '/login' || window.location.hash === '#login') {
        setCurrentPath('/login');
      } else if (path === '/register' || window.location.hash === '#register') {
        setCurrentPath('/register');
      } else if (path === '/dashboard' || window.location.hash === '#dashboard') {
        setCurrentPath('/dashboard');
      } else if (path === '/upload' || window.location.hash === '#upload') {
        setCurrentPath('/upload');
      } else if (path === '/processing' || window.location.hash === '#processing') {
        setCurrentPath('/processing');
      } else if (path.startsWith('/documents/') || window.location.hash.startsWith('#documents/')) {
        setCurrentPath(path || window.location.hash.replace('#', '/'));
      } else {
        setCurrentPath('/');
      }
    };

    window.addEventListener('popstate', handlePopState);
    window.addEventListener('hashchange', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('hashchange', handlePopState);
    };
  }, []);

  const navigate = (path: string, state?: Record<string, unknown>) => {
    setCurrentPath(path);
    if (state) {
      setRouteState(state);
    } else {
      setRouteState({});
    }

    try {
      window.history.pushState(state || {}, '', path);
    } catch {
      window.location.hash = path.replace('/', '#');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Helper to extract documentId from URL (e.g. /documents/65b.../form)
  const formMatch = currentPath.match(/\/documents\/([^/]+)\/form/);
  const docId = formMatch ? formMatch[1] : routeState.documentId;

  useEffect(() => {
    if (formMatch && docId) {
      if (routeState.analysis) {
        setTaskData(routeState.analysis as AccessibilityTask);
      } else {
        setTaskLoading(true);
        documentService
          .getForm(docId)
          .then((form) => {
            setTaskData(form);
            setTaskLoading(false);
          })
          .catch((_err) => {
            setTaskError("We couldn't load the form structure. Please try again.");
            setTaskLoading(false);
          });
      }
    }
  }, [currentPath, docId, routeState.analysis]);

  // Render Upload Page (Page 5 - Real Upload Page)
  if (currentPath === '/upload') {
    return <UploadPage onNavigate={navigate} />;
  }

  // Render Processing Page (Page 6 - Real Processing Page)
  if (currentPath === '/processing') {
    return (
      <ProcessingPage
        documentId={routeState.documentId}
        onNavigate={navigate}
      />
    );
  }

  // Render Guided Form Verification Preview on /documents/:id/form
  if (formMatch) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 selection:bg-brand-500 selection:text-white">
        <header className="w-full border-b border-slate-200 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-700 rounded-md p-1"
            >
              <BrandLogo size="sm" />
            </button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/dashboard')}
              leftIcon={<ArrowLeft className="w-4 h-4" />}
            >
              Dashboard
            </Button>
          </div>
        </header>

        <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-card-soft space-y-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900">
                  {taskData?.title || 'Accessible Guided Form'}
                </h1>
                <p className="text-xs text-slate-500">
                  Document ID: <code className="font-mono text-brand-700">{docId}</code> | Language: <span className="font-semibold uppercase">{taskData?.language || 'en'}</span>
                </p>
              </div>
            </div>

            {taskLoading && (
              <div className="py-12 text-center text-slate-500 text-sm">
                Loading accessibility task schema...
              </div>
            )}

            {taskError && (
              <div className="p-4 rounded-xl bg-red-50 text-red-700 text-sm">
                {taskError}
              </div>
            )}

            {taskData && (
              <div className="space-y-6">
                <div className="p-4 rounded-2xl bg-brand-50/50 border border-brand-100 text-xs text-brand-900 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-brand-600 flex-shrink-0" />
                  <span>
                    Successfully extracted <strong>{taskData.sections.length} sections</strong> and <strong>{taskData.sections.reduce((acc, s) => acc + s.fields.length, 0)} accessible fields</strong> via Gemini AI.
                  </span>
                </div>

                {/* Form Sections Preview */}
                <div className="space-y-4">
                  {taskData.sections.map((section, sIndex) => (
                    <div key={section.id} className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
                      <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                        <h2 className="text-sm font-bold text-slate-800">
                          Section {sIndex + 1}: {section.title}
                        </h2>
                        <span className="text-xs font-semibold text-slate-400">
                          {section.fields.length} fields
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {section.fields.map((field) => (
                          <div key={field.id} className="p-3 bg-white border border-slate-200 rounded-xl space-y-1 text-left">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-slate-800 truncate" title={field.label}>
                                {field.label}
                              </span>
                              {field.required && (
                                <span className="text-[10px] font-bold text-brand-700 bg-brand-50 px-1.5 py-0.5 rounded">
                                  Required
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-500 italic">
                              &ldquo;{field.simpleLabel}&rdquo;
                            </p>
                            <div className="flex items-center gap-2 text-[10px] text-slate-400">
                              <span className="font-mono bg-slate-100 px-1 rounded">{field.type}</span>
                              {field.help && <span className="truncate">{field.help}</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
              <Button
                variant="secondary"
                size="md"
                onClick={() => navigate('/upload')}
                leftIcon={<FileText className="w-4 h-4" />}
                className="w-full sm:w-auto"
              >
                Upload Another Document
              </Button>
              <Button
                variant="primary"
                size="md"
                onClick={() => navigate('/dashboard')}
                className="w-full sm:w-auto"
              >
                Return to Dashboard
              </Button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Render Dashboard Page (Page 4)
  if (currentPath === '/dashboard') {
    return <DashboardPage onNavigate={navigate} />;
  }

  // Render Register Page (Page 3)
  if (currentPath === '/register') {
    return <RegisterPage onNavigate={navigate} />;
  }

  // Render Login Page (Page 2)
  if (currentPath === '/login') {
    return (
      <LoginPage
        onNavigate={navigate}
        successMessage={
          routeState.registeredSuccess
            ? 'Account created successfully. Please sign in.'
            : undefined
        }
        initialEmail={routeState.email || ''}
      />
    );
  }

  // Default: Landing Page (Page 1)
  return <LandingPage onNavigate={navigate} />;
};

export default App;
