-- Update lookup_attendees_by_phone to include meal_plan field
DROP FUNCTION IF EXISTS public.lookup_attendees_by_phone(text);

CREATE OR REPLACE FUNCTION public.lookup_attendees_by_phone(p_phone text)
 RETURNS TABLE(
   attendee_count integer, 
   has_group_order boolean, 
   order_id text, 
   attendee_details jsonb[],
   order_companions jsonb[]
 )
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
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
            a.order_id as attendee_order_id,
            a.activated_at as attendee_activated_at,
            a.meal_plan,
            rt.uid as rfid_uid,
            rt.activated_at as rfid_activated_at,
            rt.status as rfid_status
        FROM attendees a
        LEFT JOIN rfid_tags rt ON rt.attendee_id = a.id AND rt.status = 'active'
        WHERE normalize_phone(a.phone) = normalized_phone
    ),
    -- Get order companions (people in same orders but different phones)
    order_companions AS (
        SELECT DISTINCT
            oc.id,
            oc.first_name,
            oc.last_name,
            oc.order_id as companion_order_id,
            oc.phone as companion_phone,
            oc.activated_at as companion_activated_at,
            oc.meal_plan as companion_meal_plan,
            rt2.uid as companion_rfid_uid,
            rt2.activated_at as companion_rfid_activated_at,
            rt2.status as companion_rfid_status
        FROM phone_attendees pa
        INNER JOIN attendees oc ON oc.order_id = pa.attendee_order_id 
            AND oc.order_id IS NOT NULL 
            AND oc.order_id != ''
            AND normalize_phone(oc.phone) != normalized_phone
        LEFT JOIN rfid_tags rt2 ON rt2.attendee_id = oc.id AND rt2.status = 'active'
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
                    'meal_plan', pa.meal_plan,
                    'rfid_uid', pa.rfid_uid,
                    'activated_at', pa.attendee_activated_at,
                    'rfid_activated_at', pa.rfid_activated_at,
                    'rfid_status', pa.rfid_status,
                    'is_activated', CASE WHEN pa.attendee_activated_at IS NOT NULL THEN true ELSE false END
                )
            ) as details,
            COALESCE(ARRAY_AGG(
                CASE WHEN oc.id IS NOT NULL THEN
                    jsonb_build_object(
                        'id', oc.id,
                        'name', oc.first_name || ' ' || oc.last_name,
                        'order_id', oc.companion_order_id,
                        'phone', oc.companion_phone,
                        'meal_plan', oc.companion_meal_plan,
                        'rfid_uid', oc.companion_rfid_uid,
                        'activated_at', oc.companion_activated_at,
                        'rfid_activated_at', oc.companion_rfid_activated_at,
                        'rfid_status', oc.companion_rfid_status,
                        'is_activated', CASE WHEN oc.companion_activated_at IS NOT NULL THEN true ELSE false END
                    )
                ELSE NULL END
            ) FILTER (WHERE oc.id IS NOT NULL), ARRAY[]::jsonb[]) as companions
        FROM phone_attendees pa
        LEFT JOIN order_companions oc ON true
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
        s.details as result_details,
        s.companions as result_companions
    FROM summary s
    INTO result_record;
    
    -- Return results using the function's return column names
    RETURN QUERY SELECT 
        result_record.result_attendee_count,
        result_record.result_has_group,
        result_record.result_order_id,
        result_record.result_details,
        result_record.result_companions;
END;
$function$;