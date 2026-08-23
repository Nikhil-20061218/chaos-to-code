import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  FilePlus,
  FolderOpen,
  User,
  Settings,
  HelpCircle,
  LogOut,
  Upload,
  Sparkles,
  Menu,
  X,
  FileText,
  Loader2,
} from 'lucide-react';
import { BrandLogo } from '../components/landing/BrandLogo';
import { Button } from '../components/common/Button';
import { StatusBadge } from '../components/common/StatusBadge';
import { SkipLink } from '../components/accessibility/SkipLink';
import { authService } from '../services/authService';
import { documentService } from '../services/documentService';
import { UploadedDocument } from '../types/document';

interface DashboardPageProps {
  onNavigate?: (path: string) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigate }) => {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [documents, setDocuments] = useState<UploadedDocument[]>([]);
  const [isLoadingDocs, setIsLoadingDocs] = useState(true);

  const currentUser = authService.getCurrentUser();
  const userName = currentUser?.name || 'Guest User';
  const userInitial = userName.charAt(0).toUpperCase();

  useEffect(() => {
    let active = true;
    setIsLoadingDocs(true);
    documentService.getDocuments()
      .then((docs) => {
        if (active) {
          setDocuments(docs);
        }
      })
      .catch(() => {
        // Safe fallback
      })
      .finally(() => {
        if (active) {
          setIsLoadingDocs(false);
        }
      });
    return () => { active = false; };
  }, []);

  const navigate = (path: string) => {
    if (onNavigate) {
      onNavigate(path);
    } else {
      window.location.hash = path.replace('/', '#');
    }
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await authService.logout();
    } finally {
      setIsLoggingOut(false);
      navigate('/');
    }
  };

  const sidebarLinks = [
    { label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" />, active: true, path: '/dashboard' },
    { label: 'New Document', icon: <FilePlus className="w-4 h-4" />, active: false, path: '/upload' },
    { label: 'My Documents', icon: <FolderOpen className="w-4 h-4" />, active: false, path: '/dashboard' },
    { label: 'Profile', icon: <User className="w-4 h-4" />, active: false, path: '/settings' },
    { label: 'Settings', icon: <Settings className="w-4 h-4" />, active: false, path: '/settings' },
    { label: 'Help & Support', icon: <HelpCircle className="w-4 h-4" />, active: false, path: '/help' },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 selection:bg-brand-500 selection:text-white">
      {/* Keyboard Skip Link */}
      <SkipLink />

      {/* Top Header Bar */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo & Brand */}
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-700 rounded-md p-1 -ml-1 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
              aria-label="AccessAI Home"
            >
              <BrandLogo size="sm" />
            </button>
          </div>

          {/* Desktop User Info & Actions */}
          <div className="hidden sm:flex items-center gap-4">
            <div className="flex items-center gap-2.5 pl-3 border-l border-slate-200">
              <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 font-bold text-xs flex items-center justify-center border border-brand-200">
                {userInitial}
              </div>
              <div className="text-left">
                <p className="text-xs font-bold text-slate-800 leading-none truncate max-w-[150px]">
                  {userName}
                </p>
                <span className="text-[10px] text-slate-500 font-medium">
                  {currentUser?.email ? 'Authenticated' : 'Guest'}
                </span>
              </div>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              disabled={isLoggingOut}
              leftIcon={<LogOut className="w-3.5 h-3.5" />}
              className="text-slate-600 hover:text-red-600 hover:bg-red-50 text-xs"
            >
              {isLoggingOut ? 'Logging out...' : 'Logout'}
            </Button>
          </div>

          {/* Mobile Hamburger Button */}
          <div className="flex sm:hidden">
            <button
              type="button"
              onClick={() => setMobileNavOpen(!mobileNavOpen)}
              aria-expanded={mobileNavOpen}
              aria-label="Toggle navigation menu"
              className="p-2 text-slate-600 hover:text-slate-900 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-700 min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
            >
              {mobileNavOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileNavOpen && (
          <div className="sm:hidden border-b border-slate-200 bg-white px-4 py-4 space-y-3 shadow-lg">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <div className="w-9 h-9 rounded-full bg-brand-100 text-brand-700 font-bold text-sm flex items-center justify-center">
                {userInitial}
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800">{userName}</p>
                <p className="text-xs text-slate-500">{currentUser?.email || 'Guest Session'}</p>
              </div>
            </div>

            <nav aria-label="Mobile Dashboard Navigation" className="space-y-1">
              {sidebarLinks.map((link) => (
                <button
                  key={link.label}
                  type="button"
                  onClick={() => {
                    setMobileNavOpen(false);
                    navigate(link.path);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${link.active
                      ? 'bg-brand-50 text-brand-700 font-semibold'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                >
                  {link.icon}
                  <span>{link.label}</span>
                </button>
              ))}
            </nav>

            <div className="pt-2 border-t border-slate-100">
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                className="w-full justify-center text-red-600 border-red-200 hover:bg-red-50 text-xs py-2.5"
                leftIcon={<LogOut className="w-3.5 h-3.5" />}
              >
                Logout
              </Button>
            </div>
          </div>
        )}
      </header>

      {/* Main Dashboard Layout Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex-1 grid grid-cols-1 md:grid-cols-12 gap-8">

        {/* Desktop Sidebar Navigation (3 cols on md/lg) */}
        <aside aria-label="Dashboard Sidebar" className="hidden md:block md:col-span-3 space-y-6">
          <nav className="bg-white border border-slate-200/90 rounded-2xl p-3 shadow-card-soft space-y-1">
            {sidebarLinks.map((link) => (
              <button
                key={link.label}
                type="button"
                onClick={() => navigate(link.path)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all text-left cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-700 ${link.active
                    ? 'bg-brand-50 text-brand-700 font-semibold shadow-2xs'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
              >
                {link.icon}
                <span>{link.label}</span>
              </button>
            ))}
          </nav>

          {/* Quick Help Card */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-brand-50 via-purple-50 to-white border border-brand-100/80 shadow-2xs space-y-2 text-left">
            <div className="flex items-center gap-2 text-brand-800 font-bold text-xs">
              <Sparkles className="w-3.5 h-3.5 text-brand-600" />
              <span>Need Assistance?</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              AccessAI supports voice assistance, plain language translation, and high contrast settings.
            </p>
          </div>
        </aside>

        {/* Main Content Area (9 cols on md/lg) */}
        <main id="main-content" tabIndex={-1} className="md:col-span-9 space-y-6 text-left focus:outline-none">

          {/* Welcome Greeting */}
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <span>Welcome back, {userName.split(' ')[0]}</span>
              <span aria-hidden="true">👋</span>
            </h1>
            <p className="text-sm text-slate-600">
              Let&apos;s make your next form accessible and stress-free.
            </p>
          </div>

          {/* Main Hero Upload Callout Card */}
          <div className="relative overflow-hidden bg-gradient-to-r from-brand-700 via-brand-800 to-indigo-900 text-white rounded-3xl p-6 sm:p-8 shadow-card-elevated">
            {/* Ambient Background Blur Decor */}
            <div
              className="absolute -right-10 -bottom-10 w-64 h-64 bg-brand-500/30 rounded-full blur-3xl pointer-events-none"
              aria-hidden="true"
            />

            <div className="relative z-10 max-w-2xl space-y-4">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 text-brand-100 text-xs font-semibold backdrop-blur-xs">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Ready to convert</span>
              </div>

              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white leading-tight">
                Make your next form accessible.
              </h2>

              <p className="text-sm sm:text-base text-brand-100 leading-relaxed max-w-xl">
                Upload a PDF or image and let AccessAI turn it into a simple, guided, accessible form experience with voice and plain language guidance.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
                <Button
                  variant="primary"
                  size="lg"
                  onClick={() => navigate('/upload')}
                  className="bg-white text-brand-900 hover:bg-slate-100 font-bold rounded-xl px-6 py-3.5 shadow-md"
                  leftIcon={<Upload className="w-4 h-4 text-brand-700" />}
                >
                  Upload a Document
                </Button>

              </div>
            </div>
          </div>

          {/* Recent Documents Section */}
          <section aria-labelledby="recent-docs-heading" className="space-y-4 pt-2">
            <div className="flex items-center justify-between">
              <h2 id="recent-docs-heading" className="text-lg font-bold text-slate-900 tracking-tight">
                Recent Documents
              </h2>
            </div>

            {isLoadingDocs ? (
              <div className="bg-white border border-slate-200/90 rounded-3xl p-8 shadow-card-soft text-center text-sm text-slate-500">
                <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin text-brand-700" />
                Loading your documents...
              </div>
            ) : documents.length === 0 ? (
              /* Polished Empty State (No documents yet) */
              <div className="bg-white border border-slate-200/90 rounded-3xl p-8 sm:p-10 shadow-card-soft text-center space-y-6">
                <div className="max-w-md mx-auto space-y-2">
                  <div className="w-14 h-14 rounded-2xl bg-brand-50 text-brand-700 mx-auto flex items-center justify-center border border-brand-100">
                    <FileText className="w-7 h-7" aria-hidden="true" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-800 tracking-tight pt-2">
                    No documents yet
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
                    Upload your first document to get started. AccessAI will automatically parse, translate, and guide you through every field.
                  </p>
                </div>
                <div>
                  <Button
                    variant="primary"
                    size="md"
                    onClick={() => navigate('/upload')}
                    className="rounded-xl px-6 font-semibold"
                    leftIcon={<Upload className="w-4 h-4" />}
                  >
                    Upload Document
                  </Button>
                </div>
                {/* Visual 4-Step Journey */}
                <div className="pt-6 border-t border-slate-100">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">
                    How AccessAI Works
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-left">
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                      <span className="text-[10px] font-bold text-brand-600">Step 1</span>
                      <p className="text-xs font-bold text-slate-800">Upload</p>
                      <p className="text-[11px] text-slate-500">PDF or photo</p>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                      <span className="text-[10px] font-bold text-brand-600">Step 2</span>
                      <p className="text-xs font-bold text-slate-800">AI Analysis</p>
                      <p className="text-[11px] text-slate-500">Smart extraction</p>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                      <span className="text-[10px] font-bold text-brand-600">Step 3</span>
                      <p className="text-xs font-bold text-slate-800">Guided Form</p>
                      <p className="text-[11px] text-slate-500">Plain language</p>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                      <span className="text-[10px] font-bold text-brand-600">Step 4</span>
                      <p className="text-xs font-bold text-slate-800">Accessible PDF</p>
                      <p className="text-[11px] text-slate-500">Export & sign</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* Table list of documents */
              <div className="bg-white border border-slate-200/90 rounded-3xl overflow-hidden shadow-card-soft">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100">
                        <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider pl-6">Name</th>
                        <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Status</th>
                        <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider pr-6 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {documents.map((doc) => {
                        const isPdf = doc.mimeType === 'application/pdf' || doc.originalName.toLowerCase().endsWith('.pdf');
                        let actionLabel = 'Resume';
                        let actionPath = `/documents/${doc.id}/form`;
                        
                        if (doc.status === 'uploaded') {
                          actionLabel = 'Start Analysis';
                          actionPath = `/processing?id=${doc.id}`;
                        } else if (doc.status === 'completed') {
                          actionLabel = 'Guided Form';
                          actionPath = `/documents/${doc.id}/form`;
                        } else if (['confirmed', 'pdf_generated'].includes(doc.status)) {
                          actionLabel = 'Review & PDF';
                          actionPath = `/documents/${doc.id}/review`;
                        } else if (doc.status === 'failed') {
                          actionLabel = 'Re-upload';
                          actionPath = '/upload';
                        }
                        
                        return (
                          <tr key={doc.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="p-4 pl-6">
                              <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${isPdf ? 'bg-red-50 border-red-100 text-red-600' : 'bg-brand-50 border-brand-100 text-brand-700'}`}>
                                  <FileText className="w-4 h-4" />
                                </div>
                                <span className="text-sm font-bold text-slate-800 truncate max-w-[240px]" title={doc.originalName}>
                                  {doc.originalName}
                                </span>
                              </div>
                            </td>
                            <td className="p-4">
                              <StatusBadge status={doc.status} />
                            </td>
                            <td className="p-4 pr-6 text-right">
                              <Button
                                size="sm"
                                variant={doc.status === 'uploaded' ? 'primary' : 'outline'}
                                onClick={() => {
                                  if (doc.status === 'failed') {
                                    navigate('/upload');
                                  } else {
                                    if (doc.status === 'uploaded') {
                                      navigate(`/processing?id=${doc.id}`);
                                    } else {
                                      navigate(actionPath);
                                    }
                                  }
                                }}
                                className="rounded-lg text-xs font-semibold"
                              >
                                {actionLabel}
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </section>

          {/* Reusable Document Status System Preview */}
          <section aria-label="System Status Indicators" className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-card-soft space-y-3">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Document Lifecycle Status Badges
            </h3>
            <div className="flex flex-wrap gap-2">
              <StatusBadge status="uploaded" />
              <StatusBadge status="processing" />
              <StatusBadge status="completed" />
              <StatusBadge status="ready_for_review" />
              <StatusBadge status="confirmed" />
              <StatusBadge status="pdf_generated" />
              <StatusBadge status="failed" />
            </div>
          </section>

        </main>

      </div>
    </div>
  );
};
