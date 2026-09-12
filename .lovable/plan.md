# Event Announcements — Push Notification Test

Goal: send a short announcement from an admin screen and have it pop up on staff phones that installed the app on their home screen, so you can test it before the event.

## How it will work

1. A staff member opens the app (installed on the home screen, or in its own browser tab) and taps **Enable announcements**. The phone asks for notification permission once.
2. The app saves that phone's push address in the database, tied to a device name the staff member types (for example "Front gate iPhone").
3. An admin opens **Announcements**, types a title and message, picks who gets it, and taps **Send**.
4. Every registered phone shows a notification, even when the app is closed. Tapping it opens the app.
5. The Announcements page keeps a history: what was sent, when, how many phones got it, and how many failed.

## What you need to do

Connecting Firebase Cloud Messaging is required — it is the service that actually delivers notifications to phones. I will open the connect card during the build, and it needs the **Include web push** option selected. Without it, nothing can be delivered.

Also note: on iPhone, notifications only work if the app is installed to the home screen. In a normal Safari tab they will not appear. Android works either way.

## Build steps

1. **Connect Firebase Cloud Messaging** (web push included).
2. **Database**: new `push_devices` table (device label, push address, staff/role tag, last seen) and `announcements` table (title, body, audience, sent time, delivered/failed counts). Row-level security so only signed-in staff can register a device and only admins can send.
3. **Enable notifications flow**: a small card in the Staff Hub with the enable button and clear messages for the cases where it can't work — permission denied, opened inside the preview frame, unsupported browser, or Firebase not connected yet.
4. **Service worker** file so notifications appear while the app is closed.
5. **Announcements page** (admin): compose form, audience picker (all devices, or a chosen station/role), send button, live result summary, and history list.
6. **Send function**: server-side send through Firebase, removes dead device addresses automatically, records per-announcement results.
7. **Test mode**: a "Send test to my device only" button so you can try it without alerting everyone.

## Technical notes

- Client registration uses `firebase/messaging` with the connector's Vite variables; `messagingSenderId` is derived from the app ID.
- `public/firebase-messaging-sw.js` reads config from the query string passed at registration.
- Sending happens in a Supabase edge function calling `v1/projects/_/messages:send` through the Lovable connector gateway; tokens returning UNREGISTERED are deleted.
- Audience filtering is a simple tag on `push_devices`; no per-user auth changes.
- Mobile-first layout consistent with the rest of the app; no changes to scanning, assignment, or sync logic.
