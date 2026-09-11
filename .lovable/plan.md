# Fix REGFOX_APP_TOKEN (currently set to the word "blank")

## Problem
`REGFOX_APP_TOKEN` was saved with the literal value `blank`. The deployed `regfox-webhook` function validates incoming requests against this value, so real RegFox deliveries will fail token validation unless RegFox actually sends the header `x-regfox-app-token: blank`.

## Fix options (pick one)

**Option A — Remove the token check (recommended if RegFox doesn't send a custom token header)**
- Delete the `REGFOX_APP_TOKEN` secret so the webhook relies on the signing secret (`REGFOX_WEBHOOK_SECRET`) HMAC validation only — the standard, secure approach.

**Option B — Replace with the real token**
- Use the secure update form to overwrite `REGFOX_APP_TOKEN` with the actual API token from the RegFox account (RegFox → Account Settings → API), and configure RegFox to send it in the webhook request headers.

## Verification
- Send a test webhook from RegFox and confirm the Developer Dashboard webhook timeline shows an accepted (non-401) delivery.
- Confirm an unauthenticated request still returns 401.
