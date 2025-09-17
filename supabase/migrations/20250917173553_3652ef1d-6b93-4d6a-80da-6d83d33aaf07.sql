-- Fix RFID status logic and clear functions

-- Update bulk_generate_mock_rfids to set status as 'assigned' instead of 'active'
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
            a.id as attendee_id_val,
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
            awr.attendee_id_val,
            'assigned',  -- Changed from 'active' to 'assigned'
            NOW()
        FROM attendees_without_rfid awr
        RETURNING uid, attendee_id
    )
    SELECT 
        it.attendee_id as attendee_id,
        it.uid as generated_uid,
        awr.full_name as attendee_name
    FROM inserted_tags it
    JOIN attendees_without_rfid awr ON awr.attendee_id_val = it.attendee_id;
END;
$function$;

-- Enhanced cleanup function to handle multiple RFID formats and reset attendee status
CREATE OR REPLACE FUNCTION public.cleanup_generated_rfids(p_format text DEFAULT 'ALL')
RETURNS TABLE(deleted_count integer, cleared_attendee_ids uuid[])
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    rfid_count integer;
    affected_attendees uuid[];
    where_clause text;
BEGIN
    -- Build where clause based on format
    CASE p_format
        WHEN 'MOCK' THEN
            where_clause := 'uid LIKE ''MOCK%''';
        WHEN 'RFID' THEN
            where_clause := 'uid LIKE ''RFID%''';
        WHEN 'TEST' THEN
            where_clause := 'uid LIKE ''TEST%''';
        ELSE
            where_clause := '(uid LIKE ''MOCK%'' OR uid LIKE ''RFID%'' OR uid LIKE ''TEST%'')';
    END CASE;
    
    -- Get attendee IDs that have generated RFIDs before deletion
    EXECUTE format('SELECT ARRAY_AGG(DISTINCT attendee_id) FROM rfid_tags WHERE attendee_id IS NOT NULL AND %s', where_clause)
    INTO affected_attendees;
    
    -- Reset attendee activation status for affected attendees
    IF affected_attendees IS NOT NULL THEN
        UPDATE attendees 
        SET activated_at = NULL 
        WHERE id = ANY(affected_attendees);
    END IF;
    
    -- Delete generated RFID tags or set them back to unissued state
    WITH deleted_rfids AS (
        UPDATE rfid_tags 
        SET status = 'unissued', 
            attendee_id = NULL,
            activated_at = NULL,
            deactivated_at = NULL,
            reason = NULL,
            activation_method = NULL
        WHERE attendee_id IS NOT NULL
        AND uid ~ CASE 
            WHEN p_format = 'MOCK' THEN '^MOCK'
            WHEN p_format = 'RFID' THEN '^RFID'
            WHEN p_format = 'TEST' THEN '^TEST'
            ELSE '^(MOCK|RFID|TEST)'
        END
        RETURNING uid
    )
    SELECT COUNT(*)::integer INTO rfid_count FROM deleted_rfids;
    
    -- Return results
    RETURN QUERY SELECT rfid_count, COALESCE(affected_attendees, ARRAY[]::uuid[]);
END;
$function$;

-- Update the legacy cleanup_mock_rfids to use the new enhanced function
CREATE OR REPLACE FUNCTION public.cleanup_mock_rfids()
RETURNS TABLE(deleted_count integer, cleared_attendee_ids uuid[])
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
    -- Use the enhanced cleanup function for MOCK RFIDs only
    RETURN QUERY SELECT * FROM cleanup_generated_rfids('MOCK');
END;
$function$;