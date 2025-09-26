-- Fix the type mismatch in check_station_access function
DROP FUNCTION IF EXISTS check_station_access(UUID);

CREATE OR REPLACE FUNCTION check_station_access(p_attendee_id UUID)
RETURNS TABLE(
    has_access BOOLEAN, 
    access_reason TEXT,
    activation_status TEXT,
    rfid_status TEXT
) 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $$
DECLARE
    rfid_record RECORD;
    activation_record RECORD;
BEGIN
    -- Check RFID assignment
    SELECT INTO rfid_record uid, status::TEXT as status_text
    FROM rfid_tags 
    WHERE attendee_id = p_attendee_id 
      AND status IN ('assigned', 'active')
    ORDER BY issued_at DESC 
    LIMIT 1;
    
    -- Check activation status
    SELECT INTO activation_record transaction_type::TEXT as transaction_text, created_at
    FROM station_transactions 
    WHERE attendee_id = p_attendee_id 
      AND station_type = 'activation'
    ORDER BY created_at DESC 
    LIMIT 1;
    
    -- No RFID assigned
    IF rfid_record IS NULL THEN
        RETURN QUERY SELECT 
            FALSE as has_access,
            'No RFID assigned' as access_reason,
            'none' as activation_status,
            'unassigned' as rfid_status;
        RETURN;
    END IF;
    
    -- RFID assigned but not activated
    IF activation_record IS NULL OR activation_record.transaction_text != 'activate' THEN
        RETURN QUERY SELECT 
            FALSE as has_access,
            'RFID assigned but not activated - activation required for station services' as access_reason,
            COALESCE(activation_record.transaction_text, 'none') as activation_status,
            rfid_record.status_text as rfid_status;
        RETURN;
    END IF;
    
    -- RFID assigned and activated - full access
    RETURN QUERY SELECT 
        TRUE as has_access,
        'Full station access granted' as access_reason,
        activation_record.transaction_text as activation_status,
        rfid_record.status_text as rfid_status;
END;
$$;