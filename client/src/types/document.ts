export interface UploadedDocument {
  id: string;
  originalName: string;
  mimeType: string;
  size: number;
  status: 'uploaded' | 'processing' | 'completed' | 'failed';
  analysis?: unknown;
}

export interface UploadDocumentResponse {
  document: UploadedDocument;
}
