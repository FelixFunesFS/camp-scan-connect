-- Remove Buster Bluth test record
DELETE FROM attendees WHERE id = '80f67a3f-09ac-4b27-af10-7a83694b27b1';

-- Also remove any associated RFID tags
DELETE FROM rfid_tags WHERE attendee_id = '80f67a3f-09ac-4b27-af10-7a83694b27b1';