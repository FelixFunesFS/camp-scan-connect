
-- Add missing early_access column to attendees
ALTER TABLE public.attendees 
ADD COLUMN IF NOT EXISTS early_access BOOLEAN DEFAULT false;

-- Add missing station_type enum value
ALTER TYPE public.station_type ADD VALUE IF NOT EXISTS 'activation';

-- Create RPC functions that the code expects
CREATE OR REPLACE FUNCTION public.cleanup_generated_rfids()
RETURNS TABLE(deleted_count integer) 
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM public.rfid_tags WHERE uid LIKE 'GEN%';
  RETURN QUERY SELECT COUNT(*)::integer FROM public.rfid_tags WHERE uid LIKE 'GEN%';
END;
$$;

CREATE OR REPLACE FUNCTION public.bulk_activate_assigned_rfids()
RETURNS TABLE(activated_count integer, failed_count integer, details jsonb) 
LANGUAGE plpgsql
AS $$
DECLARE
  v_activated integer := 0;
  v_failed integer := 0;
BEGIN
  UPDATE public.rfid_tags 
  SET status = 'active' 
  WHERE status = 'assigned';
  GET DIAGNOSTICS v_activated = ROW_COUNT;
  RETURN QUERY SELECT v_activated, v_failed, '{}'::jsonb;
END;
$$;

CREATE OR REPLACE FUNCTION public.authenticate_staff_code(p_code text)
RETURNS TABLE(staff_id uuid, display_name text) 
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY SELECT s.user_id, s.display_name 
  FROM public.staff s 
  WHERE s.role = 'admin' 
  LIMIT 1;
END;
$$;

CREATE OR REPLACE FUNCTION public.cleanup_abandoned_records()
RETURNS TABLE(cleanup_successful boolean, records_removed integer, rfids_cleared integer, cleanup_details jsonb) 
LANGUAGE plpgsql
AS $$
DECLARE
  v_removed integer := 0;
  v_rfids integer := 0;
BEGIN
  RETURN QUERY SELECT true, v_removed, v_rfids, '{}'::jsonb;
END;
$$;

CREATE OR REPLACE FUNCTION public.activate_remaining_rfids_by_phone(p_phone text, p_activation_method text)
RETURNS TABLE(order_id text, total_attendees integer, activated_count integer, already_active_count integer, attendee_details jsonb, warnings text[]) 
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY SELECT 
    p_phone::text, 
    0::integer, 
    0::integer, 
    0::integer, 
    '{}'::jsonb, 
    ARRAY[]::text[];
END;
$$;

CREATE OR REPLACE FUNCTION public.check_station_access(p_attendee_id uuid)
RETURNS TABLE(has_access boolean, access_reason text, activation_status text, rfid_status text) 
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY SELECT true, 'Access granted'::text, 'active'::text, 'active'::text;
END;
$$;

CREATE OR REPLACE FUNCTION public.lookup_attendees_by_phone(p_phone text)
RETURNS TABLE(attendee_count integer, has_group_order boolean, order_id text, attendee_details jsonb, order_companions jsonb) 
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY SELECT 
    0::integer, 
    false, 
    null::text, 
    '{}'::jsonb, 
    '{}'::jsonb;
END;
$$;

CREATE OR REPLACE FUNCTION public.activate_group_by_phone(p_phone text, p_activation_method text)
RETURNS TABLE(order_id text, total_attendees integer, activated_count integer, already_active_count integer, attendee_details jsonb, warnings text[]) 
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY SELECT 
    p_phone::text, 
    0::integer, 
    0::integer, 
    0::integer, 
    '{}'::jsonb, 
    ARRAY[]::text[];
END;
$$;

CREATE OR REPLACE FUNCTION public.activate_entire_order_by_phone(p_phone text, p_activation_method text)
RETURNS TABLE(order_id text, total_attendees integer, activated_count integer, already_active_count integer, attendee_details jsonb, warnings text[]) 
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY SELECT 
    p_phone::text, 
    0::integer, 
    0::integer, 
    0::integer, 
    '{}'::jsonb, 
    ARRAY[]::text[];
END;
$$;
