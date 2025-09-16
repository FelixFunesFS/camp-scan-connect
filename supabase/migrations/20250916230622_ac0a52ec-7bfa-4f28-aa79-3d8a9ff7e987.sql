-- Enhanced phone activation functions with RFID validation and audit trails

-- First, drop the existing functions to replace them
DROP FUNCTION IF EXISTS public.activate_group_by_phone(text, text);
DROP FUNCTION IF EXISTS public.activate_entire_order_by_phone(text, text);

-- Create enhanced activate_group_by_phone with RFID validation
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
    
    -- Check if any attendees exist with this phone number
    SELECT COUNT(*) INTO attendee_count
    FROM attendees a
    WHERE normalize_phone(a.phone) = normalized_phone;
    
    -- If no attendees found, return empty result
    IF attendee_count = 0 THEN
        RETURN;
    END IF;
    
    -- Check for attendees without RFID tags and add warnings
    WITH rfid_check AS (
        SELECT 
            a.id,
            a.first_name || ' ' || a.last_name as full_name,
            CASE WHEN rt.uid IS NULL THEN TRUE ELSE FALSE END as missing_rfid
        FROM attendees a
        LEFT JOIN rfid_tags rt ON rt.attendee_id = a.id AND rt.status = 'active'
        WHERE normalize_phone(a.phone) = normalized_phone
    )
    SELECT ARRAY_AGG('⚠️ ' || rc.full_name || ' has no RFID assigned and cannot use event services')
    INTO warning_messages
    FROM rfid_check rc
    WHERE rc.missing_rfid = TRUE;
    
    -- Only activate attendees who have RFID tags assigned
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
    
    -- Update attendees activated_at timestamp for ALL attendees with this phone
    UPDATE attendees a3
    SET activated_at = CASE 
        WHEN activated_at IS NULL THEN NOW() 
        ELSE activated_at 
    END
    WHERE normalize_phone(a3.phone) = normalized_phone;
    
    -- Create audit trail in station_transactions for phone activations
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
            'has_rfid', CASE WHEN rt.uid IS NOT NULL THEN true ELSE false END
        )
    FROM attendees a
    LEFT JOIN rfid_tags rt ON rt.attendee_id = a.id AND rt.status = 'active'
    WHERE normalize_phone(a.phone) = normalized_phone
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
            COUNT(CASE WHEN rt.activated_at IS NOT NULL THEN 1 END)::integer as result_activated_count,
            COUNT(CASE WHEN rt.activated_at < NOW() - INTERVAL '1 minute' THEN 1 END)::integer as result_already_active_count,
            ARRAY_AGG(
                jsonb_build_object(
                    'name', a.first_name || ' ' || a.last_name,
                    'order_id', a.order_id,
                    'rfid_uid', rt.uid,
                    'activated_at', rt.activated_at,
                    'was_already_active', (rt.activated_at IS NOT NULL AND rt.activated_at < NOW() - INTERVAL '1 minute'),
                    'has_rfid', (rt.uid IS NOT NULL),
                    'can_use_services', (rt.uid IS NOT NULL AND rt.activated_at IS NOT NULL)
                )
            ) as result_attendee_details,
            warning_messages as result_warnings
        FROM attendees a
        LEFT JOIN rfid_tags rt ON rt.attendee_id = a.id AND rt.status = 'active'
        WHERE normalize_phone(a.phone) = normalized_phone
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

-- Create enhanced activate_entire_order_by_phone with RFID validation
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
    
    -- Check for attendees without RFID tags and add warnings
    WITH rfid_check AS (
        SELECT 
            a.id,
            a.first_name || ' ' || a.last_name as full_name,
            CASE WHEN rt.uid IS NULL THEN TRUE ELSE FALSE END as missing_rfid
        FROM attendees a
        LEFT JOIN rfid_tags rt ON rt.attendee_id = a.id AND rt.status = 'active'
        WHERE a.order_id = target_order_id
    )
    SELECT ARRAY_AGG('⚠️ ' || rc.full_name || ' has no RFID assigned and cannot use event services')
    INTO warning_messages
    FROM rfid_check rc
    WHERE rc.missing_rfid = TRUE;
    
    -- Only activate attendees who have RFID tags assigned
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
    
    -- Update attendees activated_at timestamp for ALL attendees in this order
    UPDATE attendees a3
    SET activated_at = CASE 
        WHEN activated_at IS NULL THEN NOW() 
        ELSE activated_at 
    END
    WHERE a3.order_id = target_order_id;
    
    -- Create audit trail in station_transactions for order activations
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
            'has_rfid', CASE WHEN rt.uid IS NOT NULL THEN true ELSE false END
        )
    FROM attendees a
    LEFT JOIN rfid_tags rt ON rt.attendee_id = a.id AND rt.status = 'active'
    WHERE a.order_id = target_order_id
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
                    'has_rfid', (rt.uid IS NOT NULL),
                    'can_use_services', (rt.uid IS NOT NULL AND rt.activated_at IS NOT NULL)
                )
            ) as result_attendee_details,
            warning_messages as result_warnings
        FROM attendees a
        LEFT JOIN rfid_tags rt ON rt.attendee_id = a.id AND rt.status = 'active'
        WHERE a.order_id = target_order_id
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