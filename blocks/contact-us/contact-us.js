import { getConfigValue } from '@dropins/tools/lib/aem/configs.js';
import { fetchPlaceholders } from '../../scripts/commerce.js';
import { submitContactForm } from './api.js';
import { ALLOWED_TYPES, CATEGORIES, validateContactForm } from './validation.js';

const DEFAULTS = {
  nameLabel: 'Name',
  emailLabel: 'Email',
  subjectLabel: 'Subject',
  descriptionLabel: 'Description',
  categoryLabel: 'Category',
  orderNumberLabel: 'Order Number',
  skuLabel: 'SKU',
  attachmentsLabel: 'Attachments',
  submitButton: 'Submit',
  submittingButton: 'Submitting...',
  successMessage: 'Thanks! Your support ticket has been submitted.',
  errorMessage: 'Something went wrong. Please try again or use the contact option below.',
  nameRequired: 'Please enter your name.',
  emailRequired: 'Please enter your email address.',
  emailInvalid: 'Please enter a valid email address.',
  subjectRequired: 'Please enter a subject.',
  descriptionRequired: 'Please describe your issue.',
  attachmentTooLarge: 'File is too large.',
  attachmentInvalidType: 'File type not supported.',
  categoryInvalid: 'Please select a valid category.',
  categoryPlaceholder: 'Select a category (optional)',
  fallbackLabel: 'Other ways to contact support',
};

let instanceCount = 0;

function makeField(form, field, labelText, instance, tag = 'input') {
  const wrapper = document.createElement('div');
  wrapper.className = 'contact-us__field';
  const label = document.createElement('label');
  label.htmlFor = `contact-us-${instance}-${field}`;
  label.textContent = labelText;
  const control = document.createElement(tag);
  control.id = label.htmlFor;
  control.name = field;
  if (tag === 'input') control.type = field === 'email' ? 'email' : 'text';
  if (field === 'email') control.autocomplete = 'email';
  if (field === 'name') control.autocomplete = 'name';
  if (['name', 'email', 'subject', 'description'].includes(field)) control.required = true;
  const error = document.createElement('p');
  error.className = 'contact-us__error';
  error.id = `${control.id}-error`;
  error.hidden = true;
  control.setAttribute('aria-describedby', error.id);
  wrapper.append(label, control, error);
  form.append(wrapper);
  return { control, error };
}

function showFallback(container, fallback, label) {
  container.replaceChildren();
  if (!fallback || typeof fallback !== 'object') return;
  const { email, subject, body } = fallback;
  if (![email, subject, body].some((value) => typeof value === 'string' && value.trim())) return;
  const heading = document.createElement('h2');
  heading.textContent = label;
  container.append(heading);
  if (typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    const link = document.createElement('a');
    link.href = `mailto:${email}?subject=${encodeURIComponent(typeof subject === 'string' ? subject : '')}&body=${encodeURIComponent(typeof body === 'string' ? body : '')}`;
    link.textContent = email;
    container.append(link);
  }
  [subject, body].forEach((value) => {
    if (typeof value !== 'string' || !value.trim()) return;
    const paragraph = document.createElement('p');
    paragraph.textContent = value;
    container.append(paragraph);
  });
}

export default async function decorate(block) {
  let translated = {};
  try {
    translated = (await fetchPlaceholders())?.Global?.ContactUs || {};
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('contact-us labels unavailable', { operation: 'fetchPlaceholders', reason: error.name });
  }
  const labels = { ...DEFAULTS, ...translated };
  const instance = ++instanceCount;
  const form = document.createElement('form');
  form.className = 'contact-us__form';
  form.noValidate = true;
  const fields = {};

  [['name', 'input'], ['email', 'input'], ['subject', 'input'], ['description', 'textarea'],
    ['category', 'select'], ['orderNumber', 'input'], ['sku', 'input'], ['attachments', 'input']]
    .forEach(([field, tag]) => {
      fields[field] = makeField(form, field, labels[`${field}Label`], instance, tag);
    });

  const category = fields.category.control;
  const emptyOption = document.createElement('option');
  emptyOption.value = '';
  emptyOption.textContent = labels.categoryPlaceholder;
  category.append(emptyOption);
  CATEGORIES.forEach((value) => {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = value;
    category.append(option);
  });

  const attachments = fields.attachments.control;
  attachments.type = 'file';
  attachments.multiple = true;
  attachments.accept = ALLOWED_TYPES.join(',');
  const honeypot = document.createElement('div');
  honeypot.className = 'contact-us__honeypot';
  honeypot.setAttribute('aria-hidden', 'true');
  const trap = document.createElement('input');
  trap.type = 'text';
  trap.name = 'website';
  trap.tabIndex = -1;
  trap.autocomplete = 'off';
  honeypot.append(trap);
  form.append(honeypot);

  const button = document.createElement('button');
  button.type = 'submit';
  button.className = 'button primary contact-us__submit';
  button.textContent = labels.submitButton;
  form.append(button);

  const status = document.createElement('p');
  status.className = 'contact-us__status';
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
  const fallback = document.createElement('div');
  fallback.className = 'contact-us__fallback';
  fallback.hidden = true;
  block.replaceChildren(form, status, fallback);

  function setErrors(errors) {
    Object.entries(fields).forEach(([name, { control, error }]) => {
      const key = errors[name];
      error.textContent = key ? labels[key] : '';
      error.hidden = !key;
      if (key) control.setAttribute('aria-invalid', 'true');
      else control.removeAttribute('aria-invalid');
    });
    const first = Object.keys(errors)[0];
    if (first) fields[first].control.focus();
  }

  Object.values(fields).forEach(({ control, error }) => {
    const clear = () => {
      error.textContent = '';
      error.hidden = true;
      control.removeAttribute('aria-invalid');
    };
    control.addEventListener('input', clear);
    control.addEventListener('change', clear);
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (button.disabled) return;
    if (trap.value.trim()) {
      form.reset();
      status.textContent = labels.successMessage;
      status.className = 'contact-us__status contact-us__status--success';
      fallback.hidden = true;
      return;
    }
    const values = Object.fromEntries(['name', 'email', 'subject', 'description',
      'category', 'orderNumber', 'sku'].map((name) => [name, fields[name].control.value.trim()]));
    const files = Array.from(attachments.files || []);
    const errors = validateContactForm(values, files);
    setErrors(errors);
    if (Object.keys(errors).length) return;

    status.textContent = '';
    fallback.hidden = true;
    fallback.replaceChildren();
    button.disabled = true;
    button.textContent = labels.submittingButton;
    try {
      const endpoint = getConfigValue('contact-us-endpoint');
      const result = await submitContactForm(endpoint, values, files);
      if (result.success) {
        status.textContent = labels.successMessage;
        status.className = 'contact-us__status contact-us__status--success';
        form.reset();
        form.hidden = true;
      } else {
        status.textContent = labels.errorMessage;
        status.className = 'contact-us__status contact-us__status--error';
        showFallback(fallback, result.fallback, labels.fallbackLabel);
        fallback.hidden = !fallback.childElementCount;
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('contact-us submit failed', { operation: 'submit-ticket', reason: error.name });
      status.textContent = labels.errorMessage;
      status.className = 'contact-us__status contact-us__status--error';
    } finally {
      button.disabled = false;
      button.textContent = labels.submitButton;
    }
  });
}
