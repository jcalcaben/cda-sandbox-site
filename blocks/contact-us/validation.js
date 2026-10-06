export const CATEGORIES = ['Buyer', 'Seller', 'Tech Partner', 'OMS Sterling'];
export const MAX_FILE_SIZE = 5 * 1024 * 1024;
export const MAX_TOTAL_SIZE = 10 * 1024 * 1024;
export const MAX_FILES = 3;
export const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'text/plain'];

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Return a field-to-label-key map, suitable for inline errors. */
export function validateContactForm(values, files) {
  const errors = {};
  ['name', 'email', 'subject', 'description'].forEach((field) => {
    if (!values[field]?.trim()) errors[field] = `${field}Required`;
  });
  if (!errors.email && !EMAIL_PATTERN.test(values.email.trim())) errors.email = 'emailInvalid';
  if (values.category && !CATEGORIES.includes(values.category)) errors.category = 'categoryInvalid';

  const selected = Array.from(files || []);
  if (selected.length > MAX_FILES || selected.reduce((sum, file) => sum + file.size, 0) > MAX_TOTAL_SIZE) {
    errors.attachments = 'attachmentTooLarge';
  } else if (selected.some((file) => file.size > MAX_FILE_SIZE)) {
    errors.attachments = 'attachmentTooLarge';
  } else if (selected.some((file) => !ALLOWED_TYPES.includes(file.type))) {
    errors.attachments = 'attachmentInvalidType';
  }
  return errors;
}
