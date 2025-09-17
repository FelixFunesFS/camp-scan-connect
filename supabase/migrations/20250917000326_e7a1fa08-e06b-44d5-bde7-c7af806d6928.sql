-- Test Data Cleanup - Remove Pure Test Attendees Only (Preserving Mock RFID System)

-- Delete test attendees (this will automatically handle any associated RFID tag references)
DELETE FROM attendees 
WHERE regfox_id LIKE 'TEST_%' 
   OR email LIKE '%@test.com' 
   OR email LIKE '%test%'
   OR (first_name ILIKE '%test%' AND last_name ILIKE '%test%');

-- Delete any test station transactions (safety measure, though query showed 0)
DELETE FROM station_transactions 
WHERE extra_data ? 'test' AND (extra_data->>'test')::boolean = true;