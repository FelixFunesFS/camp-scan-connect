CREATE TABLE public.regfox_webhook_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_key text NOT NULL UNIQUE,
  event_type text,
  regfox_form_id text,
  regfox_registration_id text,
  payload_hash text NOT NULL,
  status text NOT NULL DEFAULT 'received' CHECK (status IN ('received', 'processing', 'processed', 'ignored', 'error')),
  sync_id uuid REFERENCES public.regfox_sync_log(id) ON DELETE SET NULL,
  error_message text,
  received_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.regfox_webhook_deliveries TO authenticated;
GRANT ALL ON public.regfox_webhook_deliveries TO service_role;

ALTER TABLE public.regfox_webhook_deliveries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin staff can read RegFox webhook deliveries"
ON public.regfox_webhook_deliveries
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.staff s
    WHERE s.user_id = auth.uid() AND s.role = 'admin'
  )
);

CREATE TRIGGER update_regfox_webhook_deliveries_updated_at
BEFORE UPDATE ON public.regfox_webhook_deliveries
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX regfox_webhook_deliveries_received_idx
ON public.regfox_webhook_deliveries (received_at DESC);

CREATE OR REPLACE FUNCTION public.begin_regfox_sync(
  p_sync_type text,
  p_event_id uuid,
  p_progress_info jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sync_id uuid;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('regfox-sync'));
  PERFORM public.cleanup_stuck_syncs();

  IF EXISTS (SELECT 1 FROM public.regfox_sync_log WHERE status = 'in_progress') THEN
    RETURN NULL;
  END IF;

  INSERT INTO public.regfox_sync_log (
    sync_type,
    status,
    event_id,
    sync_started_at,
    heartbeat_at,
    sync_timeout_minutes,
    progress_info
  ) VALUES (
    p_sync_type,
    'in_progress',
    p_event_id,
    now(),
    now(),
    10,
    COALESCE(p_progress_info, '{}'::jsonb)
  )
  RETURNING id INTO v_sync_id;

  RETURN v_sync_id;
END;
$$;

REVOKE ALL ON FUNCTION public.begin_regfox_sync(text, uuid, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.begin_regfox_sync(text, uuid, jsonb) TO service_role;