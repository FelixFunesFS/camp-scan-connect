-- Clean all mock RFID data and reset attendee states
-- Remove all mock RFID tags
DELETE FROM rfid_tags WHERE uid LIKE 'MOCK%' OR uid LIKE 'mock%';

-- Reset activated_at for attendees who were activated with mock RFIDs
UPDATE attendees SET activated_at = NULL WHERE activated_at IS NOT NULL 
AND id NOT IN (
  SELECT DISTINCT attendee_id FROM rfid_tags 
  WHERE attendee_id IS NOT NULL 
  AND status IN ('active', 'assigned')
);

-- Clean up station transactions related to mock UIDs
DELETE FROM station_transactions WHERE rfid_uid LIKE 'MOCK%' OR rfid_uid LIKE 'mock%';

-- Create function for generating test RFID UIDs
CREATE OR REPLACE FUNCTION generate_test_rfid_batch(count_requested INTEGER DEFAULT 5)
RETURNS TABLE(
  test_uid TEXT,
  sequence_number INTEGER
) 
LANGUAGE plpgsql
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

-- Create function to quickly clean test data
CREATE OR REPLACE FUNCTION cleanup_test_rfid_data()
RETURNS INTEGER
LANGUAGE plpgsql
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