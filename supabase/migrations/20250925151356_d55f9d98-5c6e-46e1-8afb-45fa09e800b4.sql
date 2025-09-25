-- Clear all station transactions (155 testing transactions across all stations)
DELETE FROM station_transactions;

-- Reset attendee activation timestamps from testing (29 activated_at, 8 veteran_thanked_at)
UPDATE attendees 
SET activated_at = NULL, 
    veteran_thanked_at = NULL 
WHERE activated_at IS NOT NULL OR veteran_thanked_at IS NOT NULL;

-- Reset RFID activation timestamps but keep assignments (29 activated tags)
UPDATE rfid_tags 
SET activated_at = NULL,
    activation_method = NULL
WHERE activated_at IS NOT NULL;