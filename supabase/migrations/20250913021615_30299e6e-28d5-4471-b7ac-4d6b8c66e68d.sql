-- Clean up test data: Remove all records with example.com email addresses

-- First, delete station transactions associated with example.com attendees
DELETE FROM station_transactions 
WHERE attendee_id IN (
  SELECT id FROM attendees WHERE email LIKE '%example.com%'
);

-- Then delete all attendee records with example.com email addresses
DELETE FROM attendees WHERE email LIKE '%example.com%';