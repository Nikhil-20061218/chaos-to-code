# AccessAI

AI-powered accessibility platform that helps users understand and
complete complex digital forms.

## Target Users

- Blind / visually impaired users
- Low digital-literacy users
- Users with language barriers
- Elderly / first-time digital users

## Core Flow

Authentication / Guest
→ Accessibility Preferences
→ PDF / Image / Text / Website URL
→ AI Analysis
→ Structured Task
→ Voice / Simple / Language Mode
→ Guided Form
→ Review
→ Generate PDF
→ Download
→ Temporary Data Cleanup

## AI

AI understands the input and returns structured data.

AI handles:
- Field extraction
- Simplification
- Explanations
- Translation
- Accessibility guidance

AI must NOT directly generate or control frontend code.

## Accessibility

Support:
- Screen readers
- Keyboard navigation
- Voice interaction
- Simple language
- English + Kannada
- Clear focus and labels

## Security

- Keep API keys server-side
- Never commit secrets
- Validate uploaded files
- Limit file size
- Don't log sensitive data
- Don't permanently store documents by default
- Delete temporary files after processing
- User must confirm sensitive actions

## MVP Priority

1. Authentication / Guest
2. Document input
3. AI analysis
4. Accessible guided form
5. Voice
6. Simple language
7. Kannada
8. Review
9. PDF generation/download

Keep the implementation simple and reliable.
Avoid unnecessary RAG, vector databases, microservices, or complex infrastructure.