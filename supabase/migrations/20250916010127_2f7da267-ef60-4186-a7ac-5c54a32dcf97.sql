-- Fix security warnings by setting search_path for functions
CREATE OR REPLACE FUNCTION normalize_phone(phone_input TEXT)
RETURNS TEXT 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Remove all non-digit characters and return last 10 digits
    RETURN RIGHT(REGEXP_REPLACE(phone_input, '[^0-9]', '', 'g'), 10);
END;
$$;

-- Fix search_path for activate_group_by_phone function
CREATE OR REPLACE FUNCTION activate_group_by_phone(
    p_phone TEXT,
    p_activation_method TEXT DEFAULT 'self_activated'
)
RETURNS TABLE(
    order_id TEXT,
    total_attendees INTEGER,
    activated_count INTEGER,
    already_active_count INTEGER,
    attendee_details JSONB[]
) 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
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
    
    -- Activate all RFID tags for attendees in this order
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
    
    -- Return summary information
    RETURN QUERY
    WITH order_summary AS (
        SELECT 
            target_order_id as order_id,
            COUNT(*) as total_attendees,
            COUNT(CASE WHEN rt.activated_at IS NOT NULL THEN 1 END) as activated_count,
            COUNT(CASE WHEN rt.activated_at < NOW() - INTERVAL '1 minute' THEN 1 END) as already_active_count,
            ARRAY_AGG(
                jsonb_build_object(
                    'name', a.first_name || ' ' || a.last_name,
                    'rfid_uid', rt.uid,
                    'activated_at', rt.activated_at,
                    'was_already_active', rt.activated_at < NOW() - INTERVAL '1 minute'
                )
            ) as attendee_details
        FROM attendees a
        LEFT JOIN rfid_tags rt ON rt.attendee_id = a.id AND rt.status = 'active'
        WHERE a.order_id = target_order_id
        GROUP BY target_order_id
    )
    SELECT * FROM order_summary;
END;
$$;