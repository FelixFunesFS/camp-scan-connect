-- Clean up orphaned RFID tags (active tags with no attendee assigned)
UPDATE rfid_tags 
SET 
  status = 'unissued',
  deactivated_at = now(),
  reason = 'Data reconciliation - orphaned tag cleanup'
WHERE status = 'active' AND attendee_id IS NULL;

-- Add database constraints to prevent future orphaned tags
-- This constraint ensures that active tags must have an attendee_id
ALTER TABLE rfid_tags 
ADD CONSTRAINT check_active_tags_have_attendee 
CHECK (
  (status != 'active') OR 
  (status = 'active' AND attendee_id IS NOT NULL)
);