# Reconnect the Existing RegFox Webhook Secret

## Confirmed state

- The webhook receiver is deployed and expects a runtime secret named `REGFOX_WEBHOOK_SECRET`.
- The current backend’s secure-secret listing does not contain that name.
- The previously configured value may still belong to the retired backend and cannot be read or copied from there.
- Hourly RegFox reconciliation is working and the 2026 roster currently matches at 888 records.

## Plan

1. **Restore the shared secret in the current backend**
   - Save the same strong value used in RegFox under the exact name `REGFOX_WEBHOOK_SECRET`.
   - If the prior value cannot be recovered, create a new shared value and update both RegFox and this app together.

2. **Confirm RegFox webhook configuration**
   - Verify the 2026 form points to the deployed `regfox-webhook` endpoint.
   - Confirm which header and verification format RegFox actually sends.
   - Align the receiver with that documented format rather than assuming a signature shape.

3. **Test safely end to end**
   - Confirm requests without the secret are rejected.
   - Send a signed test notification for form 982600.
   - Verify one delivery is recorded, duplicate delivery is ignored, and the linked RegFox refresh starts successfully.

4. **Verify live change behavior**
   - Test one harmless registration update in RegFox.
   - Confirm the change reaches the 2026 attendee record and appears on the webhook dashboard within seconds.
   - Leave hourly reconciliation enabled as the recovery path for missed or unsupported events.

## Expected result

The previously intended webhook setup will be active on the current backend, with verified delivery rather than relying only on the hourly safety sync.
