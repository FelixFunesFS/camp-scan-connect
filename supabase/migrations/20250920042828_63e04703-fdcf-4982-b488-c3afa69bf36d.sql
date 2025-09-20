-- Clean up all unissued RFID tags from the database
DELETE FROM rfid_tags WHERE status = 'unissued' AND attendee_id IS NULL;

-- Also clean up any generated test RFID UIDs that might be assigned
UPDATE rfid_tags 
SET status = 'unissued', 
    attendee_id = NULL,
    activated_at = NULL,
    deactivated_at = NULL,
    reason = NULL,
    activation_method = NULL
WHERE attendee_id IS NOT NULL 
  AND (uid LIKE 'MOCK%' OR uid LIKE 'RFID%' OR uid LIKE 'TEST%');

-- Reset any attendees who had test RFIDs
UPDATE attendees 
SET activated_at = NULL 
WHERE activated_at IS NOT NULL 
  AND id NOT IN (
    SELECT DISTINCT attendee_id FROM rfid_tags 
    WHERE attendee_id IS NOT NULL 
      AND status IN ('active', 'assigned')
      AND uid NOT LIKE 'MOCK%' 
      AND uid NOT LIKE 'RFID%' 
      AND uid NOT LIKE 'TEST%'
  );