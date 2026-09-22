# Self Check-In as the Home Page, Everything Else Behind a Passcode

## How to think about this

The app becomes two separate experiences that share nothing visually:

1. **The camper app** — the only thing anyone reaches by default. Phone number in, see who's on the order, sign the waiver if needed, check in. No menu, no links to staff screens, no hint that anything else exists.
2. **The staff app** — every other screen (assignment, staff hub, stations, reports, equipment, developer tools, debrief, scan test). Reached only by typing a hidden web address, unlocked with the passcode 062019, and it stays unlocked on that device until someone signs out.

That split keeps campers from wandering into staff tools while staff keep the one-time-per-device convenience they need on a busy gate.

## What changes for campers

- Opening the app goes straight to the self check-in screen. The old dashboard home page is no longer reachable without signing in.
- No sidebar, no menu, no back-to-hub buttons on that screen.
- Each person's card gets the details they actually care about, laid out so nothing overlaps on a phone:
  - **Veteran** — a clear badge plus a short "Thank you for your service" line on that person's card.
  - **Meal plan** — Standard, Premium, or "No meal plan" so they know what the band covers.
  - **Site type and location** — e.g. Premium RV, and the assigned site location when one is set.
  - **Arrival day** — Thursday or Friday.
  - **Wristband** — Unassigned / Assigned / Active, which already drives the check-in buttons.
- Cancelled registrations keep the refusal already in place: they can't check in and are told to see staff.

## What changes for staff

- A hidden address (`/staff`) shows a passcode box. Correct code unlocks the whole staff side and drops them on the staff dashboard.
- Every staff screen redirects to that passcode box when the device isn't unlocked, so pasting a direct link doesn't bypass it.
- Once unlocked, the device stays unlocked (no re-entry after refresh or reopening). A "Sign out" item in the menu clears it.
- The existing individual staff code sign-in inside the Staff Hub stays as-is, since it also records who performed actions.

## Technical notes

- New `src/contexts/StaffAuthContext.tsx`: holds unlocked state in `localStorage`, exposes `unlock(code)`, `signOut()`, `isUnlocked`. Passcode `062019` compared client-side (this is a shared operational gate, not per-user security; the database policies are unchanged).
- New `src/pages/StaffLogin.tsx` at route `/staff`.
- `src/App.tsx`: `/` renders `ActivationStation`; old dashboard moves to `/dashboard`; every non-camper route wrapped in a `RequireStaff` element that redirects to `/staff`. `/activation` kept as an alias of `/`.
- `src/components/AppLayout.tsx`: treat `/` and `/staff` as chrome-free pages (no sidebar).
- `src/components/AppSidebar.tsx`: point "Dashboard" at `/dashboard`, add a Sign out action; the Self-Service link stays for staff use.
- Database: extend `lookup_attendees_by_phone` (and `attendees_for_phone`, which feeds it) to return `is_veteran`, `meal_plan`, `ticket_type`, `arrival_window`, `site_location_assignment`, `registration_status`. Today it returns none of these, which is exactly why the veteran flag never appears on the check-in screen.
- `src/components/shared/MobileAttendeeCard.tsx`: add site-location display and the veteran thank-you line; remove the leftover `console.log`.
- `src/services/phoneActivationService.ts`: widen the lookup result types for the new fields.
