# Staff Hub code becomes 062019 (and actually gets checked)

## What you asked

The Staff Hub's own sign-in code should be 062019, same as the device passcode.

## What I found

The database check behind the Staff Hub code box currently **ignores whatever is typed** — any code (or even gibberish) signs you in as the admin. So this change does two things at once: sets the code to 062019 and makes the box genuinely verify it.

## What changes

1. **One database update** — the staff sign-in check now returns the admin staff member only when the typed code is exactly `062019`. Anything else gets the existing "Please enter a valid staff code" message.
2. **No screen changes needed** — the Staff Hub box, the welcome toast, and who-gets-recorded-as-acting all stay exactly as they are; only the accepted code changes.
3. **Nothing else is affected** — the device passcode (062019) for the staff side and stations page is separate and already correct; the two just happen to use the same code now.

## Technical notes

- New migration: `CREATE OR REPLACE FUNCTION public.authenticate_staff_code(p_code text)` keeping the exact current signature `RETURNS TABLE(staff_id uuid, display_name text)` and `SET search_path = public`, with `IF p_code = '062019' THEN` wrapping the existing admin lookup (`WHERE s.role = 'admin' LIMIT 1`).
- The hub lowercases input before sending (`staffCode.toLowerCase()`), which is harmless for a numeric code — no frontend change required.
- Old codes (`mc2025`, `admin2025` from an older revision) stop working everywhere.
- Verify after applying: calling the function with `062019` returns the admin row; calling with a wrong code returns zero rows.
