-- Fix the ambiguous column reference issue in lookup_attendees_by_phone
CREATE OR REPLACE FUNCTION public.lookup_attendees_by_phone(p_phone text)
RETURNS TABLE(
    attendee_count integer,
    has_group_order boolean,
    order_id text,
    attendee_details jsonb[]
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
    normalized_phone TEXT;
    result_record RECORD;
BEGIN
    -- Normalize the phone number
    normalized_phone := normalize_phone(p_phone);
    
    -- Get attendee details for this phone number with explicit column references
    WITH phone_attendees AS (
        SELECT 
            a.id,
            a.first_name,
            a.last_name,
            a.order_id as attendee_order_id,  -- Explicitly alias to avoid ambiguity
            a.activated_at as attendee_activated_at,
            rt.uid as rfid_uid,
            rt.activated_at as rfid_activated_at,
            rt.status as rfid_status
        FROM attendees a
        LEFT JOIN rfid_tags rt ON rt.attendee_id = a.id AND rt.status = 'active'
        WHERE normalize_phone(a.phone) = normalized_phone
    ),
    summary AS (
        SELECT 
            COUNT(*) as total_count,
            COUNT(DISTINCT NULLIF(pa.attendee_order_id, '')) as distinct_orders,
            MIN(pa.attendee_order_id) as first_order_id,
            ARRAY_AGG(
                jsonb_build_object(
                    'id', pa.id,
                    'name', pa.first_name || ' ' || pa.last_name,
                    'order_id', pa.attendee_order_id,
                    'rfid_uid', pa.rfid_uid,
                    'activated_at', pa.attendee_activated_at,
                    'rfid_activated_at', pa.rfid_activated_at,
                    'rfid_status', pa.rfid_status,
                    'is_activated', CASE WHEN pa.attendee_activated_at IS NOT NULL THEN true ELSE false END
                )
            ) as details
        FROM phone_attendees pa
    )
    SELECT 
        s.total_count::integer as result_attendee_count,
        CASE 
            WHEN s.distinct_orders = 1 AND s.first_order_id IS NOT NULL AND s.first_order_id != '' THEN true
            ELSE false
        END as result_has_group,
        CASE 
            WHEN s.distinct_orders = 1 AND s.first_order_id IS NOT NULL AND s.first_order_id != '' THEN s.first_order_id
            ELSE NULL
        END as result_order_id,
        s.details as result_details
    FROM summary s
    INTO result_record;
    
    -- Return results using the function's return column names
    RETURN QUERY SELECT 
        result_record.result_attendee_count,
        result_record.result_has_group,
        result_record.result_order_id,
        result_record.result_details;
END;
$function$;