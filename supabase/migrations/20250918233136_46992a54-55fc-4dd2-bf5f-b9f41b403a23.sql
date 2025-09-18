-- First, let's see how many records have alphanumeric order_ids (these need fixing)
-- and create a function to help with the data migration

-- Create a function to check if an order_id looks like an alphanumeric RegFox ID
CREATE OR REPLACE FUNCTION is_alphanumeric_regfox_id(order_id_value text)
RETURNS boolean
LANGUAGE plpgsql
AS $$
BEGIN
    -- Check if it's an alphanumeric RegFox ID pattern (starts with 0-9 and letters, length around 17-20 chars)
    RETURN order_id_value IS NOT NULL 
           AND length(order_id_value) BETWEEN 15 AND 25
           AND order_id_value ~ '^[0-9A-Z]+$'
           AND order_id_value NOT ~ '^[0-9]+$'; -- Not purely numeric
END;
$$;

-- Log how many records need fixing
DO $$
DECLARE
    alphanumeric_count integer;
    total_count integer;
BEGIN
    SELECT COUNT(*) INTO alphanumeric_count 
    FROM attendees 
    WHERE is_alphanumeric_regfox_id(order_id);
    
    SELECT COUNT(*) INTO total_count 
    FROM attendees 
    WHERE order_id IS NOT NULL;
    
    RAISE NOTICE 'Found % attendees with alphanumeric order_ids out of % total attendees with order_ids', 
                 alphanumeric_count, total_count;
END $$;