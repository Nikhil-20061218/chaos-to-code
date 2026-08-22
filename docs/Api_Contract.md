# API Contract

Base:
 /api

## Authentication

POST /api/auth/...

## Guest Session

POST /api/guest/session

## Upload

POST /api/documents/upload

## Analyze

POST /api/documents/:id/analyze

## Guided Form

GET /api/documents/:id/form

GET /api/documents/:id/form/answers

PUT /api/documents/:id/form/answers

## Review and Finalization

All endpoints below require the authenticated document owner or the valid guest-session owner. Missing and non-owned documents return a safe 404.

GET /api/documents/:id/review

Returns the ordered form fields with saved answers, completion state, and required fields that still need values.

```json
{
  "review": {
    "title": "Application Form",
    "language": "en",
    "complete": false,
    "missingRequiredFields": ["email"],
    "sections": []
  }
}
```

POST /api/documents/:id/review/confirm

Requires a complete valid review. Returns:

```json
{ "document": { "id": "...", "status": "confirmed" } }
```

POST /api/documents/:id/pdf

Requires confirmation. Generates a completed PDF once and reuses an existing valid generated PDF.

```json
{ "document": { "id": "...", "status": "pdf_generated" } }
```

GET /api/documents/:id/pdf

Requires an owner and a generated PDF. Streams `application/pdf` with the safe download name `completed-form.pdf`.

## Save Answers

POST /api/tasks/:id/answers

## Generate PDF

POST /api/tasks/:id/generate-pdf

## Download

GET /api/tasks/:id/download

## Delete

DELETE /api/tasks/:id
