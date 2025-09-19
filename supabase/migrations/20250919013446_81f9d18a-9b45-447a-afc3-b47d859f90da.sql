-- Remove webhook entries that are duplicates of API sync entries
-- These are identifiable by alphanumeric order_id format and will be recaptured in next API sync

-- First, log what we're about to delete for verification
DO $$
DECLARE
    webhook_count integer;
    total_before integer;
BEGIN
    -- Count total attendees before deletion
    SELECT COUNT(*) INTO total_before FROM attendees;
    
    -- Count webhook entries to be deleted
    SELECT COUNT(*) INTO webhook_count 
    FROM attendees 
    WHERE is_alphanumeric_regfox_id(order_id) = true;
    
    RAISE NOTICE 'Total attendees before deletion: %', total_before;
    RAISE NOTICE 'Webhook entries to be deleted: %', webhook_count;
END $$;

-- Delete webhook entries (those with alphanumeric order_id)
-- These are confirmed duplicates with no RFID assignments
DELETE FROM attendees 
WHERE is_alphanumeric_regfox_id(order_id) = true;

-- Verify deletion results
DO $$
DECLARE
    total_after integer;
    remaining_webhook integer;
BEGIN
    -- Count total attendees after deletion
    SELECT COUNT(*) INTO total_after FROM attendees;
    
    -- Verify no webhook entries remain
    SELECT COUNT(*) INTO remaining_webhook 
    FROM attendees 
    WHERE is_alphanumeric_regfox_id(order_id) = true;
    
    RAISE NOTICE 'Total attendees after deletion: %', total_after;
    RAISE NOTICE 'Remaining webhook entries (should be 0): %', remaining_webhook;
END $$;