const AppError = require('../utils/AppError');

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^[0-9+()\-\s]{3,30}$/;

function isPlainObject(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function invalidAnswer(fieldId) {
  return new AppError(`Answer for field "${fieldId}" is invalid.`, 422);
}

function normalizeDate(value, fieldId) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw invalidAnswer(fieldId);
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) throw invalidAnswer(fieldId);
  return value;
}

function normalizeString(value, fieldId, maximum = 5000) {
  if (typeof value !== 'string' || value.length > maximum) throw invalidAnswer(fieldId);
  return value.trim();
}

function validateValue(field, value) {
  switch (field.type) {
    case 'text':
    case 'textarea':
      return normalizeString(value, field.id);
    case 'number':
      if (typeof value !== 'number' || !Number.isFinite(value)) throw invalidAnswer(field.id);
      return value;
    case 'email': {
      const email = normalizeString(value, field.id, 320);
      if (!EMAIL_PATTERN.test(email)) throw invalidAnswer(field.id);
      return email;
    }
    case 'date':
      return normalizeDate(value, field.id);
    case 'tel': {
      const phone = normalizeString(value, field.id, 30);
      if (!PHONE_PATTERN.test(phone)) throw invalidAnswer(field.id);
      return phone;
    }
    case 'checkbox':
      if (typeof value !== 'boolean') throw invalidAnswer(field.id);
      return value;
    case 'select':
    case 'radio': {
      const option = normalizeString(value, field.id, 200);
      if (field.options && !field.options.includes(option)) throw invalidAnswer(field.id);
      return option;
    }
    default:
      throw invalidAnswer(field.id);
  }
}

function validateFormAnswers(accessibilityTask, answers) {
  if (!accessibilityTask || !Array.isArray(accessibilityTask.sections)) throw new AppError('Document form is invalid.', 500);
  if (!isPlainObject(answers) || Object.keys(answers).length > 1000) throw new AppError('Answers must be an object.', 422);

  const fields = new Map();
  accessibilityTask.sections.forEach((section) => {
    if (section && Array.isArray(section.fields)) section.fields.forEach((field) => fields.set(field.id, field));
  });

  const normalized = Object.create(null);
  for (const [fieldId, value] of Object.entries(answers)) {
    if (fieldId === '__proto__' || fieldId === 'constructor' || fieldId === 'prototype' || !fields.has(fieldId)) {
      throw new AppError('Answer contains an unknown field.', 422);
    }
    normalized[fieldId] = validateValue(fields.get(fieldId), value);
  }
  return normalized;
}

module.exports = { validateFormAnswers };
