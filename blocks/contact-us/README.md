# Contact Us Block

## Overview

The Contact Us block renders a support ticket form for the support page. It collects the customer name, email address, and message as required fields, with optional category, order number, and SKU fields.

## Integration

- The block posts JSON to the fixed App Builder action endpoint:
  `https://3117813-snowdemo-stage.adobeioruntime.net/api/v1/web/service-now/submit-ticket`
- The request payload includes `name`, `email`, and `message` as required fields.
- Optional fields submitted when provided: `category`, `orderNumber`, and `sku`.
- Category options are fixed to:
  - Buyer
  - Seller
  - Tech Partner
  - OMS Sterling

## Authoring

- Block definition: `blocks/contact-us/_contact-us.json`
- No author-configurable fields are exposed in DA; the endpoint is hardcoded in the block JS.
- The block is intended to decorate an existing `<div class="contact-us"></div>` mount point.

## Labels

User-facing labels and messages are read from `placeholders/contact-us.json` with fallback text in the block for local development.

## Behavior

1. Validates required fields client-side before submit.
2. Validates email format before sending the request.
3. Sends a POST request with `Content-Type: application/json`.
4. Shows an inline success or error state after submission.
5. Re-enables the submit button after the request completes.

## Error Handling

- Missing required fields are shown inline and prevent submission.
- Network and non-2xx responses show the error message state.
- The block does not log form values.
