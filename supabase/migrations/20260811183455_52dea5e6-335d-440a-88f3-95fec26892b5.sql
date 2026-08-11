-- Each event owns its own RegFox form, so an import can never land in the wrong year.
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS regfox_form_id text;

CREATE UNIQUE INDEX IF NOT EXISTS events_regfox_form_id_key
  ON public.events (regfox_form_id)
  WHERE regfox_form_id IS NOT NULL;

-- The old single-column unique key cannot support a per-event upsert.
ALTER TABLE public.attendees
  DROP CONSTRAINT IF EXISTS attendees_regfox_registration_id_key;
DROP INDEX IF EXISTS public.attendees_regfox_registration_id_key;

CREATE UNIQUE INDEX IF NOT EXISTS attendees_event_regfox_registration_key
  ON public.attendees (event_id, regfox_registration_id)
  WHERE regfox_registration_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS attendees_event_phone_idx
  ON public.attendees (event_id, phone)
  WHERE phone IS NOT NULL;

-- Harden the sync helpers: fixed search_path, staff-only execution.
CREATE OR REPLACE FUNCTION public.cleanup_stuck_syncs()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  UPDATE public.regfox_sync_log
     SET status = 'error',
         error_message = COALESCE(error_message, 'Sync timed out with no heartbeat'),
         sync_completed_at = now()
   WHERE status = 'in_progress'
     AND COALESCE(heartbeat_at, sync_started_at)
         < now() - (COALESCE(sync_timeout_minutes, 30) || ' minutes')::interval;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.can_start_sync()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.cleanup_stuck_syncs();
  RETURN NOT EXISTS (
    SELECT 1 FROM public.regfox_sync_log WHERE status = 'in_progress'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.release_sync_lock(p_sync_id uuid DEFAULT NULL)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  UPDATE public.regfox_sync_log
     SET status = 'error',
         error_message = COALESCE(error_message, 'Sync cancelled'),
         sync_completed_at = now()
   WHERE status = 'in_progress'
     AND (p_sync_id IS NULL OR id = p_sync_id);
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.cleanup_stuck_syncs() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.can_start_sync() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.release_sync_lock(uuid) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.cleanup_stuck_syncs() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_start_sync() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.release_sync_lock(uuid) TO authenticated, service_role;