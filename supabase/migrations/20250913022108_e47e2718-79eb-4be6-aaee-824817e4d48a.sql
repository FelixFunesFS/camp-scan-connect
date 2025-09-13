-- Fix RFID system to use pre-loaded tags properly

-- First, activate the existing unissued RFID tags so they appear in scanner dropdowns
UPDATE rfid_tags 
SET status = 'active', 
    issued_at = now()
WHERE status = 'unissued';

-- Clean up orphaned scan records that reference deleted attendees
DELETE FROM scans 
WHERE rfid_uid NOT IN (
  SELECT uid FROM rfid_tags WHERE attendee_id IS NOT NULL
) AND rfid_uid IS NOT NULL;