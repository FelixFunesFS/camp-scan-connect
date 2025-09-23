-- Update the extract_parking_assignment function to detect Day Pass Only and enhance site assignment detection
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
    -- First check for Day Pass Only attendees
    IF custom_fields_data ? 'dayPassOnly' OR 
       jsonb_typeof(custom_fields_data->'dayPassOnly') = 'string' OR
       custom_fields_data->>'Weekend Day Pass ONLY' IS NOT NULL THEN
        RETURN 'Day Pass Only';
    END IF;
    
    -- Check for Van/Rooftop assignments
    parking_assignment := COALESCE(
        -- Premium Van/Rooftop preferred spaces
        CASE WHEN custom_fields_data->>'preferredPremiumVanRoof' IS NOT NULL 
             THEN 'Premium Van/Rooftop: ' || (custom_fields_data->>'preferredPremiumVanRoof')
        END,
        
        CASE WHEN custom_fields_data->>'preferredPremiumVanRoof2' IS NOT NULL 
             THEN 'Premium Van/Rooftop: ' || (custom_fields_data->>'preferredPremiumVanRoof2')
        END,
        
        -- Van camping in tailgate areas
        CASE WHEN custom_fields_data->>'Tailgate Van/Rooftop Camping- Preferred Space' IS NOT NULL 
             THEN 'Tailgate Van/Rooftop: ' || (custom_fields_data->>'Tailgate Van/Rooftop Camping- Preferred Space')
        END
    );
    
    -- If we found van assignment, return it
    IF parking_assignment IS NOT NULL THEN
        RETURN parking_assignment;
    END IF;
    
    -- Check for actual assigned parking spaces from dryCampingTentSite
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
        
        -- Check for tent site assignments like "premiumTentSite3.dryCampingSecluded1": "true"
        IF field_key LIKE 'premiumTentSite%.dry%' AND field_value = 'true' THEN
            -- Extract the site assignment
            RETURN 'Tent Site: ' || regexp_replace(field_key, '^[^.]+\.(.+)$', '\1');
        END IF;
        
        -- Check for tent site assignments like "premiumTentSite%.tailgate%" 
        IF field_key LIKE 'premiumTentSite%.tailgate%' AND field_value = 'true' THEN
            RETURN 'Tailgate Tent Site: ' || regexp_replace(field_key, '^[^.]+\.(.+)$', '\1');
        END IF;
    END LOOP;
    
    -- Check for long-form tent space assignments
    parking_assignment := COALESCE(
        -- Tailgate Camping Tent Site preferred space
        CASE WHEN custom_fields_data->>'Tailgate Camping Tent Site-  Preferred Tent Space. Note your actual assigned space may change. Final confirmation sent before camp.' IS NOT NULL 
             THEN 'Tailgate Tent: ' || (custom_fields_data->>'Tailgate Camping Tent Site-  Preferred Tent Space. Note your actual assigned space may change. Final confirmation sent before camp.')
        END,
        
        -- Check other tent space assignment patterns
        CASE WHEN custom_fields_data->>'Tent Space Assignment' IS NOT NULL 
             THEN 'Tent Site: ' || (custom_fields_data->>'Tent Space Assignment')
        END
    );
    
    -- If we found something above, return it
    IF parking_assignment IS NOT NULL THEN
        RETURN parking_assignment;
    END IF;
    
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

-- Update all attendees' parking assignments with the enhanced function
UPDATE attendees 
SET parking_assignment = extract_parking_assignment(custom_fields)
WHERE custom_fields IS NOT NULL;