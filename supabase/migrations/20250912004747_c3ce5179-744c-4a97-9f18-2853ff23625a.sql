-- Create sample RFID tags linked to test attendees
INSERT INTO public.rfid_tags (uid, attendee_id, status, issued_at) 
SELECT 
  CASE 
    WHEN a.phone = '4045551234' THEN 'RFID001234'
    WHEN a.phone = '4045551256' THEN 'RFID001256' 
    WHEN a.phone = '4045551278' THEN 'RFID001278'
    WHEN a.phone = '4045551290' THEN 'RFID001290'
    WHEN a.phone = '4045551301' THEN 'RFID001301'
  END as uid,
  a.id as attendee_id,
  'active'::tag_status as status,
  now() as issued_at
FROM public.attendees a
WHERE a.phone IN ('4045551234', '4045551256', '4045551278', '4045551290', '4045551301');