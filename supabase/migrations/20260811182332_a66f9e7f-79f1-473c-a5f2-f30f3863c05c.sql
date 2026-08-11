
-- 1. Event scoping for sync history
ALTER TABLE public.regfox_sync_log
  ADD COLUMN IF NOT EXISTS event_id uuid DEFAULT '00000000-0000-0000-0000-000000002026'::uuid;

CREATE INDEX IF NOT EXISTS idx_regfox_sync_log_event ON public.regfox_sync_log(event_id);
CREATE INDEX IF NOT EXISTS idx_regfox_sync_log_status ON public.regfox_sync_log(status);

-- 2. Attendee sync tracking columns
ALTER TABLE public.attendees
  ADD COLUMN IF NOT EXISTS regfox_registration_id text,
  ADD COLUMN IF NOT EXISTS regfox_order_id text,
  ADD COLUMN IF NOT EXISTS last_synced_at timestamptz,
  ADD COLUMN IF NOT EXISTS sync_hash text;

-- Unique per event so the same registration can never be imported twice
CREATE UNIQUE INDEX IF NOT EXISTS idx_attendees_regfox_reg_unique
  ON public.attendees(event_id, regfox_registration_id)
  WHERE regfox_registration_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_attendees_event ON public.attendees(event_id);
CREATE INDEX IF NOT EXISTS idx_attendees_order ON public.attendees(event_id, order_id);

-- 3. Extend registration_status enum for walk-ups and transfers
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
                 WHERE t.typname = 'registration_status' AND e.enumlabel = 'walk_up') THEN
    ALTER TYPE registration_status ADD VALUE 'walk_up';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
                 WHERE t.typname = 'registration_status' AND e.enumlabel = 'transferred') THEN
    ALTER TYPE registration_status ADD VALUE 'transferred';
  END IF;
END $$;

-- 4. Sync locking: reap stale syncs, then report whether a new one may start
CREATE OR REPLACE FUNCTION public.cleanup_stuck_syncs()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer := 0;
BEGIN
  UPDATE public.regfox_sync_log
  SET status = 'error',
      error_message = COALESCE(error_message, 'Sync timed out - no heartbeat'),
      sync_completed_at = now(),
      cancelled_at = now()
  WHERE status = 'in_progress'
    AND cancelled_at IS NULL
    AND COALESCE(heartbeat_at, sync_started_at, created_at)
        < now() - (COALESCE(sync_timeout_minutes, 10) || ' minutes')::interval;

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
DECLARE
  v_active integer;
BEGIN
  PERFORM public.cleanup_stuck_syncs();

  SELECT count(*) INTO v_active
  FROM public.regfox_sync_log
  WHERE status = 'in_progress' AND cancelled_at IS NULL;

  RETURN v_active = 0;
END;
$$;

CREATE OR REPLACE FUNCTION public.release_sync_lock(p_sync_id uuid DEFAULT NULL)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer := 0;
BEGIN
  UPDATE public.regfox_sync_log
  SET status = 'error',
      error_message = COALESCE(error_message, 'Sync cancelled'),
      cancelled_at = now(),
      sync_completed_at = now()
  WHERE status = 'in_progress'
    AND cancelled_at IS NULL
    AND (p_sync_id IS NULL OR id = p_sync_id);

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.can_start_sync() TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.cleanup_stuck_syncs() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.release_sync_lock(uuid) TO authenticated, service_role;
