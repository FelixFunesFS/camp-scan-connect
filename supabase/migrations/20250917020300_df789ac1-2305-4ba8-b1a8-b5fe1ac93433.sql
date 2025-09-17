-- Update all deactivated RFID tags to unissued status
UPDATE rfid_tags 
SET status = 'unissued', deactivated_at = NULL, reason = NULL
WHERE status = 'deactivated';

-- Clean up any orphaned RFID assignments where attendee was deleted
UPDATE rfid_tags 
SET status = 'unissued', attendee_id = NULL, deactivated_at = NULL, reason = NULL
WHERE attendee_id IS NOT NULL 
AND NOT EXISTS (SELECT 1 FROM attendees WHERE id = rfid_tags.attendee_id);