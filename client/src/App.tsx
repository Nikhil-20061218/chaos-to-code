import React, { useState, useEffect } from 'react';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { VerifyEmailPage } from './pages/VerifyEmailPage';
import { DashboardPage } from './pages/DashboardPage';
import { UploadPage } from './pages/UploadPage';
import { ProcessingPage } from './pages/ProcessingPage';
import { GuidedFormPage } from './pages/GuidedFormPage';
import { ReviewPage } from './pages/ReviewPage';

interface RouteState {
  verifiedEmail?: boolean;
  email?: string;
  documentId?: string;
  document?: unknown;
  [key: string]: unknown;
}

export const App: React.FC = () => {
  const [currentPath, setCurrentPath] = useState<string>(() => {
    const path = window.location.pathname;
    if (path === '/login' || window.location.hash === '#login') return '/login';
    if (path === '/register' || window.location.hash === '#register') return '/register';
    if (path === '/verify-email' || window.location.hash === '#verify-email') return '/verify-email';
    if (path === '/dashboard' || window.location.hash === '#dashboard') return '/dashboard';
    if (path === '/upload' || window.location.hash === '#upload') return '/upload';
    if (path === '/processing' || window.location.hash === '#processing') return '/processing';
    if (path.startsWith('/documents/') || window.location.hash.startsWith('#documents/')) return path || window.location.hash.replace('#', '/');
    return '/';
  });

  const [routeState, setRouteState] = useState<RouteState>({});

  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname;
      if (path === '/login' || window.location.hash === '#login') {
        setCurrentPath('/login');
      } else if (path === '/register' || window.location.hash === '#register') {
        setCurrentPath('/register');
      } else if (path === '/verify-email' || window.location.hash === '#verify-email') {
        setCurrentPath('/verify-email');
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
  const reviewMatch = currentPath.match(/\/documents\/([^/]+)\/review/);
  const docId = formMatch ? formMatch[1] : routeState.documentId;

  // Render Upload Page (Page 5 - Real Upload Page)
  if (currentPath === '/upload') {
    return <UploadPage onNavigate={navigate} />;
  }

  // Render Processing Page (Page 6 - Real Processing Page)
  if (currentPath === '/processing' || currentPath.startsWith('/processing?')) {
    return (
      <ProcessingPage
        documentId={routeState.documentId}
        onNavigate={navigate}
      />
    );
  }

  if (formMatch) {
    return <GuidedFormPage documentId={decodeURIComponent(docId || '')} onNavigate={navigate} />;
  }

  if (reviewMatch) {
    return <ReviewPage documentId={decodeURIComponent(reviewMatch[1] || '')} onNavigate={navigate} />;
  }

  // Render Dashboard Page (Page 4)
  if (currentPath === '/dashboard') {
    return <DashboardPage onNavigate={navigate} />;
  }

  // Render Register Page (Page 3)
  if (currentPath === '/register') {
    return <RegisterPage onNavigate={navigate} />;
  }

  if (currentPath === '/verify-email') {
    return <VerifyEmailPage onNavigate={navigate} initialEmail={routeState.email || ''} />;
  }

  // Render Login Page (Page 2)
  if (currentPath === '/login') {
    return (
      <LoginPage
        onNavigate={navigate}
        successMessage={
          routeState.verifiedEmail
            ? 'Email verified successfully. Please sign in.'
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
