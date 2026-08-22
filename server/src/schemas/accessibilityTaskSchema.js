const AppError = require('../utils/AppError');

const FIELD_TYPES = new Set(['text', 'textarea', 'email', 'tel', 'number', 'date', 'select', 'checkbox', 'radio']);

function requireText(value, field, maximum = 500) {
  if (typeof value !== 'string' || value.trim().length === 0 || value.length > maximum) {
    throw new AppError(`AccessibilityTask ${field} is invalid.`, 422);
  }
  return value.trim();
}

function validateAccessibilityTask(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new AppError('AccessibilityTask output is invalid.', 422);
  }
  if (!Array.isArray(input.sections) || input.sections.length === 0 || input.sections.length > 100) {
    throw new AppError('AccessibilityTask sections are invalid.', 422);
  }

  const sectionIds = new Set();
  const fieldIds = new Set();
  const sections = input.sections.map((section) => {
    if (!section || typeof section !== 'object' || Array.isArray(section)) {
      throw new AppError('AccessibilityTask section is invalid.', 422);
    }
    const id = requireText(section.id, 'section id', 100);
    if (sectionIds.has(id)) throw new AppError('AccessibilityTask section ids must be unique.', 422);
    sectionIds.add(id);
    if (!Array.isArray(section.fields) || section.fields.length === 0 || section.fields.length > 100) {
      throw new AppError('AccessibilityTask fields are invalid.', 422);
    }
    return {
      id,
      title: requireText(section.title, 'section title'),
      fields: section.fields.map((field) => {
        if (!field || typeof field !== 'object' || Array.isArray(field)) {
          throw new AppError('AccessibilityTask field is invalid.', 422);
        }
        const fieldId = requireText(field.id, 'field id', 100);
        if (fieldIds.has(fieldId)) throw new AppError('AccessibilityTask field ids must be unique.', 422);
        fieldIds.add(fieldId);
        if (!FIELD_TYPES.has(field.type)) throw new AppError('AccessibilityTask field type is invalid.', 422);
        if (typeof field.required !== 'boolean') throw new AppError('AccessibilityTask field required is invalid.', 422);
        let options;
        if (field.options !== undefined) {
          if (!['select', 'radio'].includes(field.type) || !Array.isArray(field.options) || field.options.length === 0 || field.options.length > 100) {
            throw new AppError('AccessibilityTask field options are invalid.', 422);
          }
          const optionValues = new Set();
          options = field.options.map((option) => {
            const value = requireText(option, 'field option', 200);
            if (optionValues.has(value)) throw new AppError('AccessibilityTask field options must be unique.', 422);
            optionValues.add(value);
            return value;
          });
        }
        return {
          id: fieldId,
          label: requireText(field.label, 'field label'),
          simpleLabel: requireText(field.simpleLabel, 'field simpleLabel'),
          type: field.type,
          required: field.required,
          help: requireText(field.help, 'field help'),
          ...(options ? { options } : {}),
        };
      }),
    };
  });

  return {
    title: requireText(input.title, 'title'),
    language: requireText(input.language, 'language', 20),
    sections,
  };
}

module.exports = { validateAccessibilityTask };
