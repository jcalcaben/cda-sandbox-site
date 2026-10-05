# Contact Us block

The `/support` document contains a `contact-us` mount. The block reads `contact-us-endpoint` from `default-site.json` and sends a public, unauthenticated `POST` with `application/json` to the submit-ticket action. Required fields are name, email, subject, and description; optional fields are category, orderNumber, sku, and attachments. The form does not transmit its honeypot field.

Attachments are limited to three files, 5 MiB each and 10 MiB total; accepted MIME types are PDF, JPEG, PNG, and plain text. Selected files are encoded as base64 JSON objects (`name`, `contentType`, `size`, `data`). The client validates before encoding, never retries automatically, retains values on failure, and renders the backend's fallback contact option when available. The endpoint must permit browser CORS requests from the storefront origin.

Labels and error messages are read from `Global.ContactUs.*` in the da.live Global placeholders sheet. The built-in UI defaults keep the form usable until those sheet rows are published. Run `npm run build:json` after changing block definition metadata to regenerate the root editor component files.
