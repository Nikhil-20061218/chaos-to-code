import React, { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Alert } from '../components/common/Alert';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { BrandLogo } from '../components/landing/BrandLogo';
import { SkipLink } from '../components/accessibility/SkipLink';
import { authService } from '../services/authService';
import { ApiError } from '../services/apiClient';

interface VerifyEmailPageProps {
  onNavigate?: (path: string, state?: Record<string, unknown>) => void;
  initialEmail?: string;
}

export const VerifyEmailPage: React.FC<VerifyEmailPageProps> = ({ onNavigate, initialEmail = '' }) => {
  const [email, setEmail] = useState(initialEmail);
  const [otp, setOtp] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState('Account created. Check your email for a 6-digit verification code.');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);

  const navigate = (path: string, state?: Record<string, unknown>) => {
    if (onNavigate) onNavigate(path, state);
    else window.location.hash = path.replace('/', '#');
  };

  const handleVerify = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setNotice('');
    if (!email.trim() || !/^\d{6}$/.test(otp.trim())) {
      setError('Enter your email address and the 6-digit verification code.');
      return;
    }

    setIsVerifying(true);
    try {
      await authService.verifyEmail({ email, otp });
      navigate('/login', { verifiedEmail: true, email: email.trim() });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to verify your email. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    setError(null);
    setNotice('');
    if (!email.trim()) {
      setError('Enter your email address before requesting another code.');
      return;
    }

    setIsResending(true);
    try {
      const result = await authService.resendOtp(email);
      setNotice(result.message);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to send another code. Please try again.');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <SkipLink />
      <header className="border-b border-slate-100 bg-white">
        <div className="mx-auto flex h-18 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <button type="button" onClick={() => navigate('/')} aria-label="Back to AccessAI Home" className="rounded-md p-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-700"><BrandLogo size="md" /></button>
          <button type="button" onClick={() => navigate('/register')} className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium text-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-700"><ArrowLeft className="h-4 w-4" aria-hidden="true" />Back to registration</button>
        </div>
      </header>
      <main id="main-content" tabIndex={-1} className="mx-auto flex min-h-[calc(100vh-73px)] max-w-md items-center px-4 py-10 focus:outline-none">
        <section className="w-full rounded-3xl border border-slate-200 p-6 shadow-card-elevated sm:p-8" aria-labelledby="verify-heading">
          <h1 id="verify-heading" className="text-2xl font-extrabold tracking-tight">Verify your email</h1>
          <p className="mt-2 text-sm text-slate-600">Enter the code sent to your email address to activate your account.</p>
          {notice && <div className="mt-5"><Alert variant="success">{notice}</Alert></div>}
          {error && <div className="mt-5"><Alert variant="error">{error}</Alert></div>}
          <form onSubmit={handleVerify} noValidate className="mt-6 space-y-4">
            <Input id="verify-email" label="Email address" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
            <Input id="verification-code" label="6-digit verification code" type="text" inputMode="numeric" autoComplete="one-time-code" required maxLength={6} value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g, ''))} />
            <Button type="submit" size="lg" className="w-full justify-center" disabled={isVerifying || isResending}>{isVerifying ? 'Verifying…' : 'Verify email'}</Button>
          </form>
          <Button type="button" variant="secondary" size="md" className="mt-4 w-full justify-center" disabled={isVerifying || isResending} onClick={handleResend}>{isResending ? 'Sending code…' : 'Send a new code'}</Button>
        </section>
      </main>
    </div>
  );
};
