CREATE OR REPLACE FUNCTION public.check_station_access(p_attendee_id uuid)
 RETURNS TABLE(has_access boolean, access_reason text, activation_status text, rfid_status text)
 LANGUAGE plpgsql STABLE SET search_path TO 'public'
AS $function$
DECLARE
  v_event uuid := public.current_event_id();
  a record; t record; v_ops boolean;
BEGIN
  SELECT * INTO a FROM public.attendees WHERE id = p_attendee_id AND event_id = v_event;
  IF a IS NULL THEN
    RETURN QUERY SELECT false, 'Attendee not found for the current event'::text, 'unknown'::text, 'none'::text; RETURN;
  END IF;
  v_ops := a.ticket_type = 'operational_worker';
  SELECT r.uid, r.status::text AS status INTO t FROM public.rfid_tags r
  WHERE r.attendee_id = a.id
  ORDER BY (r.status = 'active') DESC, r.issued_at DESC NULLS LAST LIMIT 1;

  IF NOT v_ops AND NOT COALESCE(a.waiver_signed, false) THEN
    RETURN QUERY SELECT false, 'Liability waiver not signed'::text, 'inactive'::text, COALESCE(t.status, 'none');
  ELSIF t.uid IS NULL THEN
    RETURN QUERY SELECT false, 'No wristband assigned'::text, 'inactive'::text, 'none'::text;
  ELSIF t.status = 'active' OR (v_ops AND t.status = 'assigned') THEN
    RETURN QUERY SELECT true, 'Access granted'::text, 'active'::text, t.status;
  ELSE
    RETURN QUERY SELECT false, 'Wristband is not activated'::text, 'inactive'::text, t.status;
  END IF;
END;
$function$;

CREATE OR REPLACE FUNCTION public.auto_activate_ops_tag()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.attendee_id IS NOT NULL AND NEW.status = 'assigned'
     AND EXISTS (SELECT 1 FROM public.attendees WHERE id = NEW.attendee_id AND ticket_type = 'operational_worker') THEN
    NEW.status := 'active';
    NEW.activation_method := 'staff_assisted';
    NEW.activated_at := COALESCE(NEW.activated_at, now());
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_activate_ops_tag ON public.rfid_tags;
CREATE TRIGGER trg_auto_activate_ops_tag BEFORE INSERT OR UPDATE OF attendee_id, status ON public.rfid_tags
FOR EACH ROW EXECUTE FUNCTION public.auto_activate_ops_tag();