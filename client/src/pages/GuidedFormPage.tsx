import React, { useEffect, useState } from 'react';
import { ArrowLeft, CheckCircle2, ChevronLeft, ChevronRight, Loader2, Save } from 'lucide-react';
import { BrandLogo } from '../components/landing/BrandLogo';
import { Alert } from '../components/common/Alert';
import { Button } from '../components/common/Button';
import { SkipLink } from '../components/accessibility/SkipLink';
import { VoiceAssistance } from '../components/accessibility/VoiceAssistance';
import { AccessibilityTask, FormAnswer, FormAnswers, documentService } from '../services/documentService';

interface GuidedFormPageProps {
  documentId: string;
  onNavigate: (path: string) => void;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^[0-9+()\-\s]{3,30}$/;

const isBlank = (value: FormAnswer | undefined) => value === undefined || (typeof value === 'string' && value.trim() === '');

function isValidDate(value: FormAnswer | undefined): boolean {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export const GuidedFormPage: React.FC<GuidedFormPageProps> = ({ documentId, onNavigate }) => {
  const [form, setForm] = useState<AccessibilityTask | null>(null);
  const [answers, setAnswers] = useState<FormAnswers>({});
  const [sectionIndex, setSectionIndex] = useState(0);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeFieldId, setActiveFieldId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadError(null);
    Promise.all([documentService.getForm(documentId), documentService.getAnswers(documentId)])
      .then(([loadedForm, loadedAnswers]) => {
        if (!active) return;
        setForm(loadedForm);
        setAnswers(loadedAnswers);
      })
      .catch(() => {
        if (active) setLoadError("We couldn't load this form. Please try again.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [documentId]);

  const currentSection = form?.sections[sectionIndex];
  const activeField = currentSection?.fields.find((field) => field.id === activeFieldId);

  const updateAnswer = (id: string, value: FormAnswer) => {
    setAnswers((current) => ({ ...current, [id]: value }));
    setFieldErrors((current) => {
      const { [id]: _removed, ...remaining } = current;
      return remaining;
    });
    setSaveSuccess(null);
  };

  const payload = (): FormAnswers => Object.fromEntries(
    Object.entries(answers).filter(([, value]) => typeof value === 'boolean' || !isBlank(value)),
  );

  const validateCurrentSection = () => {
    if (!currentSection) return false;
    const errors: Record<string, string> = {};
    currentSection.fields.forEach((field) => {
      const value = answers[field.id];
      const missingRequiredValue = field.required && (isBlank(value) || (field.type === 'checkbox' && value !== true));
      if (missingRequiredValue) {
        errors[field.id] = 'This field is required.';
        return;
      }

      if (isBlank(value) || field.type === 'checkbox') return;
      if (field.type === 'email' && (typeof value !== 'string' || !EMAIL_PATTERN.test(value.trim()))) {
        errors[field.id] = 'Enter a valid email address.';
      } else if (field.type === 'tel' && (typeof value !== 'string' || !PHONE_PATTERN.test(value.trim()))) {
        errors[field.id] = 'Enter a valid phone number.';
      } else if (field.type === 'number' && (typeof value !== 'number' || !Number.isFinite(value))) {
        errors[field.id] = 'Enter a valid number.';
      } else if (field.type === 'date' && !isValidDate(value)) {
        errors[field.id] = 'Enter a valid date.';
      } else if ((field.type === 'select' || field.type === 'radio') &&
        (typeof value !== 'string' || (field.options !== undefined && !field.options.includes(value)))) {
        errors[field.id] = 'Select one of the available options.';
      }
    });

    setFieldErrors((current) => {
      const next = { ...current };
      currentSection.fields.forEach((field) => delete next[field.id]);
      return { ...next, ...errors };
    });
    const firstInvalid = currentSection.fields.find((field) => errors[field.id]);
    if (firstInvalid) {
      const focusId = firstInvalid.type === 'radio' ? `${firstInvalid.id}-option-0` : firstInvalid.id;
      window.setTimeout(() => document.getElementById(focusId)?.focus(), 0);
      return false;
    }
    return true;
  };

  const saveProgress = async () => {
    setSaveError(null);
    setSaveSuccess(null);
    setSaving(true);
    try {
      const saved = await documentService.saveAnswers(documentId, payload());
      setAnswers(saved);
      setSaveSuccess('Your answers have been saved.');
    } catch {
      setSaveError("We couldn't save your answers. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const saveAndContinue = async () => {
    setSaveError(null);
    setSaveSuccess(null);
    if (!validateCurrentSection()) return;

    setSaving(true);
    try {
      const saved = await documentService.saveAnswers(documentId, payload());
      setAnswers(saved);
      setSaveSuccess('Your answers have been saved.');
      if (form && sectionIndex < form.sections.length - 1) {
        setSectionIndex((index) => index + 1);
      } else {
        onNavigate(`/documents/${encodeURIComponent(documentId)}/review`);
      }
    } catch {
      setSaveError("We couldn't save your answers. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const renderField = (field: AccessibilityTask['sections'][number]['fields'][number]) => {
    const error = fieldErrors[field.id];
    const helpId = `${field.id}-help`;
    const errorId = `${field.id}-error`;
    const describedBy = [field.help ? helpId : '', error ? errorId : ''].filter(Boolean).join(' ') || undefined;
    const shared = {
      id: field.id,
      name: field.id,
      required: field.required,
      'aria-required': field.required || undefined,
      'aria-invalid': Boolean(error),
      'aria-describedby': describedBy,
      className: `mt-2 block w-full rounded-xl border bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-200 ${error ? 'border-red-500' : 'border-slate-300'}`,
      onFocus: () => setActiveFieldId(field.id),
    };
    const value = answers[field.id];

    return <div key={field.id} className="space-y-1.5">
      {field.type !== 'checkbox' && <label htmlFor={field.id} className="block text-sm font-bold text-slate-800">
        {field.label} {field.required && <span className="text-red-700" aria-label="required">*</span>}
      </label>}
      {field.type !== 'checkbox' && field.simpleLabel !== field.label && <p className="text-xs font-medium text-slate-600">In simple terms: {field.simpleLabel}</p>}
      {field.type === 'textarea' ? <textarea {...shared} value={typeof value === 'string' ? value : ''} rows={4} onChange={(event) => updateAnswer(field.id, event.target.value)} />
        : field.type === 'select' ? <select {...shared} value={typeof value === 'string' ? value : ''} onChange={(event) => updateAnswer(field.id, event.target.value)}>
          <option value="">Select an option</option>{field.options?.map((option) => <option key={option} value={option}>{option}</option>)}
        </select>
        : field.type === 'radio' ? <fieldset aria-describedby={describedBy} aria-invalid={Boolean(error)} className="mt-2 space-y-2">
          <legend className="text-sm font-bold text-slate-800">{field.label} {field.required && <span className="text-red-700">*</span>}</legend>
          {field.options?.map((option, optionIndex) => <label key={option} className="flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm text-slate-700">
          <input id={`${field.id}-option-${optionIndex}`} type="radio" name={field.id} value={option} checked={value === option} onFocus={() => setActiveFieldId(field.id)} onChange={() => updateAnswer(field.id, option)} className="h-4 w-4 accent-brand-700" />{option}
          </label>)}
        </fieldset>
        : field.type === 'checkbox' ? <label className="flex min-h-11 items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-bold text-slate-800">
          <input {...shared} type="checkbox" checked={value === true} onChange={(event) => updateAnswer(field.id, event.target.checked)} className="h-4 w-4 rounded accent-brand-700" />
          <span>{field.label} {field.required && <span className="text-red-700" aria-label="required">*</span>}</span>
        </label>
        : <input {...shared} type={field.type} value={typeof value === 'string' || typeof value === 'number' ? value : ''} onChange={(event) => updateAnswer(field.id, field.type === 'number' && event.target.value !== '' ? Number(event.target.value) : event.target.value)} />}
      {field.help && <p id={helpId} className="text-xs text-slate-600">{field.help}</p>}
      {error && <p id={errorId} role="alert" className="text-xs font-semibold text-red-700">{error}</p>}
    </div>;
  };

  return <div className="min-h-screen bg-slate-50 text-slate-900">
    <SkipLink />
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white">
      <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4 sm:px-6">
        <button type="button" onClick={() => onNavigate('/dashboard')} className="rounded-md p-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-700" aria-label="AccessAI Dashboard"><BrandLogo size="sm" /></button>
        <Button variant="ghost" size="sm" onClick={() => onNavigate('/dashboard')} leftIcon={<ArrowLeft className="h-4 w-4" />}>Dashboard</Button>
      </div>
    </header>
    <main id="main-content" tabIndex={-1} className="mx-auto max-w-4xl p-4 sm:p-6 focus:outline-none">
      {loading && <div className="py-20 text-center text-sm font-medium text-slate-600"><Loader2 className="mx-auto mb-3 h-6 w-6 animate-spin text-brand-700" aria-hidden="true" />Loading your accessible form...</div>}
      {loadError && <div className="mx-auto max-w-xl space-y-4"><Alert variant="error">{loadError}</Alert><Button onClick={() => window.location.reload()}>Try Again</Button></div>}
      {form && currentSection && <div className="space-y-6">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-card-soft sm:p-8">
          <p className="text-xs font-bold uppercase tracking-wider text-brand-700">Step {sectionIndex + 1} of {form.sections.length}</p>
          <h1 className="mt-2 text-2xl font-extrabold text-slate-900">{form.title}</h1>
          <h2 className="mt-1 text-lg font-bold text-slate-700">{currentSection.title}</h2>
          <p className="mt-2 text-sm text-slate-600">Complete one section at a time. Fields marked <span className="font-bold text-red-700">*</span> are required before you continue.</p>
        </section>
        {saveError && <Alert variant="error">{saveError}</Alert>}
        {saveSuccess && <Alert variant="success"><CheckCircle2 className="h-4 w-4" aria-hidden="true" />{saveSuccess}</Alert>}
        <form noValidate onSubmit={(event) => { event.preventDefault(); void saveAndContinue(); }} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-card-soft sm:p-8">
          <VoiceAssistance
            key={`${documentId}-${sectionIndex}`}
            activeField={activeField}
            onTranscript={updateAnswer}
            onTranslateForListening={(fieldId, locale) => documentService.getTranslatedFieldText(documentId, fieldId, locale)}
          />
          <div className="space-y-6">{currentSection.fields.map(renderField)}</div>
          <div className="mt-8 flex flex-col gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:items-center sm:justify-between">
            <Button type="button" variant="secondary" onClick={() => setSectionIndex((index) => index - 1)} disabled={sectionIndex === 0 || saving} leftIcon={<ChevronLeft className="h-4 w-4" />}>Back</Button>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button type="button" variant="outline" disabled={saving} onClick={() => void saveProgress()} leftIcon={<Save className="h-4 w-4" />}>{saving ? 'Saving...' : 'Save progress'}</Button>
              <Button type="submit" disabled={saving} rightIcon={sectionIndex < form.sections.length - 1 ? <ChevronRight className="h-4 w-4" /> : undefined}>{saving ? 'Saving...' : 'Save & Continue'}</Button>
            </div>
          </div>
        </form>
      </div>}
    </main>
  </div>;
};
