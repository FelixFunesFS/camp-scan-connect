-- Fix the bulk_generate_mock_rfids function by adding explicit table aliases to resolve column ambiguity
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
$function$