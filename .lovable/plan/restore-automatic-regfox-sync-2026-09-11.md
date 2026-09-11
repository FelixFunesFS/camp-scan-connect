# Restore Automatic RegFox Sync

## Current findings

- The RegFox connection and 2026 form mapping work: the live comparison successfully read **888 non-abandoned registrants** from RegFox form **982600**.
- The local 2026 roster contains **795 RegFox-linked attendees**, leaving **93 RegFox attendees missing**.
- The last completed import was a **manual sync on August 31, 2026**. There are no later scheduled runs.
- No scheduler extension or active scheduled job exists in the current database.
- Historical scheduler files point to a different, retired backend, so they cannot update this app.
- There is no actual RegFox webhook receiver. The dashboard's “Webhook active” and “Live” labels currently describe local database updates, not a verified live RegFox connection.
- The manual importer itself is healthy: pagination, 2026 event/form routing, and duplicate protection are working.

## Recommended approach

Use a **RegFox webhook as the immediate signal** and the RegFox API as the source of truth. When RegFox reports an addition or supported change, the webhook should request a targeted API refresh instead of writing the untrusted webhook payload directly. Most supported changes should arrive within seconds.

Because RegFox's public webhook documentation does not clearly guarantee a separate event for every cancellation, refund, or transfer path, also run one **hourly reconciliation**. That backstop catches missed deliveries and changes RegFox does not emit. The result is faster than polling alone and safer than relying on webhooks alone.

## Implementation plan

1. **Add and configure the RegFox webhook receiver**
   - Create a dedicated endpoint for RegFox events and configure that URL in the 2026 RegFox form.
   - Confirm the exact events available on this RegFox account for new registrations, edits, cancellations/refunds, and transfers.
   - Validate the webhook using RegFox's documented verification method; reject malformed, oversized, replayed, or unrelated-form requests.
   - Store a delivery ID and event summary so retries are idempotent and failures are auditable.
   - Use the registration/form identifiers from the notification to fetch authoritative data from the RegFox API, then update the correct 2026 attendee.

2. **Restore reconciliation scheduling on the current backend**
   - Install the supported scheduling/network extensions.
   - Create one scheduled job targeting this project's `regfox-scheduled-sync` function.
   - Run it hourly against the active event and its bound RegFox form as a webhook safety net.
   - Remove or replace legacy scheduler definitions that reference the retired backend.

3. **Handle the full registration lifecycle**
   - New registration: create the attendee through the existing idempotent mapping.
   - Edited reservation: refresh names, contact details, lodging, meal, shirt, waiver, payment/registration status, and order membership supplied by RegFox.
   - Cancellation/refund: mark the attendee cancelled without deleting local wristband, check-in, waiver, or station history.
   - Transfer: refresh both affected registration records and preserve the prior attendee's operational audit trail; flag ambiguous transfers for staff review rather than guessing.
   - Full removal from RegFox: surface a reconciliation warning and require review instead of deleting the local record automatically.

4. **Make sync locking atomic**
   - Replace the separate “check, then start” flow with one database operation that reserves a sync slot.
   - Prevent webhook, manual, and scheduled runs from starting simultaneously or losing queued changes.
   - Keep stale-run cleanup so a crashed import cannot block future runs.

5. **Correct success and failure reporting**
   - Count records only after each batch is written successfully.
   - Mark partially failed imports as warnings/errors instead of green success.
   - Record scheduled-run errors and progress consistently in sync history.

6. **Protect administrative sync controls**
   - Validate authorized staff access inside manual sync, cancel, cleanup, configuration, comparison, and reconciliation functions.
   - Give the scheduled endpoint a server-only invocation path so public visitors cannot trigger imports or reset locks.

7. **Make the dashboard truthful and useful**
   - Replace the false hardcoded “Webhook active” indicator with actual webhook health: verified, delayed, failed, or never received.
   - Enable live database updates for attendees and sync logs so the dashboard reflects completed webhook imports without refreshing.
   - Label webhook deliveries separately from manual and scheduled reconciliations.
   - Scope registrant activity and sync history to the selected event.
   - Show last successful sync, next expected sync, imported count, skipped unchanged count, and actionable errors.

8. **Reconcile the current roster**
   - Run a full 2026 import after deployment to bring in the 93 missing attendees.
   - Re-run the comparison and require zero RegFox records missing locally.
   - Preserve cancelled, pending, and transferred statuses; do not delete local operational history or wristband assignments.

9. **Verify end to end**
   - Send RegFox test events for add, edit, cancel/refund, and transfer; document which events this account actually emits.
   - Confirm supported webhook changes arrive within seconds without opening the app.
   - Confirm one hourly reconciliation appears without opening the app and recovers a deliberately missed webhook change.
   - Verify repeated runs create no duplicates and do not overwrite check-in, wristband, waiver, or station activity maintained by the app.
   - Test manual sync, scheduled sync, concurrent trigger rejection, stale-run recovery, and visible failure states.

## Technical notes

- Keep `event_id + regfox_registration_id` as the idempotent identity.
- Continue using cursor pagination and content hashes to minimize writes.
- Treat records removed entirely from RegFox as reconciliation warnings rather than automatically deleting them, because local check-in and station history may already exist.
- “Live” will mean seconds for webhook-covered events, with an hourly maximum recovery window for missed or unsupported event types.
- If RegFox does not expose a usable verification mechanism or the required change events for this account, fall back to a five-minute API reconciliation during active registration periods and hourly reconciliation otherwise.
