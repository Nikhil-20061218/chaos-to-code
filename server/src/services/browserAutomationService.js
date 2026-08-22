const crypto = require('crypto');
const { findOwnedDocument } = require('./documentProcessingService');
const { buildDocumentReview } = require('./reviewService');
const AppError = require('../utils/AppError');

const sessionsByDocument = new Map();
const SESSION_TIMEOUT_MS = 10 * 60 * 1000;
const NAVIGATION_TIMEOUT_MS = 30 * 1000;

function normalized(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function tokens(value) {
  return new Set(normalized(value).split(' ').filter(Boolean));
}

function overlap(left, right) {
  const leftTokens = tokens(left);
  const rightTokens = tokens(right);
  let count = 0;
  for (const token of leftTokens) if (rightTokens.has(token)) count += 1;
  return count;
}

function validateTargetUrl(value) {
  if (typeof value !== 'string' || value.length > 2048) throw new AppError('Enter a valid website URL.', 422);
  let url;
  try { url = new URL(value); } catch (_error) { throw new AppError('Enter a valid website URL.', 422); }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
    throw new AppError('Only public http or https website URLs are supported.', 422);
  }
  return url.toString();
}

function sourceFields(form, answers) {
  return form.sections.flatMap((section) => section.fields
    .filter((field) => Object.prototype.hasOwnProperty.call(answers, field.id))
    .map((field) => ({ ...field, value: answers[field.id] })));
}

function targetText(field) {
  return [field.name, field.id, field.label, field.placeholder, field.ariaLabel].filter(Boolean).join(' ');
}

function compatible(source, target) {
  if (target.type === 'password' || target.disabled || target.readOnly) return false;
  if (source.type === 'textarea') return target.tag === 'textarea' || target.type === 'text';
  if (source.type === 'checkbox') return target.type === 'checkbox';
  if (source.type === 'radio') return target.type === 'radio' && [target.value, target.label, target.ariaLabel].some((text) => normalized(text) === normalized(source.value));
  if (source.type === 'select') return target.tag === 'select';
  if (source.type === 'date') return target.type === 'date';
  if (['email', 'tel', 'number'].includes(source.type)) return target.type === source.type || target.type === 'text';
  return ['text', 'search', 'url'].includes(target.type) || target.tag === 'textarea';
}

function mapFields(form, answers, targetFields) {
  const filled = [];
  const manualReview = [];
  const usedTargets = new Set();
  for (const source of sourceFields(form, answers)) {
    const exact = normalized(source.id);
    const candidates = targetFields.filter((target, index) => !usedTargets.has(index) && compatible(source, target)).map((target, index) => {
      const text = targetText(target);
      const exactMatch = normalized(text).includes(exact) || normalized(text).includes(normalized(source.label));
      return { target, index: targetFields.indexOf(target), score: exactMatch ? 100 : overlap(`${source.label} ${source.simpleLabel} ${source.id}`, text) };
    }).filter((candidate) => candidate.score >= 2).sort((a, b) => b.score - a.score);
    if (candidates.length === 1 || (candidates[0] && candidates[0].score >= 100 && candidates[0].score > candidates[1]?.score)) {
      const match = candidates[0];
      usedTargets.add(match.index);
      filled.push({ sourceField: source.id, targetField: match.target.name || match.target.id || match.target.label, confidence: 'high', selector: match.target.selector, value: source.value, type: source.type });
    } else {
      manualReview.push({ sourceField: source.id, reason: candidates.length ? 'More than one possible target field was found.' : 'No reliable target field found.' });
    }
  }
  return { filled, manualReview };
}

async function inspectFormControls(page) {
  return page.evaluate(() => Array.from(document.querySelectorAll('input, textarea, select')).map((element, index) => {
    const labels = element.labels ? Array.from(element.labels).map((label) => label.textContent || '').join(' ') : '';
    return {
      selector: `[data-accessai-field="${index}"]`, tag: element.tagName.toLowerCase(), type: (element.getAttribute('type') || (element.tagName === 'SELECT' ? 'select' : 'text')).toLowerCase(),
      name: element.getAttribute('name') || '', id: element.id || '', label: labels, placeholder: element.getAttribute('placeholder') || '', ariaLabel: element.getAttribute('aria-label') || '',
      value: element.getAttribute('value') || '', disabled: element.disabled, readOnly: element.readOnly,
    };
  }).map((field, index) => ({ ...field, index })));
}

async function tagControls(page) {
  await page.evaluate(() => document.querySelectorAll('input, textarea, select').forEach((element, index) => element.setAttribute('data-accessai-field', String(index))));
}

async function fillMappedField(page, match) {
  const selector = match.selector;
  if (match.type === 'checkbox') {
    const checked = await page.$eval(selector, (element) => element.checked);
    if (Boolean(match.value) !== checked) await page.click(selector);
  } else if (match.type === 'radio') {
    await page.click(selector);
  } else if (match.type === 'select') {
    const selected = await page.select(selector, String(match.value));
    if (!selected.length) throw new Error('The matching option is unavailable.');
  } else {
    await page.locator(selector).fill(String(match.value));
  }
  await page.$eval(selector, (element) => element.scrollIntoView({ block: 'center', behavior: 'smooth' }));
  await page.locator(selector).focus();
}

function closeSession(documentId) {
  const session = sessionsByDocument.get(documentId);
  if (!session) return;
  clearTimeout(session.timeout);
  sessionsByDocument.delete(documentId);
  session.browser.close().catch(() => {});
}

async function startAutomation({ documentId, owner, targetUrl }) {
  if (sessionsByDocument.has(documentId)) throw new AppError('An automated browser is already open for this document. Review it or wait for it to close.', 409);
  const document = await findOwnedDocument(documentId, owner);
  const review = buildDocumentReview(document);
  if (!review.complete) throw new AppError('Complete all required form answers before automating a website.', 422);
  const safeUrl = validateTargetUrl(targetUrl);
  let browser;
  try {
    const puppeteer = require('puppeteer');
    browser = await puppeteer.launch({ headless: false, defaultViewport: { width: 1280, height: 900 }, args: ['--no-first-run'] });
    const page = await browser.newPage();
    await page.goto(safeUrl, { waitUntil: 'domcontentloaded', timeout: NAVIGATION_TIMEOUT_MS });
    await tagControls(page);
    const targets = await inspectFormControls(page);
    if (!targets.length) throw new AppError('No supported form controls were found on that page.', 422);
    const result = mapFields(review.form, review.answers, targets);
    const fillErrors = [];
    for (const match of [...result.filled]) {
      try { await fillMappedField(page, match); } catch (_error) { fillErrors.push(match.sourceField); }
    }
    result.filled = result.filled.filter((match) => !fillErrors.includes(match.sourceField)).map(({ selector, value, type, ...safe }) => safe);
    result.manualReview.push(...fillErrors.map((sourceField) => ({ sourceField, reason: 'The field could not be filled safely.' })));
    const sessionId = crypto.randomUUID();
    const session = { browser, timeout: setTimeout(() => closeSession(documentId), SESSION_TIMEOUT_MS) };
    session.timeout.unref();
    sessionsByDocument.set(documentId, session);
    browser.once('disconnected', () => { clearTimeout(session.timeout); sessionsByDocument.delete(documentId); });
    return { sessionId, status: 'ready_for_submission', filled: result.filled, manualReview: result.manualReview };
  } catch (error) {
    if (browser) await browser.close().catch(() => {});
    if (error instanceof AppError) throw error;
    throw new AppError('We could not open or automate that website. Please try a supported public form.', 502);
  }
}

module.exports = { validateTargetUrl, mapFields, startAutomation, closeSession };
