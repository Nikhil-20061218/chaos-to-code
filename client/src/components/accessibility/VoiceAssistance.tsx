import React, { useEffect, useRef, useState } from 'react';
import { Mic, Square, Volume2 } from 'lucide-react';
import { Button } from '../common/Button';

type VoiceLanguage = 'en-IN' | 'hi-IN' | 'te-IN' | 'kn-IN';

interface RecognitionResultEventLike {
  results: ArrayLike<ArrayLike<{ transcript: string }>>;
}

interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: RecognitionResultEventLike) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

interface VoiceWindow extends Window {
  SpeechRecognition?: SpeechRecognitionConstructor;
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
}

interface VoiceField {
  id: string;
  label: string;
  help?: string;
  type: string;
}

interface VoiceAssistanceProps {
  activeField?: VoiceField;
  onTranscript: (fieldId: string, transcript: string) => void;
  onTranslateForListening: (fieldId: string, locale: Exclude<VoiceLanguage, 'en-IN'>) => Promise<{ label: string; help: string }>;
}

const VOICE_LANGUAGES: Array<{ locale: VoiceLanguage; label: string }> = [
  { locale: 'en-IN', label: 'English' },
  { locale: 'hi-IN', label: 'हिन्दी' },
  { locale: 'te-IN', label: 'తెలుగు' },
  { locale: 'kn-IN', label: 'ಕನ್ನಡ' },
];

const VOICE_COMPATIBLE_TYPES = new Set(['text', 'textarea', 'email', 'tel', 'number', 'date']);
const LISTENING_TIMEOUT_MS = 15_000;

function recognitionConstructor(): SpeechRecognitionConstructor | undefined {
  const browserWindow = window as VoiceWindow;
  return browserWindow.SpeechRecognition || browserWindow.webkitSpeechRecognition;
}

