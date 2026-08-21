# AccessibilityTask Schema

The AI must return structured data.

The frontend must never depend on arbitrary AI-generated UI code.

## Example

{
  "title": "Application Form",
  "language": "en",
  "sections": [
    {
      "id": "personal",
      "title": "Personal Information",
      "fields": [
        {
          "id": "full_name",
          "label": "Full Name",
          "simpleLabel": "Your name",
          "type": "text",
          "required": true,
          "help": "Enter your full name as shown on your ID."
        }
      ]
    }
  ]
}