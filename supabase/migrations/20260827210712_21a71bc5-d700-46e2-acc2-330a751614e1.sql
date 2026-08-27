-- 1. Idempotency key for offline-queued / retried scans
ALTER TABLE public.station_transactions ADD COLUMN IF NOT EXISTS client_scan_id uuid;

CREATE UNIQUE INDEX IF NOT EXISTS station_transactions_client_scan_id_key
  ON public.station_transactions (client_scan_id)
  WHERE client_scan_id IS NOT NULL;

-- 2. Activate a selected subset of attendees from a phone lookup
CREATE OR REPLACE FUNCTION public.activate_selected_by_phone(
  p_phone text,
  p_attendee_ids uuid[],
  p_activation_method text
)
RETURNS TABLE(
  order_id text,
  total_attendees integer,
  activated_count integer,
  already_active_count integer,
  attendee_details jsonb,
  warnings text[]
)
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  v_event uuid := public.current_event_id();
  v_method text := CASE WHEN p_activation_method = 'staff_assisted' THEN 'staff_assisted' ELSE 'self_activated' END;
  v_total integer := 0;
  v_activated integer := 0;
  v_already integer := 0;
  v_warnings text[] := ARRAY[]::text[];
  v_details jsonb := '[]'::jsonb;
  v_order text;
  r record;
  v_tag record;
  v_name text;
BEGIN
  FOR r IN
    SELECT f.*
    FROM public.attendees_for_phone(p_phone, v_event) f
    WHERE f.id = ANY (COALESCE(p_attendee_ids, ARRAY[]::uuid[]))
  LOOP
    v_total := v_total + 1;
    v_name := r.first_name || ' ' || r.last_name;
    IF v_order IS NULL THEN v_order := r.order_id; END IF;

    SELECT t.uid, t.status::text INTO v_tag
    FROM public.rfid_tags t
    WHERE t.attendee_id = r.id
    ORDER BY (t.status = 'active') DESC, t.issued_at DESC NULLS LAST
    LIMIT 1;

    IF NOT r.waiver_signed THEN
      v_warnings := v_warnings || (v_name || ' must sign the liability waiver before activation');
      v_details := v_details || jsonb_build_object(
        'attendee_id', r.id, 'name', v_name, 'result', 'blocked',
        'reason', 'waiver_required', 'rfid_uid', v_tag.uid);
      CONTINUE;
    END IF;

    IF v_tag.uid IS NULL THEN
      v_warnings := v_warnings || (v_name || ' has no wristband assigned yet');
      v_details := v_details || jsonb_build_object(
        'attendee_id', r.id, 'name', v_name, 'result', 'blocked', 'reason', 'needs_rfid');
      CONTINUE;
    END IF;

    IF v_tag.status = 'active' THEN
      v_already := v_already + 1;
      v_details := v_details || jsonb_build_object(
        'attendee_id', r.id, 'name', v_name, 'result', 'already_active',
        'reason', NULL, 'rfid_uid', v_tag.uid);
      CONTINUE;
    END IF;

    UPDATE public.rfid_tags
       SET status = 'active', activated_at = now(), activation_method = v_method, deactivated_at = NULL
     WHERE uid = v_tag.uid;

    UPDATE public.attendees
       SET activated_at = COALESCE(activated_at, now()),
           most_recent_activation_at = now(),
           most_recent_activation_method = v_method,
           checked_in_at = COALESCE(checked_in_at, now())
     WHERE id = r.id;

    INSERT INTO public.station_transactions
      (attendee_id, station_type, transaction_type, rfid_uid, activation_method, event_id, current_status)
    VALUES (r.id, 'activation', 'activate', v_tag.uid, v_method, v_event, 'active');

    v_activated := v_activated + 1;
    v_details := v_details || jsonb_build_object(
      'attendee_id', r.id, 'name', v_name, 'result', 'activated',
      'reason', NULL, 'rfid_uid', v_tag.uid);
  END LOOP;

  IF v_total = 0 THEN
    v_warnings := v_warnings || 'No selected attendees matched this phone number';
  END IF;

  RETURN QUERY SELECT v_order, v_total, v_activated, v_already, v_details, v_warnings;
END;
$function$;