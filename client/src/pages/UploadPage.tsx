import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  FileText,
  X,
  Lock,
  ArrowLeft,
  FileUp,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { BrandLogo } from '../components/landing/BrandLogo';
import { Button } from '../components/common/Button';
import { Alert } from '../components/common/Alert';
import { SkipLink } from '../components/accessibility/SkipLink';
import { documentService } from '../services/documentService';
import { ApiError } from '../services/apiClient';
import { UploadedDocument } from '../types/document';

interface UploadPageProps {
  onNavigate?: (path: string, state?: Record<string, unknown>) => void;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_EXTENSIONS = ['.pdf', '.png', '.jpg', '.jpeg', '.webp'];
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/webp',
];

export const UploadPage: React.FC<UploadPageProps> = ({ onNavigate }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState<UploadedDocument | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const navigate = (path: string, state?: Record<string, unknown>) => {
    if (onNavigate) {
      onNavigate(path, state);
    } else {
      window.location.hash = path.replace('/', '#');
    }
  };

  const validateFile = (file: File): boolean => {
    setValidationError(null);
    setServerError(null);

    // Check file size (10 MB max)
    if (file.size > MAX_FILE_SIZE) {
      setValidationError('File must be 10 MB or smaller.');
      return false;
    }

    // Check MIME type and extension
    const hasValidMime = ALLOWED_MIME_TYPES.includes(file.type);
    const hasValidExt = ALLOWED_EXTENSIONS.some((ext) =>
      file.name.toLowerCase().endsWith(ext)
    );

    if (!hasValidMime && !hasValidExt) {
      setValidationError(
        'Unsupported file format. Please upload a PDF or an image (PNG, JPG, WebP).'
      );
      return false;
    }

    return true;
  };

  const handleFileSelect = (file: File) => {
    if (validateFile(file)) {
      setSelectedFile(file);
    } else {
      setSelectedFile(null);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setValidationError(null);
    setServerError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleUploadAndAnalyze = async () => {
    if (!selectedFile) {
      setValidationError('Please choose a file to upload.');
      return;
    }

    setIsUploading(true);
    setServerError(null);
    setValidationError(null);

    try {
      const document = await documentService.uploadDocument(selectedFile);
      setUploadSuccess(document);

      // Persist document ID in sessionStorage for reliable page transitions
      try {
        sessionStorage.setItem('currentDocumentId', document.id);
        sessionStorage.setItem('currentDocumentName', document.originalName);
      } catch {
        // Safe fallback
      }

      // Smooth transition to processing workflow
      setTimeout(() => {
        navigate(`/processing?id=${document.id}`, {
          documentId: document.id,
          document,
        });
      }, 500);
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setServerError(err.message);
      } else if (err instanceof Error) {
        setServerError(err.message);
      } else {
        setServerError("We couldn't connect to AccessAI. Please try again.");
      }
    } finally {
      setIsUploading(false);
    }
  };

  const isPdf = selectedFile?.name.toLowerCase().endsWith('.pdf') || selectedFile?.type === 'application/pdf';

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 selection:bg-brand-500 selection:text-white">
      {/* Keyboard Skip Link */}
      <SkipLink />

      {/* Top Header Bar */}
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

            {/* Breadcrumb indicator */}
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
              <span className="text-slate-800">Upload Document</span>
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/dashboard')}
            leftIcon={<ArrowLeft className="w-4 h-4" />}
            className="text-slate-600 hover:text-slate-900 text-xs"
          >
            Back to Dashboard
          </Button>
        </div>
      </header>

      {/* Main Upload Container */}
      <main
        id="main-content"
        tabIndex={-1}
        className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-10 focus:outline-none"
      >
        <div className="max-w-2xl w-full bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-10 shadow-card-elevated space-y-6 text-center">
          
          {/* Card Header */}
          <div className="space-y-1.5">
            <div className="w-12 h-12 rounded-2xl bg-brand-50 text-brand-700 mx-auto flex items-center justify-center border border-brand-100 mb-2">
              <FileUp className="w-6 h-6" aria-hidden="true" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Upload your document
            </h1>
            <p className="text-sm text-slate-500 font-medium">
              PDF, PNG, JPG, or WebP up to 10MB
            </p>
          </div>

          {/* Validation / Server Error Alerts */}
          {validationError && (
            <Alert variant="error">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{validationError}</span>
              </div>
            </Alert>
          )}

          {serverError && (
            <Alert variant="error">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{serverError}</span>
              </div>
            </Alert>
          )}

          {/* Upload Success Alert */}
          {uploadSuccess && (
            <Alert variant="success">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span>Document uploaded successfully! Starting AI analysis...</span>
              </div>
            </Alert>
          )}

          {/* Dropzone Area */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                fileInputRef.current?.click();
              }
            }}
            tabIndex={0}
            role="button"
            aria-label="Upload document dropzone. Drag and drop file or press enter to browse."
            className={`border-2 border-dashed rounded-2xl p-8 sm:p-10 transition-all cursor-pointer select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-700 ${
              isDragOver
                ? 'border-brand-600 bg-brand-50/60 scale-[1.01]'
                : 'border-slate-300 hover:border-brand-400 bg-slate-50/50 hover:bg-slate-50'
            }`}
          >
            {/* Hidden native accessible file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.webp,application/pdf,image/*"
              onChange={handleInputChange}
              className="sr-only"
              aria-hidden="true"
            />

            <div className="flex flex-col items-center space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-white text-brand-600 shadow-sm border border-slate-200/80 flex items-center justify-center">
                <UploadCloud className="w-7 h-7" aria-hidden="true" />
              </div>
              <div className="space-y-1">
                <p className="text-sm sm:text-base font-bold text-slate-800">
                  Drag &amp; drop your file here
                </p>
                <p className="text-xs text-slate-400 font-medium">or</p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="pointer-events-none rounded-xl px-5 font-semibold text-brand-700 border-brand-300 bg-white shadow-2xs"
              >
                Browse Files
              </Button>
            </div>
          </div>

          {/* Selected File Card (Shown when file is selected) */}
          {selectedFile && (
            <div className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-center justify-between gap-3 shadow-2xs animate-in fade-in duration-200">
              <div className="flex items-center gap-3.5 min-w-0 text-left">
                {isPdf ? (
                  <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center flex-shrink-0 font-extrabold text-[11px] tracking-tighter border border-red-200">
                    PDF
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-xl bg-brand-100 text-brand-700 flex items-center justify-center flex-shrink-0 border border-brand-200">
                    <FileText className="w-5 h-5" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-slate-800 truncate" title={selectedFile.name}>
                    {selectedFile.name}
                  </p>
                  <p className="text-xs text-slate-500 font-medium">
                    {documentService.formatFileSize(selectedFile.size)}
                  </p>
                </div>
              </div>

              {/* Remove file button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemoveFile();
                }}
                disabled={isUploading}
                aria-label="Remove selected file"
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-700 min-h-[36px] min-w-[36px] flex items-center justify-center transition-colors cursor-pointer disabled:opacity-50"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Primary Action Button */}
          <div className="pt-2">
            <Button
              type="button"
              variant="primary"
              size="lg"
              disabled={!selectedFile || isUploading || !!uploadSuccess}
              onClick={handleUploadAndAnalyze}
              className="w-full justify-center rounded-xl py-4 text-base font-bold shadow-md hover:shadow-lg transition-all"
            >
              {isUploading ? (
                <span className="inline-flex items-center gap-2.5">
                  <svg
                    className="animate-spin h-5 w-5 text-white"
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
                  <span>Uploading &amp; Analyzing...</span>
                </span>
              ) : (
                'Analyze Document'
              )}
            </Button>
          </div>

          {/* Privacy & Trust Badge */}
          <div className="pt-2 flex items-center justify-center gap-2 text-xs text-slate-500 font-medium select-none">
            <Lock className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
            <span>Your document is secure, encrypted, and processed transiently.</span>
          </div>

        </div>
      </main>

      {/* Minimal Footer */}
      <footer role="contentinfo" className="py-4 border-t border-slate-200 bg-white text-center text-xs text-slate-500 font-medium">
        <p>© {new Date().getFullYear()} AccessAI. Universal digital accessibility for all.</p>
      </footer>
    </div>
  );
};
