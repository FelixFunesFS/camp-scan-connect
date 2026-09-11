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

Use a reliable **near-live API pull every 5 minutes**, rather than presenting the current system as a webhook. Each run will fetch RegFox’s current roster and upsert only new or changed attendees. This is self-healing if one run is missed and does not depend on RegFox webhook delivery.

## Implementation plan

1. **Restore scheduling on the current backend**
   - Install the supported scheduling/network extensions.
   - Create one scheduled job targeting this project's `regfox-scheduled-sync` function.
   - Run it every 5 minutes against the active event and its bound RegFox form.
   - Remove or replace legacy scheduler definitions that reference the retired backend.

2. **Make sync locking atomic**
   - Replace the separate “check, then start” flow with one database operation that reserves a sync slot.
   - Prevent manual and scheduled runs from starting simultaneously.
   - Keep stale-run cleanup so a crashed import cannot block future runs.

3. **Correct success and failure reporting**
   - Count records only after each batch is written successfully.
   - Mark partially failed imports as warnings/errors instead of green success.
   - Record scheduled-run errors and progress consistently in sync history.

4. **Protect administrative sync controls**
   - Validate authorized staff access inside manual sync, cancel, cleanup, configuration, comparison, and reconciliation functions.
   - Give the scheduled endpoint a server-only invocation path so public visitors cannot trigger imports or reset locks.

5. **Make the dashboard truthful and useful**
   - Replace the false “Webhook active” indicator with an actual sync-health status: current, delayed, running, or failed.
   - Rename webhook-only labels to “RegFox activity” unless a true webhook is later configured.
   - Scope registrant activity and sync history to the selected event.
   - Show last successful sync, next expected sync, imported count, skipped unchanged count, and actionable errors.

6. **Reconcile the current roster**
   - Run a full 2026 import after deployment to bring in the 93 missing attendees.
   - Re-run the comparison and require zero RegFox records missing locally.
   - Preserve cancelled, pending, and transferred statuses; do not delete local operational history or wristband assignments.

7. **Verify end to end**
   - Confirm one scheduled run appears without opening the app.
   - Confirm a newly changed RegFox test registration arrives within the five-minute window.
   - Verify repeated runs create no duplicates and do not overwrite check-in, wristband, waiver, or station activity maintained by the app.
   - Test manual sync, scheduled sync, concurrent trigger rejection, stale-run recovery, and visible failure states.

## Technical notes

- Keep `event_id + regfox_registration_id` as the idempotent identity.
- Continue using cursor pagination and content hashes to minimize writes.
- Treat records removed entirely from RegFox as reconciliation warnings rather than automatically deleting them, because local check-in and station history may already exist.
- “Live” will mean a maximum normal delay of about five minutes. A true push webhook can be added later only if RegFox provides a supported webhook event and verification method for this account.
