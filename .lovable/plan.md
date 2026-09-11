# RegFox Live Sync: Remaining Edge Cases

Ping now succeeds and the roster is clean: 888 registrants, 888 distinct RegFox IDs, no duplicates, no stuck syncs, hourly reconciliation active. The issues below are the ones that can still bite during the event.

## 1. Hourly sync can erase an on-site signed waiver (highest risk)

Every sync writes `waiver_signed` straight from the RegFox form answer. When someone signs on site, we set that flag locally — the next sync of that person's record sets it back to whatever RegFox says, and they get blocked from activating again.

Fix: never let the sync lower a locally signed waiver. Keep RegFox able to turn it on, but if a signature record exists for that person, the flag stays on. Same protection for `checked_in_at`, `activated_at`, and activation fields (they aren't written today, but the guard makes that explicit).

## 2. Cancelled or refunded registrants keep working wristbands

When RegFox cancels or removes a registration we set the status to `cancelled`, but any wristband already assigned to that person stays `active` and will still scan clean at every station.

Fix: when sync flips someone to cancelled, deactivate their credential and flag it on the staff dashboard so it's a visible decision, not a silent one.

## 3. Transfers create a new person, orphaning the wristband

A transfer in RegFox is a new registration ID: the old row goes to cancelled and a new attendee appears with no wristband. The band physically in the guest's hand still points to the cancelled person.

Fix: detect same-order/same-email replacements and surface a "transfer detected — reassign band" item on the assignment screen so staff move the band in one click.

## 4. A failed webhook delivery is never retried

Deliveries are de-duplicated by the RegFox delivery ID. If our first attempt errors, RegFox re-sends the same ID and we now answer "duplicate" and skip it.

Fix: only treat a delivery as duplicate when it was previously processed or ignored; allow a re-delivery of a failed one to run again.

## 5. Every webhook pulls the whole roster

A single registration change triggers a full 888-record fetch. During a registration burst those pile up, collide with the hourly job, and get deferred up to an hour.

Fix: debounce — if a successful sync finished within the last 60 seconds, acknowledge the delivery and let that sync's result stand. Deferred deliveries also get retried a few minutes later rather than waiting for the top of the hour.

## 6. Housekeeping

- Schedule the existing stuck-sync cleanup (every 15 minutes) so a crashed background job can never hold the lock.
- Trim webhook delivery history older than 30 days.
- During event weekend, raise reconciliation from hourly to every 5 minutes, then back afterwards.

## Technical notes

Changes touch `supabase/functions/_shared/regfox.ts` (waiver/operational field guard), `supabase/functions/regfox-sync/index.ts` (cancellation → credential deactivation, transfer detection), `supabase/functions/regfox-webhook/index.ts` (failed-delivery retry, debounce), plus two cron jobs (stuck-sync cleanup, delivery retention) and a small dashboard panel for cancelled-with-active-band and transfer alerts. No schema changes beyond an optional index on `attendees(regfox_order_id, email)` for transfer matching.
