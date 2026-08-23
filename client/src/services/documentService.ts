import { ApiError } from './apiClient';
import { authService } from './authService';
import { UploadDocumentResponse, UploadedDocument } from '../types/document';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

export interface AccessibilityTask {
  title: string;
  language: string;
  sections: Array<{
    id: string;
    title: string;
    fields: Array<{
      id: string;
      label: string;
      simpleLabel: string;
      type: 'text' | 'textarea' | 'email' | 'tel' | 'number' | 'date' | 'select' | 'checkbox' | 'radio';
      required: boolean;
      help: string;
      options?: string[];
    }>;
  }>;
}

export type FormAnswer = string | number | boolean;
export type FormAnswers = Record<string, FormAnswer>;

export interface DocumentReview {
  title: string;
  language: string;
  complete: boolean;
  missingRequiredFields: string[];
  sections: Array<{
    id: string;
    title: string;
    fields: Array<{
      id: string;
      label: string;
      answer: FormAnswer | null;
      required: boolean;
      complete: boolean;
    }>;
  }>;
}

export interface ListenText {
  label: string;
  help: string;
}

interface FinalizedDocument {
  id: string;
  status: 'confirmed' | 'pdf_generated';
}

export interface AutomationResult {
  sessionId: string;
  status: 'ready_for_submission';
  filled: Array<{ sourceField: string; targetField: string; confidence: 'high' }>;
  manualReview: Array<{ sourceField: string; reason: string }>;
}

function authorizationHeaders(): Record<string, string> {
  const token = authService.getAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function documentRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    credentials: 'include',
    headers: { ...authorizationHeaders(), ...options.headers },
  });

  if (!response.ok) {
    let message = "We couldn't complete that request. Please try again.";
    try {
      const body = await response.json();
      if (body?.error?.message && response.status < 500) message = body.error.message;
    } catch {
      // Use the safe fallback message.
    }
    if (response.status >= 500) message = "We couldn't connect to AccessAI. Please try again.";
    throw new ApiError(message, response.status);
  }

  return response.json() as Promise<T>;
}

