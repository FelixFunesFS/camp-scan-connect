-- Drop and recreate lookup function with new signature, then add order activation function
DROP FUNCTION IF EXISTS public.lookup_attendees_by_phone(text);

-- Recreate lookup_attendees_by_phone with order companions
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

-- Create new function to activate entire order by phone
CREATE OR REPLACE FUNCTION public.activate_entire_order_by_phone(p_phone text, p_activation_method text DEFAULT 'self_activated'::text)
 RETURNS TABLE(order_id text, total_attendees integer, activated_count integer, already_active_count integer, attendee_details jsonb[])
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    normalized_phone TEXT;
    target_order_id TEXT;
    attendee_count INTEGER;
BEGIN
    -- Normalize the phone number
    normalized_phone := normalize_phone(p_phone);
    
    -- Find the order_id for this phone number
    SELECT DISTINCT a.order_id INTO target_order_id
    FROM attendees a
    WHERE normalize_phone(a.phone) = normalized_phone
    AND a.order_id IS NOT NULL 
    AND a.order_id != ''
    LIMIT 1;
    
    -- If no order found, return empty result
    IF target_order_id IS NULL THEN
        RETURN;
    END IF;
    
    -- Check how many attendees are in this order
    SELECT COUNT(*) INTO attendee_count
    FROM attendees a
    WHERE a.order_id = target_order_id;
    
    -- If no attendees found, return empty result
    IF attendee_count = 0 THEN
        RETURN;
    END IF;
    
    -- Activate all RFID tags for ALL attendees in this order (if they exist)
    UPDATE rfid_tags 
    SET activated_at = CASE 
        WHEN activated_at IS NULL THEN NOW() 
        ELSE activated_at 
    END,
    activation_method = CASE 
        WHEN activated_at IS NULL THEN p_activation_method
        ELSE activation_method 
    END
    WHERE attendee_id IN (
        SELECT a2.id FROM attendees a2 WHERE a2.order_id = target_order_id
    );
    
    -- Also update attendees activated_at timestamp for ALL attendees in this order
    UPDATE attendees a3
    SET activated_at = CASE 
        WHEN activated_at IS NULL THEN NOW() 
        ELSE activated_at 
    END
    WHERE a3.order_id = target_order_id;
    
    -- Return summary information for ALL attendees in this order
    RETURN QUERY
    WITH order_summary AS (
        SELECT 
            target_order_id as result_order_id,
            COUNT(*)::integer as result_total_attendees,
            COUNT(CASE WHEN rt.activated_at IS NOT NULL THEN 1 END)::integer as result_activated_count,
            COUNT(CASE WHEN rt.activated_at < NOW() - INTERVAL '1 minute' THEN 1 END)::integer as result_already_active_count,
            ARRAY_AGG(
                jsonb_build_object(
                    'name', a.first_name || ' ' || a.last_name,
                    'order_id', a.order_id,
                    'phone', a.phone,
                    'rfid_uid', rt.uid,
                    'activated_at', rt.activated_at,
                    'was_already_active', (rt.activated_at IS NOT NULL AND rt.activated_at < NOW() - INTERVAL '1 minute'),
                    'has_rfid', (rt.uid IS NOT NULL)
                )
            ) as result_attendee_details
        FROM attendees a
        LEFT JOIN rfid_tags rt ON rt.attendee_id = a.id AND rt.status = 'active'
        WHERE a.order_id = target_order_id
    )
    SELECT 
        os.result_order_id,
        os.result_total_attendees,
        os.result_activated_count,
        os.result_already_active_count,
        os.result_attendee_details
    FROM order_summary os;
END;
$function$;