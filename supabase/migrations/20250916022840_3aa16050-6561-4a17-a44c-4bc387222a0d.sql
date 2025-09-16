-- Fix the bulk_generate_mock_rfids function to resolve column ambiguity
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
            'active',
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

-- Add function to cleanup mock RFIDs
CREATE OR REPLACE FUNCTION public.cleanup_mock_rfids()
 RETURNS TABLE(deleted_count integer, cleared_attendee_ids uuid[])
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    mock_count integer;
    affected_attendees uuid[];
BEGIN
    -- Get attendee IDs that have mock RFIDs before deletion
    SELECT ARRAY_AGG(attendee_id)
    INTO affected_attendees
    FROM rfid_tags
    WHERE uid LIKE 'MOCK%';
    
    -- Delete mock RFID tags and get count
    WITH deleted_rfids AS (
        DELETE FROM rfid_tags
        WHERE uid LIKE 'MOCK%'
        RETURNING uid
    )
    SELECT COUNT(*)::integer INTO mock_count FROM deleted_rfids;
    
    -- Return results
    RETURN QUERY SELECT mock_count, COALESCE(affected_attendees, ARRAY[]::uuid[]);
END;
$function$;