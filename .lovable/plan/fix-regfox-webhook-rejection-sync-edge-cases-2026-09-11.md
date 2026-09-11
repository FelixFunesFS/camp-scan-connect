# Fix RegFox Webhook Rejection + Sync Edge Cases

The ping from RegFox failed with 401 because RegFox (Webconnex Divvy) sends headers our receiver never looks at.

## What RegFox actually sends

- Signature header: `X-Webconnex-Signature` (we only read `x-regfox-signature` / `x-webhook-signature`)
- Delivery ID header: `X-Webconnex-Delivery` (we only read `x-webhook-id`)
- Event type header: `X-Webconnex-Event` (e.g. `ping`)
- No `Authorization` header and an empty `appToken`, so token auth can never pass — signature is the only valid path
- The app key arrives in the body at `meta.appKey`, not in a header

Result: no recognized signature, no token, so the request is rejected before anything else runs.

## Fixes

1. **Accept the Webconnex headers**
   - Read the signature from `x-webconnex-signature` (keep existing header names as fallbacks).
   - Read the delivery ID from `x-webconnex-delivery` for idempotency.
   - Read the event type from `x-webconnex-event` when the body doesn't carry one.

2. **Validate the signature correctly**
   - Compute HMAC-SHA256 of the exact raw body and compare (constant time) against the header.
   - Try each configured secret in turn (`REGFOX_WEBHOOK_SECRET`, then `REGFOX_APP_KEY`) so we match whichever value RegFox signs with, and log which one matched so we can lock it down afterwards.
   - Optionally cross-check `meta.appKey` in the body against `REGFOX_APP_KEY` when that secret is set.
   - Keep rejecting anything unsigned with 401.

3. **Handle ping deliveries**
   - Short-circuit `eventType === 'ping'`: record the delivery, skip the sync, return 200 so RegFox marks the integration healthy. Today a ping would fall through to the unknown-form path (`formId: 1`).

4. **Duplicate protection (the real duplication risk)**
   - Use the Webconnex delivery ID as the dedupe key so retries of the same delivery (RegFox retries on failure, and our 401s will be retried) can never sync twice.
   - Return 200 on the unique-violation path (already there) and also treat a re-delivered ID that is still `pending` as a duplicate instead of firing a second sync.
   - Wrap the insert failure in a proper error response instead of an unhandled throw (currently returns an opaque 500 that RegFox retries forever).

5. **Concurrency with the hourly job**
   - Webhook-triggered syncs already hit the advisory lock and treat 409 as non-fatal; mark those deliveries `deferred` rather than `processed`, so a burst of webhooks during the hourly run is retried by the next reconciliation rather than silently reported as done.

6. **Verify**
   - Re-send the ping from RegFox and confirm 200 plus a row in the webhook timeline.
   - Confirm an unsigned POST still returns 401.
   - Send a real registration change and confirm one delivery row, one sync, and no duplicate attendee.

## Technical notes

Only `supabase/functions/regfox-webhook/index.ts` changes; the sync function, cron reconciliation, and database schema stay as they are. Secrets in use: `REGFOX_WEBHOOK_SECRET` and `REGFOX_APP_KEY` (`REGFOX_APP_TOKEN` stays removed since RegFox sends an empty token).
