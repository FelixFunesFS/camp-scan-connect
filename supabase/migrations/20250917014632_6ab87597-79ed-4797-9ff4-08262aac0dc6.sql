-- Fix security warnings for function search_path

-- Update generate_test_rfid_batch function with security settings
CREATE OR REPLACE FUNCTION generate_test_rfid_batch(count_requested INTEGER DEFAULT 5)
RETURNS TABLE(
  test_uid TEXT,
  sequence_number INTEGER
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  base_timestamp BIGINT;
  i INTEGER;
BEGIN
  base_timestamp := extract(epoch from now())::BIGINT;
  
  FOR i IN 1..LEAST(count_requested, 10) LOOP
    test_uid := 'TEST' || LPAD((base_timestamp + i)::TEXT, 12, '0');
    sequence_number := i;
    RETURN NEXT;
  END LOOP;
END;
$$;

-- Update cleanup_test_rfid_data function with security settings
CREATE OR REPLACE FUNCTION cleanup_test_rfid_data()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Delete test RFID tags
  DELETE FROM rfid_tags WHERE uid LIKE 'TEST%';
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  -- Clean related transactions
  DELETE FROM station_transactions WHERE rfid_uid LIKE 'TEST%';
  
  -- Reset activated_at for affected attendees
  UPDATE attendees SET activated_at = NULL WHERE activated_at IS NOT NULL 
  AND id NOT IN (
    SELECT DISTINCT attendee_id FROM rfid_tags 
    WHERE attendee_id IS NOT NULL 
    AND status IN ('active', 'assigned')
  );
  
  RETURN deleted_count;
END;
$$;