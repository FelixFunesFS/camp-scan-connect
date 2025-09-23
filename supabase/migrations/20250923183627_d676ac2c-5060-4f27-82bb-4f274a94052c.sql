-- Create function to extract parking assignments from custom_fields
CREATE OR REPLACE FUNCTION public.extract_parking_assignment(custom_fields_data jsonb)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    parking_assignment text;
BEGIN
    -- Check each parking assignment field in order of priority
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