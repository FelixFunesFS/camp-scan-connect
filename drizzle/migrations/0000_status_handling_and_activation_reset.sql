-- 1. Keep the original RegFox wording so waiting list can be split out of Pending later
ALTER TABLE public.attendees ADD COLUMN IF NOT EXISTS regfox_raw_status text;

-- 2. Expose registration status to scanners
DROP FUNCTION IF EXISTS public.credential_lookup(text, uuid);
CREATE FUNCTION public.credential_lookup(p_uid text, p_event_id uuid DEFAULT NULL)
RETURNS TABLE(
  found boolean, wrong_event boolean, event_year integer,
  credential_uid text, credential_status text, attendee_id uuid,
  attendee_name text, waiver_signed boolean, is_checked_in boolean,
  registration_status text
)
LANGUAGE sql STABLE SET search_path TO 'public'
AS $function$
  WITH ev AS (SELECT COALESCE(p_event_id, public.current_event_id()) AS eid),
  tag AS (
    SELECT r.*, e.year
    FROM public.rfid_tags r
    JOIN public.events e ON e.id = r.event_id
    WHERE upper(r.uid) = upper(trim(p_uid))
    ORDER BY (r.event_id = (SELECT eid FROM ev)) DESC, e.year DESC
    LIMIT 1
  )
  SELECT
    tag.uid IS NOT NULL,
    COALESCE(tag.event_id <> (SELECT eid FROM ev), false),
    tag.year,
    tag.uid,
    tag.status::text,
    a.id,
    NULLIF(trim(COALESCE(a.first_name,'') || ' ' || COALESCE(a.last_name,'')), ''),
    COALESCE(a.waiver_signed, false),
    COALESCE(tag.status::text = 'active', false),
    a.registration_status::text
  FROM tag
  LEFT JOIN public.attendees a ON a.id = tag.attendee_id;
$function$;
GRANT EXECUTE ON FUNCTION public.credential_lookup(text, uuid) TO anon, authenticated, service_role;

-- 3. Block cancelled registrations at the source (self check-in + staff group activation)
CREATE OR REPLACE FUNCTION public.activate_entire_order_by_phone(p_phone text, p_activation_method text)
 RETURNS TABLE(order_id text, total_attendees integer, activated_count integer, already_active_count integer, attendee_details jsonb, warnings text[])
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
  v_status text;
BEGIN
  FOR r IN SELECT * FROM public.attendees_for_phone(p_phone, v_event) LOOP
    v_total := v_total + 1;
    v_name := r.first_name || ' ' || r.last_name;
    IF v_order IS NULL THEN v_order := r.order_id; END IF;

    SELECT a.registration_status::text INTO v_status FROM public.attendees a WHERE a.id = r.id;

    IF v_status IN ('cancelled', 'abandoned', 'transferred') THEN
      v_warnings := v_warnings || (v_name || '''s registration is ' || v_status || ' — see staff');
      v_details := v_details || jsonb_build_object(
        'attendee_id', r.id, 'name', v_name, 'result', 'blocked',
        'reason', 'registration_' || v_status);
      CONTINUE;
    END IF;

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
    v_warnings := v_warnings || 'No registration found for this phone number';
  END IF;

  RETURN QUERY SELECT v_order, v_total, v_activated, v_already, v_details, v_warnings;
END;
$function$;

CREATE OR REPLACE FUNCTION public.activate_selected_by_phone(p_phone text, p_attendee_ids uuid[], p_activation_method text)
 RETURNS TABLE(order_id text, total_attendees integer, activated_count integer, already_active_count integer, attendee_details jsonb, warnings text[])
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
  v_status text;
BEGIN
  FOR r IN
    SELECT f.*
    FROM public.attendees_for_phone(p_phone, v_event) f
    WHERE f.id = ANY (COALESCE(p_attendee_ids, ARRAY[]::uuid[]))
  LOOP
    v_total := v_total + 1;
    v_name := r.first_name || ' ' || r.last_name;
    IF v_order IS NULL THEN v_order := r.order_id; END IF;

    SELECT a.registration_status::text INTO v_status FROM public.attendees a WHERE a.id = r.id;

    IF v_status IN ('cancelled', 'abandoned', 'transferred') THEN
      v_warnings := v_warnings || (v_name || '''s registration is ' || v_status || ' — see staff');
      v_details := v_details || jsonb_build_object(
        'attendee_id', r.id, 'name', v_name, 'result', 'blocked',
        'reason', 'registration_' || v_status);
      CONTINUE;
    END IF;

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

-- 4. Reset the test activations for the active 2026 event
UPDATE public.rfid_tags t
   SET status = 'assigned', activated_at = NULL, activation_method = NULL
 WHERE t.event_id = '00000000-0000-0000-0000-000000002026'
   AND t.status = 'active';

UPDATE public.attendees a
   SET activated_at = NULL,
       checked_in_at = NULL,
       most_recent_activation_at = NULL,
       most_recent_activation_method = NULL
 WHERE a.event_id = '00000000-0000-0000-0000-000000002026';

DELETE FROM public.station_transactions
 WHERE event_id = '00000000-0000-0000-0000-000000002026'
   AND transaction_type <> 'rfid_assign';