export const documentService = {
  /** GET /api/documents */
  async getDocuments(): Promise<UploadedDocument[]> {
    const data = await documentRequest<{ documents: UploadedDocument[] }>('/documents', {
      method: 'GET',
    });
    return data.documents;
  },

  /**
   * Upload a document file (PDF, PNG, JPEG, WebP)
   * POST /api/documents/upload
   */
  async uploadDocument(file: File): Promise<UploadedDocument> {
    const performUpload = async (): Promise<UploadDocumentResponse> => {
      const formData = new FormData();
      formData.append('file', file);

      const headers: Record<string, string> = {};
      const token = authService.getAccessToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${API_BASE_URL}/documents/upload`, {
        method: 'POST',
        body: formData,
        credentials: 'include', // Includes guestSession and refreshToken cookies
        headers,
      });

      if (!response.ok) {
        let errorMessage = 'Failed to upload document.';
        let errorCode = 'UPLOAD_ERROR';

        try {
          const errorData = await response.json();
          if (errorData?.error?.message) {
            errorMessage = errorData.error.message;
          }
          if (errorData?.error?.code) {
            errorCode = errorData.error.code;
          }
        } catch {
          // Fallback
        }

        if (response.status === 413) {
          errorMessage = 'File must be 10 MB or smaller.';
        } else if (response.status === 400) {
          errorMessage = errorMessage || 'Unsupported file format. Please upload a PDF or image.';
        } else if (response.status >= 500) {
          errorMessage = "We couldn't connect to AccessAI. Please try again.";
        }

        throw new ApiError(errorMessage, response.status, errorCode);
      }

      return (await response.json()) as UploadDocumentResponse;
    };

    try {
      const data = await performUpload();
      return data.document;
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        try {
          await authService.createGuestSession();
          const retryData = await performUpload();
          return retryData.document;
        } catch (retryError) {
          throw retryError;
        }
      }
      throw error;
    }
  },

  /**
   * Run AI document analysis on uploaded document
   * POST /api/documents/:id/analyze
   */
  async analyzeDocument(documentId: string): Promise<UploadedDocument> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    const token = authService.getAccessToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}/documents/${documentId}/analyze`, {
      method: 'POST',
      credentials: 'include',
      headers,
    });

    if (!response.ok) {
      let errorMessage = "We couldn't analyze your document. Please try again.";
      let errorCode = 'ANALYZE_ERROR';

      try {
        const errorData = await response.json();
        if (errorData?.error?.message) {
          errorMessage = errorData.error.message;
        }
        if (errorData?.error?.code) {
          errorCode = errorData.error.code;
        }
      } catch {
        // Fallback
      }

      if (response.status >= 500) {
        errorMessage = "We couldn't analyze your document. Please check your backend AI configuration and try again.";
      }

      throw new ApiError(errorMessage, response.status, errorCode);
    }

    const data = (await response.json()) as { document: UploadedDocument };
    return data.document;
  },

  /**
   * Fetch generated AccessibilityTask form schema
   * GET /api/documents/:id/form
   */
  async getForm(documentId: string): Promise<AccessibilityTask> {
    const data = await documentRequest<{ form: AccessibilityTask }>(`/documents/${documentId}/form`);
    return data.form;
  },

  /** GET /api/documents/:id/form/answers */
  async getAnswers(documentId: string): Promise<FormAnswers> {
    const data = await documentRequest<{ answers: FormAnswers }>(`/documents/${documentId}/form/answers`);
    return data.answers;
  },

  /** Translate the owned form field text for browser text-to-speech. */
  async getTranslatedFieldText(documentId: string, fieldId: string, locale: 'hi-IN' | 'te-IN' | 'kn-IN'): Promise<ListenText> {
    const data = await documentRequest<{ text: ListenText }>(
      `/documents/${documentId}/form/fields/${encodeURIComponent(fieldId)}/listen-text?locale=${encodeURIComponent(locale)}`,
    );
    return data.text;
  },

  /** PUT /api/documents/:id/form/answers. The server merges partial answers. */
  async saveAnswers(documentId: string, answers: FormAnswers): Promise<FormAnswers> {
    const data = await documentRequest<{ answers: FormAnswers }>(`/documents/${documentId}/form/answers`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answers }),
    });
    return data.answers;
  },

  /** GET /api/documents/:id/review */
  async getReview(documentId: string): Promise<DocumentReview> {
    const data = await documentRequest<{ review: DocumentReview }>(`/documents/${documentId}/review`);
    return data.review;
  },

  /** Opens a separate browser window and fills only high-confidence matches. */
  async startBrowserAutomation(documentId: string, targetUrl: string): Promise<AutomationResult> {
    const data = await documentRequest<{ automation: AutomationResult }>(`/documents/${documentId}/automation/start`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ targetUrl }),
    });
    return data.automation;
  },

  /** POST /api/documents/:id/review/confirm */
  async confirmReview(documentId: string): Promise<FinalizedDocument> {
    const data = await documentRequest<{ document: FinalizedDocument }>(`/documents/${documentId}/review/confirm`, {
      method: 'POST',
    });
    return data.document;
  },

  /** POST /api/documents/:id/pdf */
  async generatePdf(documentId: string): Promise<FinalizedDocument> {
    const data = await documentRequest<{ document: FinalizedDocument }>(`/documents/${documentId}/pdf`, {
      method: 'POST',
    });
    return data.document;
  },

  /** GET /api/documents/:id/pdf. The server authorizes and streams the completed PDF. */
  async downloadPdf(documentId: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/documents/${documentId}/pdf`, {
      credentials: 'include',
      headers: authorizationHeaders(),
    });
    if (!response.ok || !response.headers.get('content-type')?.includes('application/pdf')) {
      throw new ApiError('Unable to download the PDF. Please try again.', response.status);
    }

    const objectUrl = URL.createObjectURL(await response.blob());
    const anchor = document.createElement('a');
    anchor.href = objectUrl;
    anchor.download = 'completed-form.pdf';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
  },

  /**
   * Format file size to human readable string
   */
  formatFileSize(bytes: number): string {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  },
};
