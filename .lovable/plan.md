# REGFOX_APP_TOKEN removed — webhook validation finalized

## Done
- Deleted the `REGFOX_APP_TOKEN` secret (it held the literal word "blank"; RegFox sends no app token).
- The `regfox-webhook` function now validates deliveries using the signing secret (`REGFOX_WEBHOOK_SECRET`) HMAC check only — the standard secure approach.

## Remaining verification
- Trigger a test webhook from RegFox and confirm the Developer Dashboard webhook timeline shows an accepted delivery (not 401).
- Confirm an unsigned/unauthenticated request still returns 401.
- Hourly reconciliation sync remains active as the safety net.
