import { fetchPlaceholders } from '../../scripts/commerce.js';

const ENDPOINT = 'https://3117813-snowdemo-stage.adobeioruntime.net/api/v1/web/service-now/submit-ticket';

const CATEGORY_OPTIONS = [
  { value: 'Buyer', labelKey: 'CategoryOptionBuyer' },
  { value: 'Seller', labelKey: 'CategoryOptionSeller' },
  { value: 'Tech Partner', labelKey: 'CategoryOptionTechPartner' },
  { value: 'OMS Sterling', labelKey: 'CategoryOptionOmsSterling' },
];

function getLabel(labels, key, fallback) {
  return labels?.ContactUs?.[key] || labels?.Global?.[key] || fallback;
}

function createField({ label, name, type = 'text', required = false, as = 'input', options = [] }) {
  const wrapper = document.createElement('div');
  wrapper.className = 'contact-us__field';

  const labelEl = document.createElement('label');
  labelEl.className = 'contact-us__label';
  labelEl.setAttribute('for', name);
  labelEl.textContent = label;

  let control;
  if (as === 'textarea') {
    control = document.createElement('textarea');
    control.rows = 7;
  } else if (as === 'select') {
    control = document.createElement('select');
    options.forEach((option) => {
      const optionEl = document.createElement('option');
      optionEl.value = option.value;
      optionEl.textContent = option.label;
      control.append(optionEl);
    });
  } else {
    control = document.createElement('input');
    control.type = type;
  }

  control.id = name;
  control.name = name;
  control.className = 'contact-us__control';
  if (required) control.required = true;

  wrapper.append(labelEl, control);
  return { wrapper, control };
}

function setFieldError(field, message) {
  const { wrapper, control } = field;
  let error = wrapper.querySelector('.contact-us__error');
  if (!error) {
    error = document.createElement('div');
    error.className = 'contact-us__error';
    error.id = `${control.id}-error`;
    wrapper.append(error);
  }
  error.textContent = message;
  control.setAttribute('aria-invalid', 'true');
  control.setAttribute('aria-describedby', error.id);
}

function clearFieldError(field) {
  const { wrapper, control } = field;
  const error = wrapper.querySelector('.contact-us__error');
  if (error) error.remove();
  control.removeAttribute('aria-invalid');
  control.removeAttribute('aria-describedby');
}

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function buildPayload(formData) {
  const payload = {
    name: `${formData.get('name') || ''}`.trim(),
    email: `${formData.get('email') || ''}`.trim(),
    message: `${formData.get('message') || ''}`.trim(),
  };

  const category = `${formData.get('category') || ''}`.trim();
  const orderNumber = `${formData.get('orderNumber') || ''}`.trim();
  const sku = `${formData.get('sku') || ''}`.trim();

  if (category) payload.category = category;
  if (orderNumber) payload.orderNumber = orderNumber;
  if (sku) payload.sku = sku;

  return payload;
}

function setStatus(stateEl, labels, type, ticketNumber) {
  stateEl.innerHTML = '';
  stateEl.hidden = false;

  const message = document.createElement('p');
  message.className = `contact-us__status contact-us__status--${type}`;

  if (type === 'success') {
    const template = getLabel(labels, 'SuccessMessage', 'Your request has been submitted. Ticket reference: {ticketNumber}');
    message.textContent = template.replace('{ticketNumber}', ticketNumber || '—');
  } else {
    message.textContent = getLabel(labels, 'ErrorMessage', "We couldn't submit your request. Please try again later.");
  }

  stateEl.append(message);
}

