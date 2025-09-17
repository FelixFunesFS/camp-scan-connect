-- Safe Test Data Cleanup - Handle RFID constraint properly

-- Step 1: First, set RFID tags associated with test attendees to 'unissued' status
-- This makes them available for reuse while respecting the constraint
UPDATE rfid_tags 
SET status = 'unissued',
    attendee_id = NULL,
    issued_at = NULL,
    activated_at = NULL,
    activation_method = NULL
WHERE attendee_id IN (
    SELECT id FROM attendees 
    WHERE regfox_id LIKE 'TEST_%' 
       OR email LIKE '%@test.com' 
       OR email LIKE '%test%'
       OR (first_name ILIKE '%test%' AND last_name ILIKE '%test%')
);

-- Step 2: Now safely delete test attendees (RFID tags are no longer dependent)
DELETE FROM attendees 
WHERE regfox_id LIKE 'TEST_%' 
   OR email LIKE '%@test.com' 
   OR email LIKE '%test%'
   OR (first_name ILIKE '%test%' AND last_name ILIKE '%test%');

-- Step 3: Delete any test station transactions (safety measure)
DELETE FROM station_transactions 
WHERE extra_data ? 'test' AND (extra_data->>'test')::boolean = true;