export const VoiceAssistance: React.FC<VoiceAssistanceProps> = ({ activeField, onTranscript, onTranslateForListening }) => {
  const [language, setLanguage] = useState<VoiceLanguage>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('accessai-accessibility-settings') || '{}');
      if (['en-IN', 'hi-IN', 'te-IN', 'kn-IN'].includes(saved.language)) {
        return saved.language as VoiceLanguage;
      }
    } catch {
      // Ignore
    }
    return 'en-IN';
  });
  const [status, setStatus] = useState('Ready to listen.');
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPreparingSpeech, setIsPreparingSpeech] = useState(false);
  const languageRef = useRef<VoiceLanguage>('en-IN');
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const timeoutRef = useRef<number | null>(null);
  const receivedResultRef = useRef(false);
  const recognitionErrorRef = useRef(false);
  const speechRequestRef = useRef(0);
  const hasRecognition = typeof window !== 'undefined' && Boolean(recognitionConstructor());
  const hasSynthesis = typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
  const canSpeak = Boolean(activeField) && hasSynthesis;
  const canRecognize = Boolean(activeField && VOICE_COMPATIBLE_TYPES.has(activeField.type) && hasRecognition);

  const stopRecognition = (abort = false) => {
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    const recognition = recognitionRef.current;
    if (recognition) {
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
      if (abort) recognition.abort();
      else recognition.stop();
      recognitionRef.current = null;
    }
    setIsListening(false);
  };

  const selectLanguage = (selectedLocale: VoiceLanguage) => {
    // Keep the current locale available synchronously for the next microphone action.
    languageRef.current = selectedLocale;
    setLanguage(selectedLocale);
  };

  useEffect(() => () => {
    stopRecognition(true);
    speechRequestRef.current += 1;
    if (hasSynthesis) window.speechSynthesis.cancel();
  // Cleanup is deliberately limited to component unmount.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startRecognition = () => {
    if (!activeField) {
      setStatus('Choose a field before speaking an answer.');
      return;
    }
    if (!VOICE_COMPATIBLE_TYPES.has(activeField.type)) {
      setStatus('Voice input is available for text, email, phone, number, and date fields.');
      return;
    }
    const Recognition = recognitionConstructor();
    if (!Recognition) {
      setStatus("Voice input isn't supported in this browser. You can type your answer instead.");
      return;
    }

    stopRecognition(true);
    const selectedLocale = languageRef.current;
    const recognition = new Recognition();
    receivedResultRef.current = false;
    recognitionErrorRef.current = false;
    recognition.lang = selectedLocale;
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.onresult = (event) => {
      const transcript = Array.from(event.results).map((result) => result[0]?.transcript || '').join(' ').trim();
      receivedResultRef.current = Boolean(transcript);
      if (!transcript) {
        setStatus("Couldn't understand the voice input. Please try again.");
        return;
      }
      setStatus('Processing speech...');
      onTranscript(activeField.id, transcript);
      setStatus('Voice input added. You can edit it before saving.');
    };
    recognition.onerror = (event) => {
      recognitionErrorRef.current = true;
      const message = event.error === 'not-allowed' || event.error === 'service-not-allowed'
        ? 'Microphone access was denied. You can type your answer instead.'
        : "Couldn't understand the voice input. Please try again.";
      setStatus(message);
    };
    recognition.onend = () => {
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      recognitionRef.current = null;
      setIsListening(false);
      if (!receivedResultRef.current && !recognitionErrorRef.current) {
        setStatus("Couldn't understand the voice input. Please try again.");
      }
    };
    recognitionRef.current = recognition;
    setStatus('Listening...');
    setIsListening(true);
    timeoutRef.current = window.setTimeout(() => {
      stopRecognition();
      setStatus("Couldn't understand the voice input. Please try again.");
    }, LISTENING_TIMEOUT_MS);
    try {
      recognition.start();
    } catch {
      stopRecognition(true);
      setStatus("Couldn't understand the voice input. Please try again.");
    }
  };

  const listenToField = async () => {
    if (!activeField || !hasSynthesis) return;
    if (isPreparingSpeech) {
      speechRequestRef.current += 1;
      setIsPreparingSpeech(false);
      setStatus('Stopped preparing the question.');
      return;
    }
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      setStatus('Stopped reading the question.');
      return;
    }
    const requestId = speechRequestRef.current + 1;
    speechRequestRef.current = requestId;
    let text = { label: activeField.label, help: activeField.help || '' };
    let usingOriginalText = false;
    if (language !== 'en-IN') {
      setIsPreparingSpeech(true);
      setStatus('Translating the current question...');
      try {
        text = await onTranslateForListening(activeField.id, language);
      } catch {
        usingOriginalText = true;
      } finally {
        if (speechRequestRef.current === requestId) setIsPreparingSpeech(false);
      }
    }
    if (speechRequestRef.current !== requestId) return;
    const utterance = new SpeechSynthesisUtterance([text.label, text.help].filter(Boolean).join('. '));
    utterance.lang = language;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => {
      setIsSpeaking(false);
      setStatus('Unable to read this question aloud. You can read it on screen instead.');
    };
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
    setIsSpeaking(true);
    setStatus(usingOriginalText
      ? 'Translation is unavailable. Reading the original text with the selected voice.'
      : 'Reading the current question...');
  };

  return <section className="rounded-2xl border border-brand-200 bg-brand-50/60 p-4" aria-labelledby="voice-assistance-heading">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h3 id="voice-assistance-heading" className="text-sm font-bold text-slate-900">Voice assistance</h3>
        <p className="mt-1 text-xs text-slate-600">Select a field, then speak your answer or listen to the question.</p>
      </div>
      <label className="flex flex-col gap-1 text-sm font-semibold text-slate-800" htmlFor="voice-language">
        Voice language
        <select id="voice-language" value={language} onChange={(event) => selectLanguage(event.target.value as VoiceLanguage)} className="min-h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm font-normal focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-700">
          {VOICE_LANGUAGES.map(({ locale, label }) => <option key={locale} value={locale}>{label}</option>)}
        </select>
      </label>
    </div>
    <div className="mt-3 flex flex-col gap-2 sm:flex-row">
      {isListening ? <Button type="button" variant="secondary" onClick={() => { stopRecognition(); setStatus('Stopped listening.'); }} leftIcon={<Square className="h-4 w-4" />}>Stop listening</Button>
        : <Button type="button" variant="primary" onClick={startRecognition} disabled={!canRecognize} aria-label="Speak answer" leftIcon={<Mic className="h-4 w-4" />}>Speak answer</Button>}
      {hasSynthesis && <Button type="button" variant="outline" onClick={() => void listenToField()} disabled={!canSpeak} aria-label={isSpeaking || isPreparingSpeech ? 'Stop listening to question' : 'Listen to current question'} leftIcon={isSpeaking || isPreparingSpeech ? <Square className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}>{isPreparingSpeech ? 'Cancel listening' : isSpeaking ? 'Stop listening' : 'Listen'}</Button>}
    </div>
    {!hasRecognition && <p className="mt-3 text-xs font-medium text-slate-700">Voice input isn't supported in this browser. You can type your answer instead.</p>}
    {activeField && !VOICE_COMPATIBLE_TYPES.has(activeField.type) && <p className="mt-3 text-xs font-medium text-slate-700">Voice input is not available for this field type. Use the available form controls.</p>}
    <p className="mt-3 text-xs font-semibold text-slate-800" role="status" aria-live="polite">Status: {status}</p>
  </section>;
};
