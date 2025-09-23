-- Add partial unique index to prevent future duplicates after cleanup
-- This should be run after duplicates are cleaned up
CREATE UNIQUE INDEX CONCURRENTLY unique_regfox_id_registered_idx 
ON public.attendees (regfox_id) 
WHERE (registration_status = 'registered' AND regfox_id IS NOT NULL AND regfox_id != '');

-- Create function to safely handle sync operations with duplicate prevention
CREATE OR REPLACE FUNCTION public.upsert_attendee_safe(
    p_regfox_id text,
    p_data jsonb
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    attendee_id uuid;
    existing_count integer;
BEGIN
    -- Check if attendee already exists
    SELECT COUNT(*) INTO existing_count
    FROM attendees 
    WHERE regfox_id = p_regfox_id 
    AND registration_status = 'registered';
    
    IF existing_count > 0 THEN
        -- Update existing record
        UPDATE attendees 
        SET 
            first_name = COALESCE(p_data->>'first_name', first_name),
            last_name = COALESCE(p_data->>'last_name', last_name),
            email = COALESCE(p_data->>'email', email),
            phone = COALESCE(p_data->>'phone', phone),
            updated_at = NOW()
        WHERE regfox_id = p_regfox_id 
        AND registration_status = 'registered'
        RETURNING id INTO attendee_id;
    ELSE
        -- Insert new record
        INSERT INTO attendees (
            regfox_id,
            first_name,
            last_name,
            email,
            phone,
            registration_status
        ) VALUES (
            p_regfox_id,
            p_data->>'first_name',
            p_data->>'last_name',
            p_data->>'email',
            p_data->>'phone',
            'registered'
        ) RETURNING id INTO attendee_id;
    END IF;
    
    RETURN attendee_id;
END;
$$;