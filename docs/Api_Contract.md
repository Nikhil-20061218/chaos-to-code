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

## Save Answers

POST /api/tasks/:id/answers

## Generate PDF

POST /api/tasks/:id/generate-pdf

## Download

GET /api/tasks/:id/download

## Delete

DELETE /api/tasks/:id
