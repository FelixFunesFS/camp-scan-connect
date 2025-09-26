-- Sync attendees.activated_at for existing activations
-- This fixes attendees who have activation transactions but missing activated_at timestamps

UPDATE attendees 
SET activated_at = latest_activation.created_at
FROM (
    SELECT 
        attendee_id,
        MAX(created_at) as created_at
    FROM station_transactions 
    WHERE station_type = 'activation' 
    AND transaction_type = 'activate'
    GROUP BY attendee_id
) as latest_activation
WHERE attendees.id = latest_activation.attendee_id
AND attendees.activated_at IS NULL;