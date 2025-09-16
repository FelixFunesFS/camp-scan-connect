-- Fix group vs individual orders logic - activate ALL attendees with matching phone number
CREATE OR REPLACE FUNCTION public.activate_group_by_phone(p_phone text, p_activation_method text DEFAULT 'self_activated'::text)
 RETURNS TABLE(order_id text, total_attendees integer, activated_count integer, already_active_count integer, attendee_details jsonb[])
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    normalized_phone TEXT;
    attendee_count INTEGER;
BEGIN
    -- Normalize the phone number
    normalized_phone := normalize_phone(p_phone);
    
    -- Check if any attendees exist with this phone number
    SELECT COUNT(*) INTO attendee_count
    FROM attendees a
    WHERE normalize_phone(a.phone) = normalized_phone;
    
    -- If no attendees found, return empty result
    IF attendee_count = 0 THEN
        RETURN;
    END IF;
    
    -- Activate all RFID tags for ALL attendees with this phone number (if they exist)
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
        SELECT a2.id FROM attendees a2 WHERE normalize_phone(a2.phone) = normalized_phone
    );
    
    -- Also update attendees activated_at timestamp for ALL attendees with this phone
    UPDATE attendees a3
    SET activated_at = CASE 
        WHEN activated_at IS NULL THEN NOW() 
        ELSE activated_at 
    END
    WHERE normalize_phone(a3.phone) = normalized_phone;
    
    -- Return summary information for ALL attendees with this phone number
    RETURN QUERY
    WITH phone_summary AS (
        SELECT 
            CASE 
                WHEN COUNT(DISTINCT NULLIF(a.order_id, '')) = 1 THEN MIN(a.order_id)
                ELSE 'MIXED_ORDERS'
            END as result_order_id,
            COUNT(*)::integer as result_total_attendees,
            COUNT(CASE WHEN rt.activated_at IS NOT NULL THEN 1 END)::integer as result_activated_count,
            COUNT(CASE WHEN rt.activated_at < NOW() - INTERVAL '1 minute' THEN 1 END)::integer as result_already_active_count,
            ARRAY_AGG(
                jsonb_build_object(
                    'name', a.first_name || ' ' || a.last_name,
                    'order_id', a.order_id,
                    'rfid_uid', rt.uid,
                    'activated_at', rt.activated_at,
                    'was_already_active', (rt.activated_at IS NOT NULL AND rt.activated_at < NOW() - INTERVAL '1 minute'),
                    'has_rfid', (rt.uid IS NOT NULL)
                )
            ) as result_attendee_details
        FROM attendees a
        LEFT JOIN rfid_tags rt ON rt.attendee_id = a.id AND rt.status = 'active'
        WHERE normalize_phone(a.phone) = normalized_phone
    )
    SELECT 
        ps.result_order_id,
        ps.result_total_attendees,
        ps.result_activated_count,
        ps.result_already_active_count,
        ps.result_attendee_details
    FROM phone_summary ps;
END;
$function$;