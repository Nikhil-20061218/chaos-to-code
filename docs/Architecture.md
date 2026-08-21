# AccessAI Architecture

## Goal

AccessAI transforms complex digital forms/documents into accessible,
guided experiences for users with visual impairments, low digital
literacy and language barriers.

## Core Flow

Authentication / Guest
        ↓
Accessibility Preferences
        ↓
PDF / Image / Text / Website Input
        ↓
Document / Web Analysis
        ↓
AI
        ↓
AccessibilityTask JSON
        ↓
Accessible Guided UI
        ↓
User Answers
        ↓
Review
        ↓
Generate PDF
        ↓
Download
        ↓
Temporary Data Cleanup

## Components

### Frontend
Responsible for:
- UI
- accessibility
- voice interaction
- user input
- rendering AccessibilityTask

### Backend
Responsible for:
- authentication
- sessions
- APIs
- file handling
- AI integration
- PDF generation
- security
- cleanup

### AI Service
Responsible for:
- document understanding
- field extraction
- simplification
- translation
- accessibility metadata

## Security Principles

- HTTPS
- API keys server-side
- No .env committed
- File validation
- File size limits
- No sensitive data in logs
- Temporary document processing
- Secure downloads
- User confirmation before sensitive actions