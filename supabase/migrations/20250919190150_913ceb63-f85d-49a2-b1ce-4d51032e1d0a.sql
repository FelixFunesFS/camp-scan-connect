-- Update lookup_attendees_by_phone to exclude cancelled registrations
CREATE OR REPLACE FUNCTION public.lookup_attendees_by_phone(p_phone text)
 RETURNS TABLE(attendee_count integer, has_group_order boolean, order_id text, attendee_details jsonb[], order_companions jsonb[])
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
            a.arrival_window,
            a.ticket_type,
            a.waiver_signed,
            rt.uid as rfid_uid,
            rt.activated_at as rfid_activated_at,
            rt.status as rfid_status
        FROM attendees a
        LEFT JOIN rfid_tags rt ON rt.attendee_id = a.id AND rt.status = 'active'
        WHERE normalize_phone(a.phone) = normalized_phone
        AND a.registration_status = 'registered'
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
            oc.arrival_window as companion_arrival_window,
            oc.ticket_type as companion_ticket_type,
            oc.waiver_signed as companion_waiver_signed,
            rt2.uid as companion_rfid_uid,
            rt2.activated_at as companion_rfid_activated_at,
            rt2.status as companion_rfid_status
        FROM phone_attendees pa
        INNER JOIN attendees oc ON oc.order_id = pa.attendee_order_id 
            AND oc.order_id IS NOT NULL 
            AND oc.order_id != ''
            AND normalize_phone(oc.phone) != normalized_phone
            AND oc.registration_status = 'registered'
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
                    'arrival_window', pa.arrival_window,
                    'ticket_type', pa.ticket_type,
                    'waiver_signed', pa.waiver_signed,
                    'rfid_uid', pa.rfid_uid,
                    'activated_at', pa.attendee_activated_at,
                    'rfid_activated_at', pa.rfid_activated_at,
                    'rfid_status', pa.rfid_status,
                    'is_activated', CASE WHEN pa.attendee_activated_at IS NOT NULL THEN true ELSE false END,
                    'has_rfid', CASE WHEN pa.rfid_uid IS NOT NULL THEN true ELSE false END,
                    'overall_status', CASE 
                        WHEN pa.attendee_activated_at IS NOT NULL THEN 'activated'
                        WHEN pa.rfid_uid IS NOT NULL THEN 'assigned'
                        ELSE 'unassigned'
                    END
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
                        'arrival_window', oc.companion_arrival_window,
                        'ticket_type', oc.companion_ticket_type,
                        'waiver_signed', oc.companion_waiver_signed,
                        'rfid_uid', oc.companion_rfid_uid,
                        'activated_at', oc.companion_activated_at,
                        'rfid_activated_at', oc.companion_rfid_activated_at,
                        'rfid_status', oc.companion_rfid_status,
                        'is_activated', CASE WHEN oc.companion_activated_at IS NOT NULL THEN true ELSE false END,
                        'has_rfid', CASE WHEN oc.companion_rfid_uid IS NOT NULL THEN true ELSE false END,
                        'overall_status', CASE 
                            WHEN oc.companion_activated_at IS NOT NULL THEN 'activated'
                            WHEN oc.companion_rfid_uid IS NOT NULL THEN 'assigned'
                            ELSE 'unassigned'
                        END
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

-- Update activate_group_by_phone to exclude cancelled registrations
CREATE OR REPLACE FUNCTION public.activate_group_by_phone(p_phone text, p_activation_method text DEFAULT 'self_activated'::text)
 RETURNS TABLE(order_id text, total_attendees integer, activated_count integer, already_active_count integer, attendee_details jsonb[], warnings text[])
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    normalized_phone TEXT;
    attendee_count INTEGER;
    warning_messages TEXT[] := ARRAY[]::TEXT[];
