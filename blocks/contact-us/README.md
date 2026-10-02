# Contact Us block

Insert **Contact Us** into a section in DA or use an empty `<div class="contact-us"></div>` on the support page. The block builds its own form; it has no authorable fields. Keep page headings and introductory text in the authored page.

Set `public.default.support-ticket-endpoint` in `default-site.json` to the ticket service's **full HTTPS POST URL**. Until configured, the form displays an unavailable message and cannot submit. The endpoint must permit CORS requests from the storefront origin and accept unauthenticated `application/json` POSTs. If the service requires an API key or other secret, route the request through a secure server-side service instead of adding credentials to public configuration or browser code.

Payload: required `name`, `email`, `subject`, `description`; optional nonempty `category`, `orderNumber`, `sku`. No attachments are collected or sent in v1. Required inputs and email format are checked in the browser, but the service must repeat validation. Any 2xx response counts as success; other responses and network failures keep entered values for retry. Do not publish a production form until the real endpoint, CORS policy, and ticket service contract have been confirmed.
