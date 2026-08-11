-- A partial unique index cannot serve as an ON CONFLICT target for the
-- Data API's upsert. A plain unique index still permits many NULLs, so
-- walk-up attendees without a RegFox record are unaffected.
DROP INDEX IF EXISTS public.attendees_event_regfox_registration_key;

CREATE UNIQUE INDEX IF NOT EXISTS attendees_event_regfox_registration_key
  ON public.attendees (event_id, regfox_registration_id);