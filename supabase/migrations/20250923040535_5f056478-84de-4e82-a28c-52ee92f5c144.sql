-- Add missing registration status enum values for proper RegFox status handling
ALTER TYPE registration_status ADD VALUE IF NOT EXISTS 'abandoned';
ALTER TYPE registration_status ADD VALUE IF NOT EXISTS 'transferred'; 
ALTER TYPE registration_status ADD VALUE IF NOT EXISTS 'incomplete';
ALTER TYPE registration_status ADD VALUE IF NOT EXISTS 'draft';

-- Create function to cleanup abandoned records
CREATE OR REPLACE FUNCTION public.cleanup_abandoned_records()
RETURNS TABLE(
    cleanup_successful boolean,
    records_removed integer,
    rfids_cleared integer,
    transactions_updated integer,
    cleanup_details jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
    removed_count INTEGER := 0;
    rfids_cleared_count INTEGER := 0;
    transactions_updated_count INTEGER := 0;
    cleanup_log JSONB := '[]'::JSONB;
    abandoned_record RECORD;
BEGIN
    -- Process each abandoned record
    FOR abandoned_record IN
        SELECT 
            id,
            first_name || ' ' || last_name as full_name,
            email,
            order_id,
            regfox_id
        FROM attendees 
        WHERE registration_status = 'abandoned'
    LOOP
        -- Clear RFID assignments for abandoned attendees
        UPDATE rfid_tags 
        SET status = 'unissued', 
            attendee_id = NULL,
            activated_at = NULL,
            deactivated_at = NOW(),
            reason = 'abandoned_record_cleanup'
        WHERE attendee_id = abandoned_record.id;
        
        GET DIAGNOSTICS rfids_cleared_count = ROW_COUNT;
        
        -- Delete station transactions for abandoned attendees
        DELETE FROM station_transactions 
        WHERE attendee_id = abandoned_record.id;
        
        GET DIAGNOSTICS transactions_updated_count = ROW_COUNT;
        
        -- Log the removal
        cleanup_log := cleanup_log || jsonb_build_array(
            jsonb_build_object(
                'attendee_id', abandoned_record.id,
                'name', abandoned_record.full_name,
                'email', abandoned_record.email,
                'order_id', abandoned_record.order_id,
                'regfox_id', abandoned_record.regfox_id,
                'rfids_cleared', rfids_cleared_count,
                'transactions_removed', transactions_updated_count
            )
        );
        
        -- Delete the abandoned record
        DELETE FROM attendees WHERE id = abandoned_record.id;
        removed_count := removed_count + 1;
    END LOOP;
    
    -- Return cleanup results
    RETURN QUERY SELECT 
        true as cleanup_successful,
        removed_count as records_removed,
        rfids_cleared_count as rfids_cleared,
        transactions_updated_count as transactions_updated,
        cleanup_log as cleanup_details;
        
EXCEPTION
    WHEN OTHERS THEN
        RETURN QUERY SELECT 
            false as cleanup_successful,
            0 as records_removed,
            0 as rfids_cleared,
            0 as transactions_updated,
            jsonb_build_object('error', SQLERRM) as cleanup_details;
END;
$function$;