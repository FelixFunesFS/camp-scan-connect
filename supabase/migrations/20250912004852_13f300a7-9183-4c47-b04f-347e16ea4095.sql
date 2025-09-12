-- Clean up duplicate attendees and create RFID tags
WITH unique_attendees AS (
  SELECT DISTINCT ON (phone) id, phone, first_name, last_name, ticket_type, early_access, override_early_checkin
  FROM public.attendees 
  WHERE phone IN ('4045551234', '4045551256', '4045551278', '4045551290', '4045551301')
  ORDER BY phone, created_at DESC
)
INSERT INTO public.rfid_tags (uid, attendee_id, status, issued_at)
SELECT 
  CASE 
    WHEN phone = '4045551234' THEN 'RFID001234'
    WHEN phone = '4045551256' THEN 'RFID001256' 
    WHEN phone = '4045551278' THEN 'RFID001278'
    WHEN phone = '4045551290' THEN 'RFID001290'
    WHEN phone = '4045551301' THEN 'RFID001301'
  END as uid,
  id as attendee_id,
  'active'::tag_status as status,
  now() as issued_at
FROM unique_attendees;