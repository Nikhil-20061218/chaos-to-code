# API Contract

Base path: `/api`

Document endpoints require either a bearer access token for the owning user or the owning `guestSession` cookie. Missing and non-owned documents return a safe `404`.

## Authentication

- `POST /api/auth/register` — `{ name, email, password }`; starts email verification.
- `POST /api/auth/verify-email` — `{ email, otp }`.
- `POST /api/auth/resend-otp` — `{ email }`.
- `POST /api/auth/login` — `{ email, password }`; returns `{ accessToken, user }` and sets an HTTP-only refresh cookie.
- `POST /api/auth/refresh` — rotates the refresh cookie and returns access data.
- `POST /api/auth/logout` — clears the refresh session.
- `GET /api/auth/me` — requires bearer authentication.

## Guest session

- `POST /api/guest/session` — sets the HTTP-only `guestSession` cookie.

## Documents

- `POST /api/documents/upload` — multipart field `file`; accepts PDF, PNG, and JPEG.
- `POST /api/documents/:id/analyze` — starts document analysis.
- `GET /api/documents/:id` — returns owned document metadata.
- `GET /api/documents/:id/form` — returns `{ form }`.
- `GET /api/documents/:id/form/answers` — returns `{ answers }`.
- `PUT /api/documents/:id/form/answers` — `{ answers }`; validates and merges partial answers.
- `GET /api/documents/:id/form/fields/:fieldId/listen-text?locale=hi-IN|te-IN|kn-IN` — returns translated `{ text }` for an owned field.

## Review and PDF

- `GET /api/documents/:id/review` — returns `{ review }` with completion state, required fields, ordered sections, and saved answers.
- `POST /api/documents/:id/review/confirm` — requires complete valid answers; returns `{ document: { id, status: "confirmed" } }`.
- `POST /api/documents/:id/pdf` — requires confirmation; returns `{ document: { id, status: "pdf_generated" } }`.
- `GET /api/documents/:id/pdf` — streams the owner-protected generated PDF as `completed-form.pdf`.

## Browser automation

- `POST /api/documents/:id/automation/start` — `{ targetUrl }`; validates ownership, completed answers, and an HTTP(S) URL. Returns `{ automation }` with a session ID, high-confidence filled fields, and fields requiring manual review. It never submits the external form.
