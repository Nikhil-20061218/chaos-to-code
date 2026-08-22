import React, { useEffect, useState } from 'react';
import { ArrowLeft, CheckCircle2, Download, Loader2 } from 'lucide-react';
import { Alert } from '../components/common/Alert';
import { Button } from '../components/common/Button';
import { SkipLink } from '../components/accessibility/SkipLink';
import { BrandLogo } from '../components/landing/BrandLogo';
import { DocumentReview, documentService } from '../services/documentService';

interface ReviewPageProps {
  documentId: string;
  onNavigate: (path: string) => void;
}

export const ReviewPage: React.FC<ReviewPageProps> = ({ documentId, onNavigate }) => {
  const [review, setReview] = useState<DocumentReview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [action, setAction] = useState<'idle' | 'confirming' | 'generating' | 'confirmed' | 'ready' | 'downloading'>('idle');

  useEffect(() => {
    let active = true;
    documentService.getReview(documentId).then((data) => {
      if (active) setReview(data);
    }).catch(() => {
      if (active) setError("We couldn't load your review. Please try again.");
    });
    return () => { active = false; };
  }, [documentId]);

  const confirmAndGenerate = async () => {
    setActionError(null);
    setAction('confirming');
    try {
      await documentService.confirmReview(documentId);
    } catch {
      setAction('idle');
      setActionError('Unable to confirm your answers. Please try again.');
      return;
    }

    setAction('generating');
    try {
      await documentService.generatePdf(documentId);
      setAction('ready');
    } catch {
      setAction('confirmed');
      setActionError("Your answers were confirmed, but we couldn't generate the PDF. Please try again.");
    }
  };

  const generatePdf = async () => {
    setActionError(null);
    setAction('generating');
    try {
      await documentService.generatePdf(documentId);
      setAction('ready');
    } catch {
      setAction('confirmed');
      setActionError("Your answers were confirmed, but we couldn't generate the PDF. Please try again.");
    }
  };

  const downloadPdf = async () => {
    setActionError(null);
    setAction('downloading');
    try {
      await documentService.downloadPdf(documentId);
      setAction('ready');
    } catch {
      setAction('ready');
      setActionError('Unable to download the PDF. Please try again.');
    }
  };

  return <div className="min-h-screen bg-slate-50 text-slate-900">
    <SkipLink />
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white">
      <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4 sm:px-6">
        <button type="button" onClick={() => onNavigate('/dashboard')} className="rounded-md p-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-700" aria-label="AccessAI Dashboard"><BrandLogo size="sm" /></button>
        <Button variant="ghost" size="sm" onClick={() => onNavigate(`/documents/${encodeURIComponent(documentId)}/form`)} leftIcon={<ArrowLeft className="h-4 w-4" />}>Back to form</Button>
      </div>
    </header>
    <main id="main-content" tabIndex={-1} className="mx-auto max-w-4xl space-y-6 p-4 sm:p-6 focus:outline-none">
      {!review && !error && <div className="py-20 text-center text-sm font-medium text-slate-600"><Loader2 className="mx-auto mb-3 h-6 w-6 animate-spin text-brand-700" aria-hidden="true" />Loading your review...</div>}
      {error && <Alert variant="error">{error}</Alert>}
      {review && <>
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-card-soft sm:p-8">
          <div className="flex items-start gap-3"><CheckCircle2 className="mt-1 h-6 w-6 text-emerald-600" aria-hidden="true" /><div><h1 className="text-2xl font-extrabold">Review your answers</h1><p className="mt-1 text-sm text-slate-600">{review.title}</p></div></div>
        </section>
        {!review.complete && <Alert variant="error">Some required answers are missing. Return to the form to complete them.</Alert>}
        {review.sections.map((section) => <section key={section.id} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-card-soft sm:p-8"><h2 className="text-lg font-bold">{section.title}</h2><dl className="mt-4 divide-y divide-slate-200">{section.fields.map((field) => <div key={field.id} className="py-3"><dt className="text-sm font-semibold text-slate-800">{field.label}{field.required && <span className="ml-1 text-red-700">*</span>}</dt><dd className="mt-1 text-sm text-slate-600">{field.answer === true ? 'Yes' : field.answer === false ? 'No' : field.answer ?? 'Not provided'}</dd></div>)}</dl></section>)}
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-card-soft sm:p-8">
          <div aria-live="polite" className="min-h-6 text-sm font-medium text-slate-700">
            {action === 'confirming' && 'Confirming your answers...'}
            {action === 'generating' && 'Generating your completed PDF...'}
            {action === 'downloading' && 'Preparing your download...'}
          </div>
          {actionError && <Alert variant="error" className="mt-4">{actionError}</Alert>}
          {action === 'ready' && <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4"><div className="flex items-start gap-3"><CheckCircle2 className="mt-0.5 h-5 w-5 flex-none text-emerald-700" aria-hidden="true" /><div><h2 className="font-bold text-emerald-950">Your document is ready</h2><p className="mt-1 text-sm text-emerald-900">Your completed accessible PDF has been generated.</p></div></div></div>}
          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
            <Button variant="secondary" onClick={() => onNavigate(`/documents/${encodeURIComponent(documentId)}/form`)} disabled={action === 'confirming' || action === 'generating' || action === 'downloading'} leftIcon={<ArrowLeft className="h-4 w-4" />}>Back to form</Button>
            {!review.complete ? null : action === 'ready' || action === 'downloading' ? <Button onClick={() => void downloadPdf()} disabled={action === 'downloading'} leftIcon={<Download className="h-4 w-4" />}>{action === 'downloading' ? 'Downloading...' : 'Download PDF'}</Button>
              : action === 'confirmed' || action === 'generating' ? <Button onClick={() => void generatePdf()} disabled={action === 'generating'}>{action === 'generating' ? 'Generating your completed PDF...' : 'Generate PDF'}</Button>
                : <Button onClick={() => void confirmAndGenerate()} disabled={action === 'confirming'}>{action === 'confirming' ? 'Confirming your answers...' : 'Confirm & Continue'}</Button>}
          </div>
        </section>
      </>}
    </main>
  </div>;
};
