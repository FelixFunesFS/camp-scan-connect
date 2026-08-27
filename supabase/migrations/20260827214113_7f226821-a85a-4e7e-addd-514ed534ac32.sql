CREATE OR REPLACE FUNCTION public.attendee_status_for_event(p_attendee_ids uuid[], p_event_id uuid DEFAULT NULL)
RETURNS TABLE(
  attendee_id uuid,
  credential_uid text,
  credential_status text,
  has_credential boolean,
  is_checked_in boolean,
  waiver_signed boolean,
  checked_in_at timestamptz
)
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $$
  SELECT a.id,
         t.uid,
         t.status::text,
         t.uid IS NOT NULL,
         COALESCE(t.status::text = 'active', false),
         COALESCE(a.waiver_signed, false),
         a.checked_in_at
  FROM public.attendees a
  LEFT JOIN LATERAL (
    SELECT r.uid, r.status
    FROM public.rfid_tags r
    WHERE r.attendee_id = a.id
      AND r.event_id = COALESCE(p_event_id, a.event_id)
      AND r.status IN ('assigned', 'active')
    ORDER BY (r.status = 'active') DESC, r.issued_at DESC NULLS LAST
    LIMIT 1
  ) t ON true
  WHERE a.id = ANY (COALESCE(p_attendee_ids, ARRAY[]::uuid[]))
    AND (p_event_id IS NULL OR a.event_id = p_event_id);
$$;

CREATE OR REPLACE FUNCTION public.credential_lookup(p_uid text, p_event_id uuid DEFAULT NULL)
RETURNS TABLE(
  found boolean,
  wrong_event boolean,
  event_year integer,
  credential_uid text,
  credential_status text,
  attendee_id uuid,
  attendee_name text,
  waiver_signed boolean,
  is_checked_in boolean
)
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $$
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
    COALESCE(tag.status::text = 'active', false)
  FROM tag
  LEFT JOIN public.attendees a ON a.id = tag.attendee_id;
$$;

GRANT EXECUTE ON FUNCTION public.attendee_status_for_event(uuid[], uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.credential_lookup(text, uuid) TO anon, authenticated, service_role;