-- Fix the function security warning by setting search_path
CREATE OR REPLACE FUNCTION is_alphanumeric_regfox_id(order_id_value text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
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