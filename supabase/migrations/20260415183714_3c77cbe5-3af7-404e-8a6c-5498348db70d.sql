
-- Drop and recreate bulk_activate_assigned_rfids with correct return type
DROP FUNCTION IF EXISTS public.bulk_activate_assigned_rfids();

CREATE OR REPLACE FUNCTION public.bulk_activate_assigned_rfids()
RETURNS TABLE(
    activation_successful boolean, 
    total_activated integer, 
    veterans_thanked integer,
    activated_attendees jsonb,
    activated_count integer, 
    failed_count integer, 
    details jsonb
) 
LANGUAGE plpgsql
AS $$
DECLARE
  v_activated integer := 0;
  v_failed integer := 0;
BEGIN
  UPDATE public.rfid_tags 
  SET status = 'active',
      activated_at = now()
  WHERE status = 'assigned';
  GET DIAGNOSTICS v_activated = ROW_COUNT;
  RETURN QUERY SELECT 
    true, 
    v_activated, 
    0,
    '{}'::jsonb,
    v_activated, 
    v_failed, 
    '{}'::jsonb;
END;
$$;

-- Create format_phone_number function
CREATE OR REPLACE FUNCTION public.format_phone_number(p_format text)
RETURNS TABLE(formatted_phone text)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY SELECT p_format::text;
END;
$$;
