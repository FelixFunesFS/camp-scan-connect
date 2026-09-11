# RegFox webhook authentication update

## What RegFox is asking for
In RegFox webhook settings, the fields it wants you to paste in are credentials RegFox will send with every webhook call to our endpoint. Our current `regfox-webhook` receiver only validates a shared signing secret (`REGFOX_WEBHOOK_SECRET`), so if RegFox requires an App Key and App/API Token, the receiver will reject the webhooks until we teach it to accept them.

## Proposed changes
1. **Make `regfox-webhook` accept the App/API Token in the most common RegFox header formats:**
   - `Authorization: Bearer <token>`
   - `x-regfox-app-token`
   - `x-api-token`
   - `x-webhook-secret`
   Validate the token against a new `REGFOX_APP_TOKEN` secret (falling back to the existing `REGFOX_WEBHOOK_SECRET` so current behavior keeps working).

2. **Optionally validate the App Key:** if `REGFOX_APP_KEY` is configured, require the `x-regfox-app-key` header to match it. If the user leaves App Key blank in RegFox, the receiver ignores this check.

3. **Add two runtime secrets** (`REGFOX_APP_KEY` and `REGFOX_APP_TOKEN`) through the secure secret form.

4. **Keep HMAC signature support intact** for users who configure a separate signing secret.

5. **Test the endpoint** with an unauthorized request (should 401) and a request carrying the configured App/API Token (should 202).

## Values to paste into RegFox
- **Webhook URL:** `https://mpysltpzzboomkpulmii.supabase.co/functions/v1/regfox-webhook`
- **App Key:** a public identifier; can be any strong random string if RegFox lets you choose it.
- **App/API Token:** a strong random secret. The same value must be saved as `REGFOX_APP_TOKEN` in this project.
- **Signing Secret (if shown):** a strong random secret, saved as `REGFOX_WEBHOOK_SECRET`. Use this only if RegFox offers a separate signing-secret field.
