-- Clean up existing non-registered attendees that shouldn't be in RFID system
-- First, deactivate any RFID tags assigned to non-registered attendees
UPDATE rfid_tags 
SET status = 'unissued', 
    attendee_id = NULL,
    activated_at = NULL,
    deactivated_at = NOW(),
    reason = 'non_registered_attendee_cleanup'
WHERE attendee_id IN (
    SELECT id FROM attendees 
    WHERE registration_status != 'registered'
);

-- Remove station transactions for non-registered attendees
DELETE FROM station_transactions 
WHERE attendee_id IN (
    SELECT id FROM attendees 
    WHERE registration_status != 'registered'
);

-- Delete non-registered attendees from the system
DELETE FROM attendees 
WHERE registration_status != 'registered';

-- Run the safe cleanup for remaining duplicates
SELECT * FROM safe_cleanup_duplicates();