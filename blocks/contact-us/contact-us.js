import {
  fetchPlaceholders,
} from '../../scripts/commerce.js';
import {
  buildContactUsPayload,
  getCategoryValues,
  submitTicket,
  validateContactUsForm,
} from './contact-us-utils.js';

function createField({ name, label, type = 'text', required = false, as = 'input', options = [] }) {
  const field = document.createElement('div');
  field.className = `contact-us__field contact-us__field--${name}`;

  const labelEl = document.createElement('label');
  labelEl.setAttribute('for', `contact-us-${name}`);
  labelEl.textContent = label;
  field.append(labelEl);

  const input = as === 'textarea' ? document.createElement('textarea') : document.createElement('input');
  if (as === 'select') {
    const select = document.createElement('select');
    options.forEach((option) => {
      const opt = document.createElement('option');
      opt.value = option.value;
      opt.textContent = option.label;
      select.append(opt);
    });
    field.append(select);
  } else {
    field.append(input);
  }

  const control = field.querySelector('select, input, textarea');
  control.id = `contact-us-${name}`;
  control.name = name;
  if (type !== 'text' && as !== 'textarea' && as !== 'select') control.type = type;
  control.required = required;

  const error = document.createElement('div');
  error.className = 'contact-us__error';
  error.setAttribute('aria-live', 'polite');
  field.append(error);

  return { field, input: control, error };
}

function setFieldError(control, errorEl, message) {
  control.setAttribute('aria-invalid', message ? 'true' : 'false');
  errorEl.textContent = message || '';
}

function renderFallback(fallback, labels) {
  const fallbackBox = document.createElement('div');
  fallbackBox.className = 'contact-us__fallback';

  const heading = document.createElement('h3');
  heading.textContent = labels['ContactUs.Fallback.Heading'] || 'Need more help?';
  fallbackBox.append(heading);

  const description = document.createElement('p');
  description.textContent = 'You can contact support directly using the details below.';
  fallbackBox.append(description);

  if (fallback?.email || fallback?.subject || fallback?.body) {
    const dl = document.createElement('dl');
    [
      ['Email', fallback?.email],
      ['Subject', fallback?.subject],
      ['Body', fallback?.body],
    ].forEach(([term, value]) => {
      if (!value) return;
      const dt = document.createElement('dt');
      dt.textContent = term;
      const dd = document.createElement('dd');
      dd.textContent = value;
      dl.append(dt, dd);
    });
    fallbackBox.append(dl);
  }

  return fallbackBox;
}

export default async function decorate(block) {
  const labels = await fetchPlaceholders();
  block.classList.add('contact-us');
  block.innerHTML = '';

  const form = document.createElement('form');
  form.className = 'contact-us__form';
  form.noValidate = true;

  const grid = document.createElement('div');
  grid.className = 'contact-us__grid';

  const fields = {};
  const categoryOptions = getCategoryValues().map((value) => ({
    value,
    label: labels[`ContactUs.Form.Category.${value.replace(/\s+/g, '')}`] || value,
  }));
  categoryOptions.unshift({
    value: '',
    label: labels['ContactUs.Form.Category.placeholder'] || 'Select a category',
  });

  [
    { name: 'name', label: labels['ContactUs.Form.Name.label'] || 'Name', required: true },
    { name: 'email', label: labels['ContactUs.Form.Email.label'] || 'Email', type: 'email', required: true },
    { name: 'subject', label: labels['ContactUs.Form.Subject.label'] || 'Subject', required: true },
    {
      name: 'category',
      label: labels['ContactUs.Form.Category.label'] || 'Category',
      as: 'select',
      options: categoryOptions,
    },
    { name: 'orderNumber', label: labels['ContactUs.Form.OrderNumber.label'] || 'Order Number' },
    { name: 'sku', label: labels['ContactUs.Form.Sku.label'] || 'SKU' },
    {
      name: 'description',
      label: labels['ContactUs.Form.Description.label'] || 'Description',
      as: 'textarea',
      required: true,
    },
  ].forEach((config) => {
    const created = createField(config);
    fields[config.name] = created;
    if (config.name === 'description') created.field.classList.add('contact-us__field--full');
    grid.append(created.field);
  });

  const actions = document.createElement('div');
  actions.className = 'contact-us__actions';

  const submit = document.createElement('button');
  submit.type = 'submit';
  submit.className = 'button primary contact-us__submit';
  submit.textContent = labels['ContactUs.Form.Submit.label'] || 'Submit';
  actions.append(submit);

  const status = document.createElement('div');
  status.className = 'contact-us__status';
  status.setAttribute('aria-live', 'polite');

  form.append(grid, actions, status);
  block.append(form);

  const readValues = () => Object.fromEntries(Object.entries(fields).map(([name, { input }]) => [name, input.value]));

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    status.textContent = '';
    status.className = 'contact-us__status';
    block.querySelector('.contact-us__fallback')?.remove();

    const validation = validateContactUsForm(readValues());
    Object.entries(fields).forEach(([name, { input, error }]) => {
      setFieldError(input, error, validation.errors[name]);
    });

    if (!validation.valid) return;

    submit.disabled = true;
    submit.textContent = labels['ContactUs.Form.Submitting.label'] || 'Submitting...';

    const payload = buildContactUsPayload(validation.values);
    const result = await submitTicket(payload);
    if (result?.success) {
      status.classList.add('contact-us__status--success');
      status.textContent = labels['ContactUs.Form.Success.message'] || 'Thanks — your support request has been submitted.';
      form.reset();
      Object.values(fields).forEach(({ input, error }) => setFieldError(input, error, ''));
    } else {
      status.classList.add('contact-us__status--error');
      status.textContent = labels['ContactUs.Form.Error.message'] || 'We could not submit your request right now.';
      block.append(renderFallback(result?.fallback, labels));
    }

    submit.disabled = false;
    submit.textContent = labels['ContactUs.Form.Submit.label'] || 'Submit';
  });
}
