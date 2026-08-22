import React, { useEffect, useState } from 'react';
import { Eye, EyeOff, Sparkles, Shield, UserCheck, ArrowLeft } from 'lucide-react';
import { BrandLogo } from '../components/landing/BrandLogo';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { Alert } from '../components/common/Alert';
import { SkipLink } from '../components/accessibility/SkipLink';
import { authService } from '../services/authService';
import { ApiError } from '../services/apiClient';

interface LoginPageProps {
  onNavigate?: (path: string, state?: Record<string, unknown>) => void;
  successMessage?: string | null;
  initialEmail?: string;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  onNavigate,
  successMessage: initialSuccessMessage,
  initialEmail = '',
}) => {
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // Validation state
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(initialSuccessMessage || null);
  
  // Loading states
  const [isLoading, setIsLoading] = useState(false);
  const [isGuestLoading, setIsGuestLoading] = useState(false);

  useEffect(() => {
    setSuccessMessage(initialSuccessMessage || null);
  }, [initialSuccessMessage]);

  const navigate = (path: string, state?: Record<string, unknown>) => {
    if (onNavigate) {
      onNavigate(path, state);
    } else {
      window.location.hash = path.replace('/', '#');
    }
  };

  const validate = (): boolean => {
    let isValid = true;
    setEmailError(null);
    setPasswordError(null);
    setServerError(null);

    // Email validation
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setEmailError('Please enter your email address.');
      isValid = false;
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(trimmedEmail)) {
        setEmailError('Please enter a valid email address.');
        isValid = false;
      }
    }

    // Password validation
    if (!password) {
      setPasswordError('Please enter your password.');
      isValid = false;
    }

    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsLoading(true);
    setServerError(null);
    setSuccessMessage(null);

    try {
      await authService.login({
        email: email.trim(),
        password,
      });

      // Navigate to dashboard on successful login
      navigate('/dashboard');
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setServerError(err.message);
      } else if (err instanceof Error) {
        setServerError(err.message);
      } else {
        setServerError("We couldn't connect to AccessAI. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGuestContinue = async () => {
    setIsGuestLoading(true);
    setServerError(null);

    try {
      await authService.createGuestSession();
      // On guest session creation, proceed to dashboard
      navigate('/dashboard');
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setServerError(err.message);
      } else {
        setServerError("Couldn't start a guest session. Please try again.");
      }
    } finally {
      setIsGuestLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-white text-slate-900 selection:bg-brand-500 selection:text-white">
      {/* Keyboard Skip Link */}
      <SkipLink />

      {/* Top Simple Navigation */}
      <header className="w-full border-b border-slate-100 bg-white/95 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="flex items-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-700 rounded-md p-1 -ml-1 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
            aria-label="Back to AccessAI Home"
          >
            <BrandLogo size="md" />
          </button>

          <button
            type="button"
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-700 rounded-md px-2.5 py-1.5 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            <span>Back to Home</span>
          </button>
        </div>
      </header>

      {/* Main Content Landmark */}
      <main id="main-content" tabIndex={-1} className="flex-1 flex items-center justify-center py-10 px-4 sm:px-6 lg:px-8 focus:outline-none">
        
        {/* Subtle Ambient Background Glow */}
        <div
          className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[350px] bg-brand-100/35 rounded-full blur-3xl -z-10 pointer-events-none"
          aria-hidden="true"
        />

        <div className="max-w-5xl w-full grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          
          {/* Left Column: Product Branding & Visual (5 cols on desktop) */}
          <div className="hidden lg:flex lg:col-span-5 flex-col space-y-6 text-left pr-4">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-50 border border-brand-100 text-brand-700 text-xs font-semibold">
                <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
                <span>AI-Powered Accessibility</span>
              </div>
              <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight leading-tight">
                Making digital forms understandable for everyone.
              </h2>
              <p className="text-sm text-slate-600 leading-relaxed">
                AccessAI turns complex PDF, paper, and portal documents into plain-language, step-by-step guided forms.
              </p>
            </div>

            {/* Feature Highlights Card */}
            <div className="p-5 rounded-2xl bg-gradient-to-b from-slate-50 to-white border border-slate-200/80 shadow-card-soft space-y-3.5">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-brand-100 text-brand-700 mt-0.5">
                  <Sparkles className="w-4 h-4" aria-hidden="true" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Instant AI Simplification
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Clear plain language and guided multi-language translations.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 pt-2 border-t border-slate-100">
                <div className="p-2 rounded-lg bg-indigo-100 text-indigo-700 mt-0.5">
                  <Shield className="w-4 h-4" aria-hidden="true" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Privacy-Preserving
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Transient memory processing without permanent tracking.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Login Card (7 cols on desktop, centered on mobile) */}
          <div className="lg:col-span-7 flex justify-center">
            <div className="w-full max-w-md bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-card-elevated">
              
              {/* Header */}
              <div className="text-center space-y-1.5 mb-6">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                  Welcome back
                </h1>
                <p className="text-sm text-slate-600">
                  Sign in to continue your accessible form journey.
                </p>
              </div>

              {/* Success Feedback Alert (e.g. from registration) */}
              {successMessage && (
                <div className="mb-5">
                  <Alert variant="success">{successMessage}</Alert>
                </div>
              )}

              {/* Server Error Alert */}
              {serverError && (
                <div className="mb-5">
                  <Alert variant="error">{serverError}</Alert>
                </div>
              )}

              {/* Login Form */}
              <form onSubmit={handleSubmit} noValidate className="space-y-4.5">
                
                {/* Email Field */}
                <Input
                  id="login-email"
                  label="Email address"
                  type="email"
                  placeholder="Enter your email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (emailError) setEmailError(null);
                    if (serverError) setServerError(null);
                  }}
                  error={emailError || undefined}
                />

                {/* Password Field with Show/Hide Toggle */}
                <Input
                  id="login-password"
                  label="Password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (passwordError) setPasswordError(null);
                    if (serverError) setServerError(null);
                  }}
                  error={passwordError || undefined}
                  rightElement={
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      aria-pressed={showPassword}
                      className="p-2 text-slate-500 hover:text-slate-800 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-700 min-h-[40px] min-w-[40px] flex items-center justify-center cursor-pointer transition-colors"
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" aria-hidden="true" />
                      ) : (
                        <Eye className="w-4 h-4" aria-hidden="true" />
                      )}
                    </button>
                  }
                />

                {/* Submit Sign In Button */}
                <div className="pt-2">
                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    disabled={isLoading || isGuestLoading}
                    className="w-full justify-center rounded-xl py-3.5 text-base font-semibold shadow-sm hover:shadow"
                  >
                    {isLoading ? (
                      <span className="inline-flex items-center gap-2">
                        <svg
                          className="animate-spin h-4 w-4 text-white"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          aria-hidden="true"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          />
                        </svg>
                        <span>Signing in...</span>
                      </span>
                    ) : (
                      'Sign In'
                    )}
                  </Button>
                </div>

              </form>

              {/* Bottom Links Area */}
              <div className="mt-6 pt-5 border-t border-slate-100 space-y-4 text-center">
                
                {/* Register Link */}
                <p className="text-sm text-slate-600">
                  Don&apos;t have an account?{' '}
                  <button
                    type="button"
                    onClick={() => navigate('/register')}
                    className="font-semibold text-brand-700 hover:text-brand-800 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-700 rounded px-1 py-0.5 cursor-pointer"
                  >
                    Create an account
                  </button>
                </p>

                {/* Divider */}
                <div className="flex items-center gap-3">
                  <div className="flex-1 border-t border-slate-200" />
                  <span className="text-xs uppercase font-semibold text-slate-400">or</span>
                  <div className="flex-1 border-t border-slate-200" />
                </div>

                {/* Continue as Guest Button */}
                <Button
                  type="button"
                  variant="secondary"
                  size="md"
                  disabled={isLoading || isGuestLoading}
                  onClick={handleGuestContinue}
                  className="w-full justify-center text-slate-700 border-slate-300 hover:bg-slate-50 font-medium rounded-xl py-3"
                  leftIcon={<UserCheck className="w-4 h-4 text-slate-500" />}
                >
                  {isGuestLoading ? 'Starting Guest Session...' : 'Continue as Guest'}
                </Button>

              </div>

            </div>
          </div>

        </div>
      </main>

      {/* Minimal Footer */}
      <footer role="contentinfo" className="py-6 border-t border-slate-100 bg-slate-50/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 font-medium">
          <p>© {new Date().getFullYear()} AccessAI. Universal digital accessibility for all.</p>
          <div className="flex items-center gap-5">
            <a href="#privacy" className="hover:text-slate-900 transition-colors">Privacy</a>
            <a href="#terms" className="hover:text-slate-900 transition-colors">Terms</a>
            <a href="#accessibility" className="hover:text-slate-900 transition-colors">Accessibility</a>
          </div>
        </div>
      </footer>
    </div>
  );
};
