-- Step 1: Add DELETE policy for attendees table
CREATE POLICY "Allow authenticated users to delete attendees for cleanup operations" 
ON public.attendees 
FOR DELETE 
USING (true);

-- Step 2: Create safe cleanup function with comprehensive logging
CREATE OR REPLACE FUNCTION public.safe_cleanup_duplicates()
RETURNS TABLE(
    cleanup_successful boolean,
    total_records_before integer,
    total_records_after integer,
    duplicates_removed integer,
    errors_encountered text[],
    cleanup_details jsonb
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    initial_count INTEGER;
    final_count INTEGER;
    removed_count INTEGER := 0;
    error_list TEXT[] := ARRAY[]::TEXT[];
    duplicate_groups RECORD;
    canonical_record RECORD;
    duplicate_record RECORD;
    cleanup_log JSONB := '[]'::JSONB;
    group_log JSONB;
BEGIN
    -- Get initial count
    SELECT COUNT(*) INTO initial_count 
    FROM attendees 
    WHERE registration_status = 'registered';
    
    -- Begin transaction for safety
    BEGIN
        -- Process each group of duplicates
        FOR duplicate_groups IN
            SELECT 
                regfox_id,
                COUNT(*) as duplicate_count,
                ARRAY_AGG(id ORDER BY created_at ASC, updated_at DESC) as attendee_ids
            FROM attendees 
            WHERE registration_status = 'registered'
            AND regfox_id IS NOT NULL 
            AND regfox_id != ''
            GROUP BY regfox_id 
            HAVING COUNT(*) > 1
        LOOP
            -- Initialize group log
            group_log := jsonb_build_object(
                'regfox_id', duplicate_groups.regfox_id,
                'total_duplicates', duplicate_groups.duplicate_count,
                'canonical_id', duplicate_groups.attendee_ids[1],
                'removed_ids', ARRAY[]::UUID[],
                'rfids_consolidated', ARRAY[]::TEXT[],
                'transactions_updated', 0
            );
            
            -- Get canonical record (oldest created_at)
            SELECT * INTO canonical_record 
            FROM attendees 
            WHERE id = duplicate_groups.attendee_ids[1];
            
            -- Process each duplicate (skip the canonical record)
            FOR i IN 2..array_length(duplicate_groups.attendee_ids, 1) LOOP
                SELECT * INTO duplicate_record 
                FROM attendees 
                WHERE id = duplicate_groups.attendee_ids[i];
                
                -- Consolidate RFID tags to canonical record
                UPDATE rfid_tags 
                SET attendee_id = canonical_record.id
                WHERE attendee_id = duplicate_record.id;
                
                -- Update station transactions to point to canonical record
                UPDATE station_transactions 
                SET attendee_id = canonical_record.id
                WHERE attendee_id = duplicate_record.id;
                
                -- Log the consolidation
                group_log := jsonb_set(
                    group_log, 
                    '{removed_ids}', 
                    (group_log->'removed_ids') || to_jsonb(duplicate_record.id)
                );
                
                -- Delete the duplicate record
                DELETE FROM attendees WHERE id = duplicate_record.id;
                
                removed_count := removed_count + 1;
            END LOOP;
            
            -- Add group log to cleanup log
            cleanup_log := cleanup_log || jsonb_build_array(group_log);
        END LOOP;
        
        -- Get final count
        SELECT COUNT(*) INTO final_count 
        FROM attendees 
        WHERE registration_status = 'registered';
        
        -- Return success results
        RETURN QUERY SELECT 
            true as cleanup_successful,
            initial_count as total_records_before,
            final_count as total_records_after,
            removed_count as duplicates_removed,
            error_list as errors_encountered,
            cleanup_log as cleanup_details;
            
    EXCEPTION
        WHEN OTHERS THEN
            -- Rollback and return error
            ROLLBACK;
            error_list := array_append(error_list, SQLERRM);
            
            RETURN QUERY SELECT 
                false as cleanup_successful,
                initial_count as total_records_before,
                initial_count as total_records_after,
                0 as duplicates_removed,
                error_list as errors_encountered,
                '[]'::JSONB as cleanup_details;
    END;
END;
$$;