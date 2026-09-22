ALTER TABLE public.attendees ADD COLUMN IF NOT EXISTS site_detail text;

WITH picked AS (
  SELECT a.id,
         COALESCE(
           NULLIF(a.custom_fields->>'premiumTentSite', ''),
           NULLIF(a.custom_fields->>'premiumTentSite3', ''),
           NULLIF(a.custom_fields->>'dryCampingTentSite', ''),
           NULLIF(a.custom_fields->>'preferredRvSpaceNote', ''),
           NULLIF(a.custom_fields->>'preferredPremiumVanRoof', ''),
           NULLIF(a.custom_fields->>'preferredPremiumVanRoof2', ''),
           NULLIF(a.custom_fields->>'winnebagoLotPreferredRv', ''),
           NULLIF(a.custom_fields->>'whichGlampingTentKing', ''),
           NULLIF(a.custom_fields->>'glampingTent', ''),
           NULLIF(a.custom_fields->>'glampingTentKingBunks', ''),
           NULLIF(a.custom_fields->>'glampingTentDoubleQueen', ''),
           NULLIF(a.custom_fields->>'cabinRegistrationOptions2', '')
         ) AS detail
  FROM public.attendees a
)
UPDATE public.attendees a
SET site_detail = p.detail
FROM picked p
WHERE p.id = a.id
  AND p.detail IS NOT NULL
  AND p.detail !~ '^option[0-9]+$';

WITH order_detail AS (
  SELECT event_id, order_id, min(site_detail) AS detail
  FROM public.attendees
  WHERE site_detail IS NOT NULL AND order_id IS NOT NULL AND order_id <> ''
  GROUP BY event_id, order_id
)
UPDATE public.attendees a
SET site_detail = o.detail
FROM order_detail o
WHERE a.site_detail IS NULL
  AND a.event_id = o.event_id
  AND a.order_id = o.order_id;

DROP FUNCTION IF EXISTS public.attendees_for_phone(text, uuid);

CREATE FUNCTION public.attendees_for_phone(p_phone text, p_event_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(id uuid, first_name text, last_name text, phone text, order_id text, waiver_signed boolean, is_direct boolean, is_veteran boolean, meal_plan text, ticket_type text, arrival_window text, arrival_day text, site_location_assignment text, site_detail text, registration_status text)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
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
         EXISTS (SELECT 1 FROM direct d WHERE d.id = a.id),
         COALESCE(a.is_veteran, false),
         a.meal_plan::text,
         a.ticket_type::text,
         a.arrival_window,
         a.arrival_day,
         a.site_location_assignment::text,
         a.site_detail,
         a.registration_status::text
  FROM public.attendees a, ev
  WHERE a.event_id = ev.eid
    AND (a.id IN (SELECT id FROM direct) OR a.order_id IN (SELECT order_id FROM orders))
  ORDER BY 7 DESC, a.last_name, a.first_name;
$function$;

GRANT EXECUTE ON FUNCTION public.attendees_for_phone(text, uuid) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.lookup_attendees_by_phone(p_phone text)
 RETURNS TABLE(attendee_count integer, has_group_order boolean, order_id text, attendee_details jsonb, order_companions jsonb)
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$
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
      'is_veteran', f.is_veteran,
      'meal_plan', f.meal_plan,
      'ticket_type', f.ticket_type,
      'arrival_window', f.arrival_window,
      'arrival_day', f.arrival_day,
      'site_location_assignment', f.site_location_assignment,
      'site_detail', f.site_detail,
      'registration_status', f.registration_status,
      'rfid_uid', t.uid,
      'rfid_status', t.status,
      'has_rfid', t.uid IS NOT NULL,
      'is_active', t.status = 'active',
      'blocked_reason', CASE
        WHEN f.registration_status IS NOT NULL
             AND f.registration_status NOT IN ('registered', 'pending') THEN 'registration_' || f.registration_status
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
$function$;