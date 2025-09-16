-- Fix activate_group_by_phone function to resolve ambiguous column reference
CREATE OR REPLACE FUNCTION public.activate_group_by_phone(p_phone text, p_activation_method text DEFAULT 'self_activated'::text)
 RETURNS TABLE(order_id text, total_attendees integer, activated_count integer, already_active_count integer, attendee_details jsonb[])
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    normalized_phone TEXT;
    target_order_id TEXT;
BEGIN
    -- Normalize the phone number
    normalized_phone := normalize_phone(p_phone);
    
    -- Find the order_id for this phone number
    SELECT a.order_id INTO target_order_id
    FROM attendees a
    WHERE normalize_phone(a.phone) = normalized_phone
    AND a.order_id IS NOT NULL
    LIMIT 1;
    
    -- If no order found, return empty result
    IF target_order_id IS NULL THEN
        RETURN;
    END IF;
    
    -- Activate all RFID tags for attendees in this order (if they exist)
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
        SELECT id FROM attendees WHERE order_id = target_order_id
    );
    
    -- Also update attendees activated_at timestamp
    UPDATE attendees 
    SET activated_at = CASE 
        WHEN activated_at IS NULL THEN NOW() 
        ELSE activated_at 
    END
    WHERE order_id = target_order_id;
    
    -- Return summary information with explicit aliases
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
                    'rfid_uid', rt.uid,
                    'activated_at', rt.activated_at,
                    'was_already_active', (rt.activated_at IS NOT NULL AND rt.activated_at < NOW() - INTERVAL '1 minute'),
                    'has_rfid', (rt.uid IS NOT NULL)
                )
            ) as result_attendee_details
        FROM attendees a
        LEFT JOIN rfid_tags rt ON rt.attendee_id = a.id AND rt.status = 'active'
        WHERE a.order_id = target_order_id
        GROUP BY target_order_id
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

-- Create function to generate mock RFID UIDs
CREATE OR REPLACE FUNCTION public.generate_mock_rfid_uid()
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    mock_uid text;
    uid_exists boolean;
BEGIN
    -- Loop until we find a unique UID
    LOOP
        -- Generate MOCK + 8 character hex string
        mock_uid := 'MOCK' || UPPER(substring(md5(random()::text) from 1 for 8));
        
        -- Check if this UID already exists
        SELECT EXISTS(SELECT 1 FROM rfid_tags WHERE uid = mock_uid) INTO uid_exists;
        
        -- If unique, exit loop
        IF NOT uid_exists THEN
            EXIT;
        END IF;
    END LOOP;
    
    RETURN mock_uid;
END;
$function$;

-- Create function to bulk generate mock RFIDs for attendees without tags
CREATE OR REPLACE FUNCTION public.bulk_generate_mock_rfids(p_limit integer DEFAULT 100)
 RETURNS TABLE(attendee_id uuid, generated_uid text, attendee_name text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    -- Insert mock RFID tags for attendees without any assigned tags
    WITH attendees_without_rfid AS (
        SELECT 
            a.id,
            a.first_name || ' ' || a.last_name as full_name
        FROM attendees a
        LEFT JOIN rfid_tags rt ON rt.attendee_id = a.id
        WHERE rt.attendee_id IS NULL
        LIMIT p_limit
    ),
    inserted_tags AS (
        INSERT INTO rfid_tags (uid, attendee_id, status, issued_at)
        SELECT 
            generate_mock_rfid_uid(),
            awr.id,
            'active',
            NOW()
        FROM attendees_without_rfid awr
        RETURNING uid, attendee_id
    )
    SELECT 
        it.attendee_id,
        it.uid,
        awr.full_name
    FROM inserted_tags it
    JOIN attendees_without_rfid awr ON awr.id = it.attendee_id;
END;
$function$;