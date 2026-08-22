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

export const documentService = {
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
    const headers: Record<string, string> = {};
    const token = authService.getAccessToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}/documents/${documentId}/form`, {
      method: 'GET',
      credentials: 'include',
      headers,
    });

    if (!response.ok) {
      throw new ApiError("Failed to fetch document form.", response.status);
    }

    const data = (await response.json()) as { form: AccessibilityTask };
    return data.form;
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
