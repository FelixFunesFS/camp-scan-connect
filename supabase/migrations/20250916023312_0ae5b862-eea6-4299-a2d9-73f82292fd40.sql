-- Insert mock RFID tags for all attendees without any RFID tags
INSERT INTO rfid_tags (uid, attendee_id, status, issued_at)
SELECT 
    'MOCK' || UPPER(substring(md5(random()::text || a.id::text) from 1 for 8)) as uid,
    a.id as attendee_id,
    'active'::tag_status as status,
    NOW() as issued_at
FROM attendees a
LEFT JOIN rfid_tags rt ON rt.attendee_id = a.id
WHERE rt.attendee_id IS NULL;