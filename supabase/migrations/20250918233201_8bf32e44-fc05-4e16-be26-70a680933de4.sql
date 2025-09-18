-- Create a function to check if an order_id looks like an alphanumeric RegFox ID
CREATE OR REPLACE FUNCTION is_alphanumeric_regfox_id(order_id_value text)
RETURNS boolean
LANGUAGE plpgsql
AS $$
BEGIN
    -- Check if it's an alphanumeric RegFox ID pattern
    -- RegFox alphanumeric IDs are typically 15-25 chars, contain letters and numbers, not purely numeric
    RETURN order_id_value IS NOT NULL 
           AND length(order_id_value) BETWEEN 15 AND 25
           AND order_id_value SIMILAR TO '[0-9A-Z]+'
           AND NOT (order_id_value SIMILAR TO '[0-9]+'); -- Not purely numeric
END;
$$;

-- Check how many records have alphanumeric order_ids that need fixing
SELECT 
    COUNT(*) as total_with_order_id,
    COUNT(CASE WHEN is_alphanumeric_regfox_id(order_id) THEN 1 END) as alphanumeric_order_ids,
    COUNT(CASE WHEN order_id SIMILAR TO '[0-9]+' THEN 1 END) as numeric_order_ids
FROM attendees 
WHERE order_id IS NOT NULL;