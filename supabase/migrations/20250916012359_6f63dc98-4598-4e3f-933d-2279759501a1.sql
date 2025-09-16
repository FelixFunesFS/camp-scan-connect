-- Create function to lookup attendees by phone without activating
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
    target_order_id TEXT;
    attendee_count_val INTEGER;
    has_group_val BOOLEAN;
BEGIN
    -- Normalize the phone number
    normalized_phone := normalize_phone(p_phone);
    
    -- Get attendee details for this phone number
    WITH phone_attendees AS (
        SELECT 
            a.id,
            a.first_name,
            a.last_name,
            a.order_id,
            a.activated_at,
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
            COUNT(DISTINCT NULLIF(order_id, '')) as distinct_orders,
            MIN(order_id) as first_order_id,
            ARRAY_AGG(
                jsonb_build_object(
                    'id', id,
                    'name', first_name || ' ' || last_name,
                    'order_id', order_id,
                    'rfid_uid', rfid_uid,
                    'activated_at', activated_at,
                    'rfid_activated_at', rfid_activated_at,
                    'rfid_status', rfid_status,
                    'is_activated', CASE WHEN activated_at IS NOT NULL THEN true ELSE false END
                )
            ) as details
        FROM phone_attendees
    )
    SELECT 
        s.total_count::integer,
        CASE 
            WHEN s.distinct_orders = 1 AND s.first_order_id IS NOT NULL AND s.first_order_id != '' THEN true
            ELSE false
        END as has_group,
        CASE 
            WHEN s.distinct_orders = 1 AND s.first_order_id IS NOT NULL AND s.first_order_id != '' THEN s.first_order_id
            ELSE NULL
        END as order_id,
        s.details
    FROM summary s
    INTO attendee_count_val, has_group_val, target_order_id, attendee_details;
    
    -- Return results
    RETURN QUERY SELECT attendee_count_val, has_group_val, target_order_id, attendee_details;
END;
$function$;