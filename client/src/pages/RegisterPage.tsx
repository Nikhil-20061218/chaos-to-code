import React, { useState } from 'react';
import { Eye, EyeOff, Sparkles, Shield, UserCheck, ArrowLeft, Check, X } from 'lucide-react';
import { BrandLogo } from '../components/landing/BrandLogo';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { Alert } from '../components/common/Alert';
import { SkipLink } from '../components/accessibility/SkipLink';
import { authService } from '../services/authService';
import { ApiError } from '../services/apiClient';

interface RegisterPageProps {
  onNavigate?: (path: string, state?: Record<string, unknown>) => void;
}

export const RegisterPage: React.FC<RegisterPageProps> = ({ onNavigate }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Field validation errors
  const [nameError, setNameError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [confirmPasswordError, setConfirmPasswordError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  // Loading states
  const [isLoading, setIsLoading] = useState(false);
  const [isGuestLoading, setIsGuestLoading] = useState(false);

  const navigate = (path: string, state?: Record<string, unknown>) => {
    if (onNavigate) {
      onNavigate(path, state);
    } else {
      window.location.hash = path.replace('/', '#');
    }
  };

  // Real-time password criteria
  const passwordCriteria = {
    hasMinLength: password.length >= 12,
    hasUpper: /[A-Z]/.test(password),
    hasLower: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
  };

  const isPasswordValid =
    passwordCriteria.hasMinLength &&
    passwordCriteria.hasUpper &&
    passwordCriteria.hasLower &&
    passwordCriteria.hasNumber;

  const validate = (): boolean => {
    let isValid = true;
    setNameError(null);
    setEmailError(null);
    setPasswordError(null);
    setConfirmPasswordError(null);
    setServerError(null);

    // Full name validation
    const trimmedName = name.trim();
    if (!trimmedName) {
      setNameError('Please enter your full name.');
      isValid = false;
    } else if (trimmedName.length < 2 || trimmedName.length > 100) {
      setNameError('Full name must be between 2 and 100 characters.');
      isValid = false;
    }

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
      setPasswordError('Please create a password.');
      isValid = false;
    } else if (!isPasswordValid) {
      setPasswordError('Please meet all password security requirements.');
      isValid = false;
    }

    // Confirm password validation
    if (!confirmPassword) {
      setConfirmPasswordError('Please confirm your password.');
      isValid = false;
    } else if (password !== confirmPassword) {
      setConfirmPasswordError('Passwords do not match.');
      isValid = false;
    }

    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsLoading(true);
    setServerError(null);

    try {
      await authService.register({
        name: name.trim(),
        email: email.trim(),
        password,
      });

      // New accounts must verify the email before they can sign in.
      navigate('/verify-email', {
        email: email.trim(),
      });
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        if (err.status === 409) {
          setServerError('An account with this email already exists.');
        } else if (err.status === 400) {
          setServerError(err.message || 'Please check your information and try again.');
        } else if (err.status === 429) {
          setServerError('Too many attempts. Please try again later.');
        } else {
          setServerError(err.message || "We couldn't connect to AccessAI. Please try again.");
        }
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
      <main
        id="main-content"
        tabIndex={-1}
        className="flex-1 flex items-center justify-center py-10 px-4 sm:px-6 lg:px-8 focus:outline-none"
      >
        {/* Ambient Glow */}
        <div
          className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[350px] bg-brand-100/35 rounded-full blur-3xl -z-10 pointer-events-none"
          aria-hidden="true"
        />

        <div className="max-w-5xl w-full grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          {/* Left Column: Product Branding & Explanation */}
          <div className="hidden lg:flex lg:col-span-5 flex-col space-y-6 text-left pr-4">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-50 border border-brand-100 text-brand-700 text-xs font-semibold">
                <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Join AccessAI Today</span>
              </div>
              <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight leading-tight">
                Your accessible form assistant, always ready.
              </h2>
              <p className="text-sm text-slate-600 leading-relaxed">
                Create a free account to securely save your form progress, resume anytime, and export filled PDFs effortlessly.
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
                    Automatic Form Conversion
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Transforms scanned PDFs & photos into clean, guided interactive forms.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 pt-2 border-t border-slate-100">
                <div className="p-2 rounded-lg bg-indigo-100 text-indigo-700 mt-0.5">
                  <Shield className="w-4 h-4" aria-hidden="true" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Secure & Private
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    End-to-end encrypted sessions and transient document cleanup.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Registration Card */}
          <div className="lg:col-span-7 flex justify-center">
            <div className="w-full max-w-md bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-card-elevated">
              
              {/* Header */}
              <div className="text-center space-y-1.5 mb-6">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                  Create your AccessAI account
                </h1>
                <p className="text-sm text-slate-600">
                  Save your progress and access your accessible forms securely.
                </p>
              </div>

              {/* Server Error Alert */}
              {serverError && (
                <div className="mb-5">
                  <Alert variant="error">{serverError}</Alert>
                </div>
              )}

              {/* Registration Form */}
              <form onSubmit={handleSubmit} noValidate className="space-y-4">
                
                {/* Full Name Field */}
                <Input
                  id="register-name"
                  label="Full name"
                  type="text"
                  placeholder="Enter your full name"
                  autoComplete="name"
                  required
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (nameError) setNameError(null);
                    if (serverError) setServerError(null);
                  }}
                  error={nameError || undefined}
                />

                {/* Email Field */}
                <Input
                  id="register-email"
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
                <div className="space-y-2">
                  <Input
                    id="register-password"
                    label="Password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Create a password"
                    autoComplete="new-password"
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

                  {/* Password Security Criteria Indicator */}
                  {password.length > 0 && (
                    <div
                      role="region"
                      aria-label="Password Security Checklist"
                      className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs space-y-1.5 text-slate-600"
                    >
                      <p className="font-semibold text-slate-700">Password must contain:</p>
                      <div className="grid grid-cols-2 gap-1.5">
                        <div className="flex items-center gap-1.5">
                          {passwordCriteria.hasMinLength ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" aria-hidden="true" />
                          ) : (
                            <X className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" aria-hidden="true" />
                          )}
                          <span className={passwordCriteria.hasMinLength ? 'text-emerald-700 font-medium' : ''}>
                            12+ characters
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {passwordCriteria.hasUpper ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" aria-hidden="true" />
                          ) : (
                            <X className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" aria-hidden="true" />
                          )}
                          <span className={passwordCriteria.hasUpper ? 'text-emerald-700 font-medium' : ''}>
                            Uppercase (A-Z)
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {passwordCriteria.hasLower ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" aria-hidden="true" />
                          ) : (
                            <X className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" aria-hidden="true" />
                          )}
                          <span className={passwordCriteria.hasLower ? 'text-emerald-700 font-medium' : ''}>
                            Lowercase (a-z)
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {passwordCriteria.hasNumber ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" aria-hidden="true" />
                          ) : (
                            <X className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" aria-hidden="true" />
                          )}
                          <span className={passwordCriteria.hasNumber ? 'text-emerald-700 font-medium' : ''}>
                            Number (0-9)
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Confirm Password Field */}
                <Input
                  id="register-confirm-password"
                  label="Confirm password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Re-enter your password"
                  autoComplete="new-password"
                  required
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (confirmPasswordError) setConfirmPasswordError(null);
                    if (serverError) setServerError(null);
                  }}
                  error={confirmPasswordError || undefined}
                  rightElement={
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                      aria-pressed={showConfirmPassword}
                      className="p-2 text-slate-500 hover:text-slate-800 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-700 min-h-[40px] min-w-[40px] flex items-center justify-center cursor-pointer transition-colors"
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="w-4 h-4" aria-hidden="true" />
                      ) : (
                        <Eye className="w-4 h-4" aria-hidden="true" />
                      )}
                    </button>
                  }
                />

                {/* Submit Create Account Button */}
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
                        <span>Creating account...</span>
                      </span>
                    ) : (
                      'Create Account'
                    )}
                  </Button>
                </div>

              </form>

              {/* Bottom Links Area */}
              <div className="mt-6 pt-5 border-t border-slate-100 space-y-4 text-center">
                {/* Sign In Link */}
                <p className="text-sm text-slate-600">
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => navigate('/login')}
                    className="font-semibold text-brand-700 hover:text-brand-800 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-700 rounded px-1 py-0.5 cursor-pointer"
                  >
                    Sign in
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
