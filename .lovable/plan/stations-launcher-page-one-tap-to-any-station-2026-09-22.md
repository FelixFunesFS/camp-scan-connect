# Stations launcher page — one tap to any station

## What you asked

A dedicated page that shows every station as a big tap-friendly card, and station pages whose Back button returns to that page instead of the staff dashboard.

## The best way to think about it

Today a station phone is opened from the sidebar menu, and the Back button on a station drops you on the staff dashboard — the wrong place when a phone lives at one station all day. The right model is a **station launcher**: one page that is itself the home base for on-site staff devices. You bookmark `/stations` on each station phone; opening the station and going back always stays inside that two-screen loop (launcher → station → launcher), never touching the rest of the staff app.

So the stations page should be a simple full-screen grid of large cards — designed for thumbs, not a menu — and every station's Back button points at it.

## What I'll build

1. **New Stations page (`/stations`)** — behind the staff passcode like everything else.
   - One large card per station, in a 2-column grid on phones (wider on tablets/desktop): Meal, Drinks, Headphones, Golf Carts, Walkie Talkies, Fanny Packs, T-Shirts, Main Gate.
   - Each card shows the station's icon and name; tapping the whole card opens that station.
   - Full-screen layout without the sidebar, so it works like a kiosk home screen; a small "Staff menu" link at the bottom goes to the full staff dashboard for anyone who needs it.

2. **Back button fix** — every station page (all eight) uses the same shared scanner screen, whose Back button currently says "Back to Main Hub" and goes to `/`. That single button changes to **"Back to Stations"** → `/stations`, which fixes all eight stations at once.

3. **Sidebar** — add a "Stations" item at the top of the Station Operations section so desktop staff can reach the launcher too.

## Technical notes

- New `src/pages/StationsPage.tsx`: card grid (icon + name), `navigate()` on tap, mobile-first grid (`grid-cols-2` → `sm:grid-cols-3` → `lg:grid-cols-4`).
- `src/App.tsx`: add `/stations` route wrapped in the staff gate; add `/stations` to the chrome-free page list in `src/components/AppLayout.tsx` (same treatment as `/` and `/staff`).
- `src/components/UnifiedStationScanner.tsx`: change the header button from `navigate("/")` / "Back to Main Hub" to `navigate("/stations")` / "Back to Stations".
- `src/components/AppSidebar.tsx`: add the Stations entry; no other routes or station logic change.

## What's deliberately unchanged

- The stations themselves, the scanner, and all station logic stay exactly as-is.
- The staff dashboard and sidebar keep working; the launcher is additive, not a replacement.
- No database changes.