export default async function decorate(block) {
  const labels = await fetchPlaceholders();

  const wrapper = document.createElement('div');
  wrapper.className = 'contact-us';

  const form = document.createElement('form');
  form.className = 'contact-us__form';
  form.noValidate = true;

  const title = document.createElement('h2');
  title.className = 'contact-us__title';
  title.textContent = 'Contact Us';

  const description = document.createElement('p');
  description.className = 'contact-us__description';
  description.textContent = 'Tell us how we can help and we will route your request to the right team.';

  const nameField = createField({ label: getLabel(labels, 'NameLabel', 'Full Name'), name: 'name', required: true });
  const emailField = createField({ label: getLabel(labels, 'EmailLabel', 'Email Address'), name: 'email', type: 'email', required: true });
  const messageField = createField({ label: getLabel(labels, 'MessageLabel', 'Message'), name: 'message', as: 'textarea', required: true });
  const categoryField = createField({
    label: getLabel(labels, 'CategoryLabel', 'Category'),
    name: 'category',
    as: 'select',
    options: [
      { value: '', label: 'Select a category' },
      ...CATEGORY_OPTIONS.map((option) => ({ value: option.value, label: getLabel(labels, option.labelKey, option.value) })),
    ],
  });
  const orderNumberField = createField({ label: getLabel(labels, 'OrderNumberLabel', 'Order Number (optional)'), name: 'orderNumber' });
  const skuField = createField({ label: getLabel(labels, 'SkuLabel', 'Product SKU (optional)'), name: 'sku' });

  const actions = document.createElement('div');
  actions.className = 'contact-us__actions';

  const submit = document.createElement('button');
  submit.type = 'submit';
  submit.className = 'contact-us__submit';
  submit.textContent = getLabel(labels, 'SubmitButton', 'Submit Request');

  const submitHelp = document.createElement('p');
  submitHelp.className = 'contact-us__submit-help';
  submitHelp.textContent = 'Pressing submit will send your request to our support team.';

  const state = document.createElement('div');
  state.className = 'contact-us__state';
  state.hidden = true;
  state.setAttribute('role', 'status');
  state.setAttribute('aria-live', 'polite');
  state.setAttribute('aria-atomic', 'true');

  actions.append(submit, submitHelp);
  form.append(
    title,
    description,
    nameField.wrapper,
    emailField.wrapper,
    messageField.wrapper,
    categoryField.wrapper,
    orderNumberField.wrapper,
    skuField.wrapper,
    actions,
    state,
  );
  wrapper.append(form);
  block.replaceChildren(wrapper);

  const fields = [nameField, emailField, messageField, categoryField, orderNumberField, skuField];

  form.addEventListener('input', () => {
    fields.forEach(clearFieldError);
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    fields.forEach(clearFieldError);
    state.hidden = true;

    const formData = new FormData(form);
    const payload = buildPayload(formData);
    let hasErrors = false;

    if (!payload.name) {
      setFieldError(nameField, 'Please enter your name.');
      hasErrors = true;
    }
    if (!payload.email) {
      setFieldError(emailField, 'Please enter your email address.');
      hasErrors = true;
    } else if (!validateEmail(payload.email)) {
      setFieldError(emailField, 'Please enter a valid email address.');
      hasErrors = true;
    }
    if (!payload.message) {
      setFieldError(messageField, 'Please enter your message.');
      hasErrors = true;
    }

    if (hasErrors) {
      const firstError = form.querySelector('[aria-invalid="true"]');
      firstError?.focus();
      return;
    }

    submit.disabled = true;
    submit.setAttribute('aria-busy', 'true');
    const originalSubmitLabel = submit.textContent;
    submit.textContent = getLabel(labels, 'SubmittingButton', 'Submitting...');

    try {
      const response = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`contact-us submit failed with status ${response.status}`);
      }

      let ticketNumber = '—';
      try {
        const result = await response.json();
        ticketNumber = result?.ticketNumber || result?.reference || result?.ticket || ticketNumber;
      } catch (error) {
        ticketNumber = '—';
      }

      form.reset();
      setStatus(state, labels, 'success', ticketNumber);
      state.focus?.();
    } catch (error) {
      console.error('contact-us submit error', { operation: 'contact-us-submit' });
      setStatus(state, labels, 'error');
      state.focus?.();
    } finally {
      submit.disabled = false;
      submit.removeAttribute('aria-busy');
      submit.textContent = originalSubmitLabel;
    }
  });
}
