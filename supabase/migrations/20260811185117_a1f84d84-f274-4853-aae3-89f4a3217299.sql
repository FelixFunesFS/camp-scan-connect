
CREATE INDEX IF NOT EXISTS idx_attendees_event_phone ON public.attendees (event_id, phone);
CREATE INDEX IF NOT EXISTS idx_attendees_event_order ON public.attendees (event_id, order_id);
CREATE INDEX IF NOT EXISTS idx_rfid_tags_event_status ON public.rfid_tags (event_id, status);
CREATE INDEX IF NOT EXISTS idx_rfid_tags_attendee ON public.rfid_tags (attendee_id);

CREATE OR REPLACE FUNCTION public.current_event_id()
RETURNS uuid
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT id FROM public.events WHERE is_active = true ORDER BY year DESC LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.normalize_phone_digits(p_phone text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT right(regexp_replace(coalesce(p_phone, ''), '[^0-9]', '', 'g'), 10);
$$;

-- Everyone tied to a phone number, for the active event: the direct matches
-- plus anyone else on the same order.
CREATE OR REPLACE FUNCTION public.attendees_for_phone(p_phone text, p_event_id uuid DEFAULT NULL)
RETURNS TABLE(
  id uuid,
  first_name text,
  last_name text,
  phone text,
  order_id text,
  waiver_signed boolean,
  is_direct boolean
)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  WITH ev AS (SELECT COALESCE(p_event_id, public.current_event_id()) AS eid),
  digits AS (SELECT public.normalize_phone_digits(p_phone) AS d),
  direct AS (
    SELECT a.*
    FROM public.attendees a, ev, digits
    WHERE a.event_id = ev.eid
      AND length(digits.d) = 10
      AND public.normalize_phone_digits(a.phone) = digits.d
  ),
  orders AS (
    SELECT DISTINCT d.order_id FROM direct d WHERE d.order_id IS NOT NULL AND d.order_id <> ''
  )
  SELECT a.id, a.first_name, a.last_name, a.phone, a.order_id,
         COALESCE(a.waiver_signed, false),
         EXISTS (SELECT 1 FROM direct d WHERE d.id = a.id)
  FROM public.attendees a, ev
  WHERE a.event_id = ev.eid
    AND (a.id IN (SELECT id FROM direct) OR a.order_id IN (SELECT order_id FROM orders))
  ORDER BY 7 DESC, a.last_name, a.first_name;
$$;

CREATE OR REPLACE FUNCTION public.lookup_attendees_by_phone(p_phone text)
RETURNS TABLE(attendee_count integer, has_group_order boolean, order_id text, attendee_details jsonb, order_companions jsonb)
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  v_rows jsonb;
  v_direct jsonb;
  v_companions jsonb;
  v_order text;
  v_count integer;
BEGIN
  SELECT COALESCE(jsonb_agg(x ORDER BY x->>'last_name'), '[]'::jsonb) INTO v_rows
  FROM (
    SELECT jsonb_build_object(
      'id', f.id,
      'attendee_id', f.id,
      'first_name', f.first_name,
      'last_name', f.last_name,
      'name', f.first_name || ' ' || f.last_name,
      'phone', f.phone,
      'order_id', f.order_id,
      'waiver_signed', f.waiver_signed,
      'is_direct_match', f.is_direct,
      'rfid_uid', t.uid,
      'rfid_status', t.status,
      'has_rfid', t.uid IS NOT NULL,
      'is_active', t.status = 'active',
      'blocked_reason', CASE
        WHEN NOT f.waiver_signed THEN 'waiver_required'
        WHEN t.uid IS NULL THEN 'needs_rfid'
        ELSE NULL END
    ) AS x
    FROM public.attendees_for_phone(p_phone) f
    LEFT JOIN LATERAL (
      SELECT r.uid, r.status::text
      FROM public.rfid_tags r
      WHERE r.attendee_id = f.id
      ORDER BY (r.status = 'active') DESC, r.issued_at DESC NULLS LAST
      LIMIT 1
    ) t ON true
  ) s;

  SELECT COALESCE(jsonb_agg(e), '[]'::jsonb) INTO v_direct
  FROM jsonb_array_elements(v_rows) e WHERE (e->>'is_direct_match')::boolean;

  SELECT COALESCE(jsonb_agg(e), '[]'::jsonb) INTO v_companions
  FROM jsonb_array_elements(v_rows) e WHERE NOT (e->>'is_direct_match')::boolean;

  v_count := jsonb_array_length(v_rows);
  SELECT e->>'order_id' INTO v_order FROM jsonb_array_elements(v_rows) e
  WHERE e->>'order_id' IS NOT NULL LIMIT 1;

  RETURN QUERY SELECT
    v_count,
    v_count > 1,
    v_order,
    v_rows,
    v_companions;
END;
$$;

-- Core activation used by all three activation entry points.
CREATE OR REPLACE FUNCTION public.activate_entire_order_by_phone(p_phone text, p_activation_method text)
RETURNS TABLE(order_id text, total_attendees integer, activated_count integer, already_active_count integer, attendee_details jsonb, warnings text[])
LANGUAGE plpgsql
SET search_path = public
AS $$
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
  FOR r IN SELECT * FROM public.attendees_for_phone(p_phone, v_event) LOOP
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
    v_warnings := v_warnings || 'No registration found for this phone number';
  END IF;

  RETURN QUERY SELECT v_order, v_total, v_activated, v_already, v_details, v_warnings;
END;
$$;

CREATE OR REPLACE FUNCTION public.activate_group_by_phone(p_phone text, p_activation_method text)
RETURNS TABLE(order_id text, total_attendees integer, activated_count integer, already_active_count integer, attendee_details jsonb, warnings text[])
LANGUAGE sql
SET search_path = public
AS $$
  SELECT * FROM public.activate_entire_order_by_phone(p_phone, p_activation_method);
$$;

CREATE OR REPLACE FUNCTION public.activate_remaining_rfids_by_phone(p_phone text, p_activation_method text)
RETURNS TABLE(order_id text, total_attendees integer, activated_count integer, already_active_count integer, attendee_details jsonb, warnings text[])
LANGUAGE sql
SET search_path = public
AS $$
  SELECT * FROM public.activate_entire_order_by_phone(p_phone, p_activation_method);
$$;

CREATE OR REPLACE FUNCTION public.check_station_access(p_attendee_id uuid)
RETURNS TABLE(has_access boolean, access_reason text, activation_status text, rfid_status text)
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  v_event uuid := public.current_event_id();
  a record;
  t record;
BEGIN
  SELECT * INTO a FROM public.attendees WHERE id = p_attendee_id AND event_id = v_event;
  IF a IS NULL THEN
    RETURN QUERY SELECT false, 'Attendee not found for the current event'::text, 'unknown'::text, 'none'::text;
    RETURN;
  END IF;

  SELECT r.uid, r.status::text AS status INTO t
  FROM public.rfid_tags r
  WHERE r.attendee_id = a.id
  ORDER BY (r.status = 'active') DESC, r.issued_at DESC NULLS LAST
  LIMIT 1;

  IF NOT COALESCE(a.waiver_signed, false) THEN
    RETURN QUERY SELECT false, 'Liability waiver not signed'::text, 'inactive'::text, COALESCE(t.status, 'none');
  ELSIF t.uid IS NULL THEN
    RETURN QUERY SELECT false, 'No wristband assigned'::text, 'inactive'::text, 'none'::text;
  ELSIF t.status <> 'active' THEN
    RETURN QUERY SELECT false, 'Wristband is not activated'::text, 'inactive'::text, t.status;
  ELSE
    RETURN QUERY SELECT true, 'Access granted'::text, 'active'::text, t.status;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.bulk_activate_assigned_rfids()
RETURNS TABLE(activation_successful boolean, total_activated integer, veterans_thanked integer, activated_attendees jsonb, activated_count integer, failed_count integer, details jsonb)
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_event uuid := public.current_event_id();
  v_activated integer := 0;
  v_failed integer := 0;
  v_list jsonb := '[]'::jsonb;
  v_vets integer := 0;
  r record;
BEGIN
  FOR r IN
    SELECT t.uid, a.id AS attendee_id, a.first_name, a.last_name,
           COALESCE(a.waiver_signed, false) AS waiver_signed, COALESCE(a.is_veteran, false) AS is_veteran
    FROM public.rfid_tags t
    JOIN public.attendees a ON a.id = t.attendee_id
    WHERE t.event_id = v_event AND t.status = 'assigned'
  LOOP
    IF NOT r.waiver_signed THEN
      v_failed := v_failed + 1;
      CONTINUE;
    END IF;

    UPDATE public.rfid_tags
       SET status = 'active', activated_at = now(), activation_method = 'staff_assisted'
     WHERE uid = r.uid;

    UPDATE public.attendees
       SET activated_at = COALESCE(activated_at, now()),
           most_recent_activation_at = now(),
           most_recent_activation_method = 'staff_assisted',
           checked_in_at = COALESCE(checked_in_at, now())
     WHERE id = r.attendee_id;

    INSERT INTO public.station_transactions
      (attendee_id, station_type, transaction_type, rfid_uid, activation_method, event_id, current_status)
    VALUES (r.attendee_id, 'activation', 'activate', r.uid, 'staff_assisted', v_event, 'active');

    v_activated := v_activated + 1;
    IF r.is_veteran THEN v_vets := v_vets + 1; END IF;
    v_list := v_list || jsonb_build_object('attendee_id', r.attendee_id,
      'name', r.first_name || ' ' || r.last_name, 'rfid_uid', r.uid);
  END LOOP;

  RETURN QUERY SELECT true, v_activated, v_vets, v_list, v_activated, v_failed,
    jsonb_build_object('blocked_waiver', v_failed, 'event_id', v_event);
END;
$$;