BEGIN
    -- Normalize the phone number
    normalized_phone := normalize_phone(p_phone);
    
    -- Check if any attendees exist with this phone number (only registered ones)
    SELECT COUNT(*) INTO attendee_count
    FROM attendees a
    WHERE normalize_phone(a.phone) = normalized_phone
    AND a.registration_status = 'registered';
    
    -- If no attendees found, return empty result
    IF attendee_count = 0 THEN
        RETURN;
    END IF;
    
    -- Check for attendees without RFID tags and add informational messages
    WITH rfid_check AS (
        SELECT 
            a.id,
            a.first_name || ' ' || a.last_name as full_name,
            CASE WHEN rt.uid IS NULL THEN TRUE ELSE FALSE END as missing_rfid
        FROM attendees a
        LEFT JOIN rfid_tags rt ON rt.attendee_id = a.id AND rt.status IN ('assigned', 'active')
        WHERE normalize_phone(a.phone) = normalized_phone
        AND a.registration_status = 'registered'
    )
    SELECT ARRAY_AGG('ℹ️ ' || rc.full_name || ' needs RFID assignment to use services')
    INTO warning_messages
    FROM rfid_check rc
    WHERE rc.missing_rfid = TRUE;
    
    -- Activate RFID tags for attendees (set status to 'active' and update activation timestamps)
    UPDATE rfid_tags 
    SET 
        status = 'active',
        activated_at = CASE 
            WHEN activated_at IS NULL THEN NOW() 
            ELSE activated_at 
        END,
        activation_method = CASE 
            WHEN activated_at IS NULL THEN p_activation_method
            ELSE activation_method 
        END
    WHERE attendee_id IN (
        SELECT a2.id FROM attendees a2 
        WHERE normalize_phone(a2.phone) = normalized_phone
        AND a2.registration_status = 'registered'
    ) AND status IN ('assigned', 'active');
    
    -- Update attendees.activated_at for attendees who have RFID tags
    UPDATE attendees a3
    SET activated_at = CASE 
        WHEN activated_at IS NULL THEN NOW() 
        ELSE activated_at 
    END
    WHERE normalize_phone(a3.phone) = normalized_phone
    AND a3.registration_status = 'registered'
    AND EXISTS (
        SELECT 1 FROM rfid_tags rt 
        WHERE rt.attendee_id = a3.id AND rt.status = 'active'
    );
    
    -- Create audit trail in station_transactions for phone activations (only for those with RFID)
    INSERT INTO station_transactions (
        attendee_id,
        station_type,
        transaction_type,
        rfid_uid,
        activation_method,
        extra_data
    )
    SELECT 
        a.id,
        'activation',
        'activate',
        rt.uid,
        p_activation_method,
        jsonb_build_object(
            'activation_source', 'phone',
            'phone_number', p_phone,
            'has_rfid', true
        )
    FROM attendees a
    INNER JOIN rfid_tags rt ON rt.attendee_id = a.id AND rt.status = 'active'
    WHERE normalize_phone(a.phone) = normalized_phone
    AND a.registration_status = 'registered'
    AND a.activated_at IS NOT NULL
    AND NOT EXISTS (
        SELECT 1 FROM station_transactions st 
        WHERE st.attendee_id = a.id 
        AND st.station_type = 'activation' 
        AND st.transaction_type = 'activate'
        AND DATE(st.created_at) = CURRENT_DATE
    );
    
    -- Return summary information for ALL attendees with this phone number
    RETURN QUERY
    WITH phone_summary AS (
        SELECT 
            CASE 
                WHEN COUNT(DISTINCT NULLIF(a.order_id, '')) = 1 THEN MIN(a.order_id)
                ELSE 'MIXED_ORDERS'
            END as result_order_id,
            COUNT(*)::integer as result_total_attendees,
            COUNT(CASE WHEN rt.uid IS NOT NULL AND a.activated_at IS NOT NULL THEN 1 END)::integer as result_activated_count,
            COUNT(CASE WHEN rt.uid IS NOT NULL AND rt.activated_at < NOW() - INTERVAL '1 minute' THEN 1 END)::integer as result_already_active_count,
            ARRAY_AGG(
                jsonb_build_object(
                    'name', a.first_name || ' ' || a.last_name,
                    'order_id', a.order_id,
                    'rfid_uid', rt.uid,
                    'activated_at', a.activated_at,
                    'rfid_activated_at', rt.activated_at,
                    'was_already_active', (rt.uid IS NOT NULL AND rt.activated_at IS NOT NULL AND rt.activated_at < NOW() - INTERVAL '1 minute'),
                    'has_rfid', (rt.uid IS NOT NULL),
                    'can_use_services', (rt.uid IS NOT NULL AND a.activated_at IS NOT NULL),
                    'status', CASE 
                        WHEN rt.uid IS NOT NULL AND a.activated_at IS NOT NULL THEN 'active'
                        WHEN rt.uid IS NULL THEN 'no_rfid'
                        ELSE 'pending'
                    END
                )
            ) as result_attendee_details,
            warning_messages as result_warnings
        FROM attendees a
        LEFT JOIN rfid_tags rt ON rt.attendee_id = a.id AND rt.status = 'active'
        WHERE normalize_phone(a.phone) = normalized_phone
        AND a.registration_status = 'registered'
    )
    SELECT 
        ps.result_order_id,
        ps.result_total_attendees,
        ps.result_activated_count,
        ps.result_already_active_count,
        ps.result_attendee_details,
        ps.result_warnings
    FROM phone_summary ps;
