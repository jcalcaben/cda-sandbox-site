/** Encode a validated attachment as the submit-ticket action's JSON data field. */
function encodeFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Attachment read failed'));
    reader.onload = () => {
      if (typeof reader.result !== 'string' || !reader.result.includes(',')) {
        reject(new Error('Attachment encoding failed'));
        return;
      }
      resolve({
        name: file.name,
        contentType: file.type,
        size: file.size,
        data: reader.result.slice(reader.result.indexOf(',') + 1),
      });
    };
    reader.readAsDataURL(file);
  });
}

/** Submit once; interactive requests are never retried automatically. */
export async function submitContactForm(endpoint, values, files = []) {
  try {
    if (!endpoint || !/^https:\/\//i.test(endpoint)) throw new Error('Invalid endpoint configuration');
    const payload = { ...values };
    if (files.length) payload.attachments = await Promise.all(files.map(encodeFile));

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    // eslint-disable-next-line no-console
    console.info('contact-us submit-ticket', { status: response.status, success: response.ok });
    const result = await response.json();
    if (!result || typeof result !== 'object' || Array.isArray(result)) {
      throw new Error('Invalid response format');
    }
    if (response.ok && result.success === true) return { success: true, case: result.case };
    return { success: false, error: result.error, fallback: result.fallback };
  } catch (error) {
    // Never log the payload, uploaded content, or response body.
    // eslint-disable-next-line no-console
    console.error('contact-us submit-ticket failed', { operation: 'submit-ticket', reason: error.name });
    return { success: false };
  }
}
