import { getConfigValue } from '@dropins/tools/lib/aem/configs.js';

const FIELDS = [
  { name: 'name', label: 'Name', required: true, autocomplete: 'name', maxLength: 120 },
  { name: 'email', label: 'Email', required: true, type: 'email', autocomplete: 'email', maxLength: 254 },
  { name: 'subject', label: 'Subject', required: true, maxLength: 200 },
  { name: 'description', label: 'Description', required: true, multiline: true, maxLength: 5000 },
  { name: 'category', label: 'Category', maxLength: 120 },
  { name: 'orderNumber', label: 'Order number', maxLength: 120 },
  { name: 'sku', label: 'SKU', maxLength: 120 },
];

let instance = 0;

function makeField(spec, prefix) {
  const wrapper = document.createElement('div');
  wrapper.className = 'contact-us-field';
  const label = document.createElement('label');
  const id = `${prefix}-${spec.name}`;
  label.htmlFor = id;
  label.textContent = spec.required ? `${spec.label} *` : `${spec.label} (optional)`;

  const control = document.createElement(spec.multiline ? 'textarea' : 'input');
  control.id = id;
  control.name = spec.name;
  if (!spec.multiline) control.type = spec.type || 'text';
  if (spec.multiline) control.rows = 6;
  if (spec.autocomplete) control.autocomplete = spec.autocomplete;
  control.maxLength = spec.maxLength;
  control.required = Boolean(spec.required);
  control.setAttribute('aria-describedby', `${id}-error`);

  const error = document.createElement('span');
  error.id = `${id}-error`;
  error.className = 'contact-us-field-error';
  wrapper.append(label, control, error);
  return { wrapper, control, error, spec };
}

function validateField(field) {
  const { control, error, spec } = field;
  const value = control.value.trim();
  let message = '';
  if (spec.required && !value) message = `${spec.label} is required.`;
  else if (value && spec.type === 'email' && (!control.validity.valid || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))) {
    message = 'Enter a valid email address.';
  }
  error.textContent = message;
  control.setAttribute('aria-invalid', String(Boolean(message)));
  return !message;
}

function configuredEndpoint() {
  const value = getConfigValue('support-ticket-endpoint');
  if (typeof value !== 'string' || !value.trim()) return null;
  try {
    const url = new URL(value.trim());
    if (url.protocol !== 'https:' || !url.hostname || url.username || url.password) return null;
    return url.href;
  } catch {
    return null;
  }
}

export default function decorate(block) {
  instance += 1;
  const prefix = `contact-us-${instance}`;
  const form = document.createElement('form');
  form.className = 'contact-us-form';
  form.noValidate = true;

  const fields = FIELDS.map((spec) => makeField(spec, prefix));
  const shortFields = document.createElement('div');
  shortFields.className = 'contact-us-grid';
  fields.forEach((field) => {
    if (field.spec.name === 'description') form.append(shortFields, field.wrapper);
    else shortFields.append(field.wrapper);
  });

  const status = document.createElement('p');
  status.className = 'contact-us-status';
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
  const button = document.createElement('button');
  button.type = 'submit';
  button.className = 'button primary contact-us-submit';
  button.textContent = 'Send message';
  form.append(status, button);
  block.replaceChildren(form);

  const showStatus = (message, type) => {
    status.textContent = message;
    status.className = type ? `contact-us-status contact-us-status--${type}` : 'contact-us-status';
    status.setAttribute('role', type === 'error' ? 'alert' : 'status');
  };

  let endpoint;
  try {
    endpoint = configuredEndpoint();
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Contact Us: reading support-ticket-endpoint failed', error?.name);
  }
  if (!endpoint) {
    showStatus('The contact form is temporarily unavailable. Please try again later.', 'error');
    button.disabled = true;
  }

  fields.forEach((field) => {
    field.control.addEventListener('input', () => {
      if (field.control.getAttribute('aria-invalid') === 'true') validateField(field);
      if (status.classList.contains('contact-us-status--error') && endpoint) showStatus('', '');
    });
    field.control.addEventListener('blur', () => {
      if (field.control.value || field.control.getAttribute('aria-invalid') === 'true') validateField(field);
    });
  });

  let submitting = false;
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (submitting || !endpoint) return;
    const results = fields.map((field) => validateField(field));
    if (results.some((valid) => !valid)) {
      showStatus('Check the highlighted fields and try again.', 'error');
      fields[results.indexOf(false)].control.focus();
      return;
    }

    const payload = Object.fromEntries(fields
      .map(({ spec, control }) => [spec.name, control.value.trim()])
      .filter(([key, value]) => value || FIELDS.find((spec) => spec.name === key).required));
    submitting = true;
    button.disabled = true;
    button.textContent = 'Sending…';
    showStatus('', '');
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        credentials: 'omit',
        referrerPolicy: 'no-referrer',
      });
      if (!response.ok) {
        // eslint-disable-next-line no-console
        console.error('Contact Us: ticket submission failed', { status: response.status });
        showStatus('We could not send your message. Please try again. Your entries have been kept.', 'error');
        return;
      }
      form.reset();
      fields.forEach(({ control, error }) => {
        control.removeAttribute('aria-invalid');
        error.textContent = '';
      });
      showStatus('Your message has been sent. Thank you for contacting us.', 'success');
    } catch (error) {
      // Do not log the request payload, endpoint, or potentially sensitive response body.
      // eslint-disable-next-line no-console
      console.error('Contact Us: ticket submission request failed', { error: error?.name });
      showStatus('We could not send your message. Please try again. Your entries have been kept.', 'error');
    } finally {
      submitting = false;
      button.disabled = false;
      button.textContent = 'Send message';
    }
  });
}