END;
$function$;

-- Update activate_entire_order_by_phone to exclude cancelled registrations
CREATE OR REPLACE FUNCTION public.activate_entire_order_by_phone(p_phone text, p_activation_method text DEFAULT 'self_activated'::text)
 RETURNS TABLE(order_id text, total_attendees integer, activated_count integer, already_active_count integer, attendee_details jsonb[], warnings text[])
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    normalized_phone TEXT;
    target_order_id TEXT;
    attendee_count INTEGER;
    warning_messages TEXT[] := ARRAY[]::TEXT[];
BEGIN
    -- Normalize the phone number
    normalized_phone := normalize_phone(p_phone);
    
    -- Find the order_id for this phone number (only for registered attendees)
    SELECT DISTINCT a.order_id INTO target_order_id
    FROM attendees a
    WHERE normalize_phone(a.phone) = normalized_phone
    AND a.order_id IS NOT NULL 
    AND a.order_id != ''
    AND a.registration_status = 'registered'
    LIMIT 1;
    
    -- If no order found, return empty result
    IF target_order_id IS NULL THEN
        RETURN;
    END IF;
    
    -- Check how many attendees are in this order (only registered ones)
    SELECT COUNT(*) INTO attendee_count
    FROM attendees a
    WHERE a.order_id = target_order_id
    AND a.registration_status = 'registered';
    
    -- If no attendees found, return empty result
    IF attendee_count = 0 THEN
        RETURN;
    END IF;
    
    -- Check for attendees without RFID tags and add informational messages
    WITH rfid_check AS (
        SELECT 
            a.id,
            a.first_name || ' ' || a.last_name as full_name,
            CASE WHEN rt.uid IS NULL THEN TRUE ELSE FALSE END as missing_rfid
        FROM attendees a
        LEFT JOIN rfid_tags rt ON rt.attendee_id = a.id AND rt.status IN ('assigned', 'active')
        WHERE a.order_id = target_order_id
        AND a.registration_status = 'registered'
    )
    SELECT ARRAY_AGG('ℹ️ ' || rc.full_name || ' needs RFID assignment to use services')
    INTO warning_messages
    FROM rfid_check rc
    WHERE rc.missing_rfid = TRUE;
    
    -- Activate RFID tags for attendees (set status to 'active' and update activation timestamps)
    UPDATE rfid_tags 
    SET 
        status = 'active',
        activated_at = CASE 
            WHEN activated_at IS NULL THEN NOW() 
            ELSE activated_at 
        END,
        activation_method = CASE 
            WHEN activated_at IS NULL THEN p_activation_method
            ELSE activation_method 
        END
    WHERE attendee_id IN (
        SELECT a2.id FROM attendees a2 
        WHERE a2.order_id = target_order_id
        AND a2.registration_status = 'registered'
    ) AND status IN ('assigned', 'active');
    
    -- Update attendees.activated_at for attendees who have RFID tags
    UPDATE attendees a3
    SET activated_at = CASE 
        WHEN activated_at IS NULL THEN NOW() 
        ELSE activated_at 
    END
    WHERE a3.order_id = target_order_id
    AND a3.registration_status = 'registered'
    AND EXISTS (
        SELECT 1 FROM rfid_tags rt 
        WHERE rt.attendee_id = a3.id AND rt.status = 'active'
    );
    
    -- Create audit trail in station_transactions for order activations (only for those with RFID)
    INSERT INTO station_transactions (
        attendee_id,
        station_type,
        transaction_type,
        rfid_uid,
        activation_method,
        extra_data
    )
    SELECT 
        a.id,
        'activation',
        'activate',
        rt.uid,
        p_activation_method,
        jsonb_build_object(
            'activation_source', 'phone_order',
            'phone_number', p_phone,
            'order_id', target_order_id,
            'has_rfid', true
        )
    FROM attendees a
    INNER JOIN rfid_tags rt ON rt.attendee_id = a.id AND rt.status = 'active'
    WHERE a.order_id = target_order_id
    AND a.registration_status = 'registered'
    AND a.activated_at IS NOT NULL
    AND NOT EXISTS (
        SELECT 1 FROM station_transactions st 
        WHERE st.attendee_id = a.id 
        AND st.station_type = 'activation' 
        AND st.transaction_type = 'activate'
        AND DATE(st.created_at) = CURRENT_DATE
    );
    
    -- Return summary information for ALL attendees in this order
    RETURN QUERY
    WITH order_summary AS (
        SELECT 
            target_order_id as result_order_id,
            COUNT(*)::integer as result_total_attendees,
            COUNT(CASE WHEN rt.uid IS NOT NULL AND a.activated_at IS NOT NULL THEN 1 END)::integer as result_activated_count,
            COUNT(CASE WHEN rt.uid IS NOT NULL AND rt.activated_at < NOW() - INTERVAL '1 minute' THEN 1 END)::integer as result_already_active_count,
            ARRAY_AGG(
                jsonb_build_object(
                    'name', a.first_name || ' ' || a.last_name,
                    'order_id', a.order_id,
                    'phone', a.phone,
                    'rfid_uid', rt.uid,
                    'activated_at', a.activated_at,
                    'rfid_activated_at', rt.activated_at,
                    'was_already_active', (rt.uid IS NOT NULL AND rt.activated_at IS NOT NULL AND rt.activated_at < NOW() - INTERVAL '1 minute'),
                    'has_rfid', (rt.uid IS NOT NULL),
                    'can_use_services', (rt.uid IS NOT NULL AND a.activated_at IS NOT NULL),
                    'status', CASE 
                        WHEN rt.uid IS NOT NULL AND a.activated_at IS NOT NULL THEN 'active'
                        WHEN rt.uid IS NULL THEN 'no_rfid'
                        ELSE 'pending'
                    END
                )
            ) as result_attendee_details,
            warning_messages as result_warnings
        FROM attendees a
        LEFT JOIN rfid_tags rt ON rt.attendee_id = a.id AND rt.status = 'active'
        WHERE a.order_id = target_order_id
        AND a.registration_status = 'registered'
    )
    SELECT 
        os.result_order_id,
        os.result_total_attendees,
        os.result_activated_count,
        os.result_already_active_count,
        os.result_attendee_details,
        os.result_warnings
    FROM order_summary os;
