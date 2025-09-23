-- Execute the comprehensive duplicate cleanup
DO $$
DECLARE
    cleanup_result RECORD;
BEGIN
    -- Execute the cleanup function
    SELECT * FROM cleanup_all_status_duplicates() INTO cleanup_result;
    
    -- Log the results for reference
    RAISE NOTICE 'Cleanup completed: % records removed from % total records', 
        cleanup_result.duplicates_removed, 
        cleanup_result.total_records_before;
    
    -- If cleanup failed, raise an error with details
    IF NOT cleanup_result.cleanup_successful THEN
        RAISE EXCEPTION 'Cleanup failed: %', array_to_string(cleanup_result.errors_encountered, ', ');
    END IF;
END
$$;