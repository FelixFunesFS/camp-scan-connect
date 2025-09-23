-- Add parking_assignment column to attendees table
ALTER TABLE attendees 
ADD COLUMN IF NOT EXISTS parking_assignment TEXT;

-- Enhanced parking assignment extraction function to capture missing assignments
CREATE OR REPLACE FUNCTION public.extract_parking_assignment(custom_fields_data jsonb)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    parking_assignment text;
    field_key text;
    field_value text;
BEGIN
    -- First check for actual assigned parking spaces from dryCampingTentSite
    IF custom_fields_data ? 'dryCampingTentSite' AND 
       jsonb_typeof(custom_fields_data->'dryCampingTentSite') = 'object' THEN
        
        -- Look for dryCampingRv## assignments
        FOR field_key, field_value IN 
            SELECT * FROM jsonb_each_text(custom_fields_data->'dryCampingTentSite')
        LOOP
            IF field_key LIKE 'dryCampingRv%' AND field_value IS NOT NULL AND field_value != '' THEN
                RETURN 'Dry Camping RV: ' || field_key;
            END IF;
            
            IF field_key LIKE 'tailgateCampingRv%' AND field_value IS NOT NULL AND field_value != '' THEN
                RETURN 'Tailgate RV: ' || field_key;
            END IF;
        END LOOP;
    END IF;
    
    -- Check for Green Space tent assignments (fields ending with "true")
    FOR field_key, field_value IN 
        SELECT * FROM jsonb_each_text(custom_fields_data)
    LOOP
        IF field_key LIKE '%Green Space for Tent%' AND field_value = 'true' THEN
            -- Extract the tent number from the field name
            RETURN 'Green Space Tent: ' || regexp_replace(field_key, '.*Green Space for Tent ([^-]+).*', '\1');
        END IF;
    END LOOP;
    
    -- Fall back to existing premium preference logic
    parking_assignment := COALESCE(
        -- Premium Tent
        CASE WHEN custom_fields_data->>'Which Premium Tent space do you prefer? ** Note your assigned space may change. Check Final confirmation sent week of campout for confirmation.' IS NOT NULL 
             THEN 'Premium Tent: ' || (custom_fields_data->>'Which Premium Tent space do you prefer? ** Note your assigned space may change. Check Final confirmation sent week of campout for confirmation.')
        END,
        
        -- Premium RV
        CASE WHEN custom_fields_data->>'Which Premium RV space do you prefer?  ** Note your assigned space may change. Check Final confirmation sent week of campout for confirmation.' IS NOT NULL 
             THEN 'Premium RV: ' || (custom_fields_data->>'Which Premium RV space do you prefer?  ** Note your assigned space may change. Check Final confirmation sent week of campout for confirmation.')
        END,
        
        -- Winnebago Lot Premium RV
        CASE WHEN custom_fields_data->>'Winnebago Lot- Which Premium RV Space do you prefer?  **Note your assigned space may change. Check Final confirmation sent week of campout for confirmation.' IS NOT NULL 
             THEN 'Premium RV (Winnebago): ' || (custom_fields_data->>'Winnebago Lot- Which Premium RV Space do you prefer?  **Note your assigned space may change. Check Final confirmation sent week of campout for confirmation.')
        END,
        
        -- Tailgate RV
        CASE WHEN custom_fields_data->>'Which Tailgate RV space do you prefer?  ** Note your assigned space may change. Check Final confirmation sent week of campout for confirmation.' IS NOT NULL 
             THEN 'Tailgate RV: ' || (custom_fields_data->>'Which Tailgate RV space do you prefer?  ** Note your assigned space may change. Check Final confirmation sent week of campout for confirmation.')
        END,
        
        -- Tailgate Tent
        CASE WHEN custom_fields_data->>'Which Tailgate Tent space do you prefer? ** Note your assigned space may change. Check Final confirmation sent week of campout for confirmation.' IS NOT NULL 
             THEN 'Tailgate Tent: ' || (custom_fields_data->>'Which Tailgate Tent space do you prefer? ** Note your assigned space may change. Check Final confirmation sent week of campout for confirmation.')
        END,
        
        -- Paved Tailgate Camping
        CASE WHEN custom_fields_data->>'Which Paved Tailgate Camping Spot do you prefer? **Note your assigned space may change. Check Final confirmation sent week of campout for confirmation.*' IS NOT NULL 
             THEN 'Paved Tailgate: ' || (custom_fields_data->>'Which Paved Tailgate Camping Spot do you prefer? **Note your assigned space may change. Check Final confirmation sent week of campout for confirmation.*')
        END,
        
        -- Glamping Double Queen
        CASE WHEN custom_fields_data->>'Which Glamping Tent- Double Queen space do you prefer?  ** Note your assigned space may change. Check Final confirmation sent week of campout for confirmation.' IS NOT NULL 
             THEN 'Glamping (Double Queen): ' || (custom_fields_data->>'Which Glamping Tent- Double Queen space do you prefer?  ** Note your assigned space may change. Check Final confirmation sent week of campout for confirmation.')
        END,
        
        -- Glamping King & Bunks
        CASE WHEN custom_fields_data->>'Which Glamping Tent- King & Bunks space do you prefer?   ** Note your assigned space may change. Check Final confirmation sent week of campout for confirmation.' IS NOT NULL 
             THEN 'Glamping (King & Bunks): ' || (custom_fields_data->>'Which Glamping Tent- King & Bunks space do you prefer?   ** Note your assigned space may change. Check Final confirmation sent week of campout for confirmation.')
        END,
        
        -- Preferred Cabin
        CASE WHEN custom_fields_data->>'Preferred Cabin #. Actual assigned cabin may change.' IS NOT NULL 
             THEN 'Cabin: #' || (custom_fields_data->>'Preferred Cabin #. Actual assigned cabin may change.')
        END,
        
        -- Default if no assignment found
        'Not Assigned'
    );
    
    RETURN parking_assignment;
END;
$function$;

-- Update all attendees with parking assignments from their custom fields
UPDATE attendees 
SET parking_assignment = extract_parking_assignment(custom_fields)
WHERE custom_fields IS NOT NULL 
AND jsonb_typeof(custom_fields) = 'object';

-- Show the results
SELECT 
    'Summary' as info,
    COUNT(*) as total_attendees,
    COUNT(CASE WHEN parking_assignment IS NOT NULL AND parking_assignment != 'Not Assigned' THEN 1 END) as with_parking,
    ROUND(
        (COUNT(CASE WHEN parking_assignment IS NOT NULL AND parking_assignment != 'Not Assigned' THEN 1 END) * 100.0) / COUNT(*), 
        1
    ) as percentage_with_parking
FROM attendees 
WHERE registration_status = 'registered';