END;
$function$;

-- Update activate_remaining_rfids_by_phone to exclude cancelled registrations
CREATE OR REPLACE FUNCTION public.activate_remaining_rfids_by_phone(p_phone text, p_activation_method text DEFAULT 'self_activated'::text)
 RETURNS TABLE(order_id text, total_attendees integer, activated_count integer, already_active_count integer, attendee_details jsonb[], warnings text[])
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
    
    -- Check if any attendees exist with this phone number (only registered ones)
    SELECT COUNT(*) INTO attendee_count
    FROM attendees a
    WHERE normalize_phone(a.phone) = normalized_phone
    AND a.registration_status = 'registered';
    
    -- If no attendees found, return empty result
    IF attendee_count = 0 THEN
        RETURN;
    END IF;
    
    -- Only activate attendees who have RFID tags but are not yet activated
    UPDATE rfid_tags 
    SET activated_at = NOW(),
        activation_method = p_activation_method
    WHERE attendee_id IN (
        SELECT a.id 
        FROM attendees a
        INNER JOIN rfid_tags rt ON rt.attendee_id = a.id AND rt.status = 'active'
        WHERE normalize_phone(a.phone) = normalized_phone
        AND a.registration_status = 'registered'
        AND a.activated_at IS NULL
    );
    
    -- Update attendees.activated_at for newly activated attendees with RFID
    UPDATE attendees a
    SET activated_at = NOW()
    WHERE normalize_phone(a.phone) = normalized_phone
    AND a.registration_status = 'registered'
    AND a.activated_at IS NULL
    AND EXISTS (
        SELECT 1 FROM rfid_tags rt 
        WHERE rt.attendee_id = a.id AND rt.status = 'active'
    );
    
    -- Create audit trail for remaining activations
    INSERT INTO station_transactions (
        attendee_id,
        station_type,
        transaction_type,
        rfid_uid,
        activation_method,
        extra_data
    )
    SELECT 
        a.id,
        'activation',
        'activate',
        rt.uid,
        p_activation_method,
        jsonb_build_object(
            'activation_source', 'phone_remaining',
            'phone_number', p_phone,
            'has_rfid', true
        )
    FROM attendees a
    INNER JOIN rfid_tags rt ON rt.attendee_id = a.id AND rt.status = 'active'
    WHERE normalize_phone(a.phone) = normalized_phone
    AND a.registration_status = 'registered'
    AND a.activated_at IS NOT NULL
    AND NOT EXISTS (
        SELECT 1 FROM station_transactions st 
        WHERE st.attendee_id = a.id 
        AND st.station_type = 'activation' 
        AND st.transaction_type = 'activate'
        AND DATE(st.created_at) = CURRENT_DATE
    );
    
    -- Return updated summary
    RETURN QUERY
    SELECT * FROM activate_group_by_phone(p_phone, p_activation_method);
END;
$function$;