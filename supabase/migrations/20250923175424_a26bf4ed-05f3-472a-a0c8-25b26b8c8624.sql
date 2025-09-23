-- Create enhanced cleanup function for all registration statuses
CREATE OR REPLACE FUNCTION public.cleanup_all_status_duplicates()
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
SET search_path = 'public'
AS $function$
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
    best_rfid RECORD;
    other_rfids RECORD;
    rfids_deactivated TEXT[] := ARRAY[]::TEXT[];
    canonical_existing_rfid TEXT;
BEGIN
    -- Get initial count across ALL registration statuses
    SELECT COUNT(*) INTO initial_count FROM attendees;
    
    -- Process each group of duplicates across ALL registration statuses
    FOR duplicate_groups IN
        SELECT 
            regfox_id,
            registration_status,
            COUNT(*) as duplicate_count,
            ARRAY_AGG(id ORDER BY created_at ASC, updated_at DESC) as attendee_ids
        FROM attendees 
        WHERE regfox_id IS NOT NULL 
        AND regfox_id != ''
        GROUP BY regfox_id, registration_status
        HAVING COUNT(*) > 1
    LOOP
        -- Initialize group log
        group_log := jsonb_build_object(
            'regfox_id', duplicate_groups.regfox_id,
            'registration_status', duplicate_groups.registration_status,
            'total_duplicates', duplicate_groups.duplicate_count,
            'canonical_id', duplicate_groups.attendee_ids[1],
            'removed_ids', ARRAY[]::UUID[],
            'rfids_kept', ARRAY[]::TEXT[],
            'rfids_deactivated', ARRAY[]::TEXT[],
            'transactions_updated', 0,
            'rfid_consolidation_strategy', 'none'
        );
        
        -- Get canonical record (oldest created_at)
        SELECT * INTO canonical_record 
        FROM attendees 
        WHERE id = duplicate_groups.attendee_ids[1];
        
        -- Check if canonical attendee already has an RFID
        SELECT uid INTO canonical_existing_rfid
        FROM rfid_tags 
        WHERE attendee_id = canonical_record.id 
        AND status IN ('assigned', 'active')
        LIMIT 1;
        
        -- Find the best RFID from all duplicate attendees (excluding canonical if it already has one)
        IF canonical_existing_rfid IS NULL THEN
            -- Find best RFID from ALL attendees in the duplicate group
            SELECT rt.uid, rt.status, rt.activated_at, rt.issued_at, rt.attendee_id
            INTO best_rfid
            FROM rfid_tags rt
            WHERE rt.attendee_id = ANY(duplicate_groups.attendee_ids)
            AND rt.status IN ('assigned', 'active')
            ORDER BY 
                CASE rt.status 
                    WHEN 'active' THEN 1 
                    WHEN 'assigned' THEN 2 
                    ELSE 3 
                END,
                rt.activated_at DESC NULLS LAST,
                rt.issued_at DESC
            LIMIT 1;
            
            -- If we found a best RFID and it's not already on the canonical attendee
            IF best_rfid.uid IS NOT NULL THEN
                -- Assign the best RFID to canonical attendee
                UPDATE rfid_tags 
                SET attendee_id = canonical_record.id
                WHERE uid = best_rfid.uid;
                
                -- Log the kept RFID
                group_log := jsonb_set(group_log, '{rfids_kept}', 
                    jsonb_build_array(jsonb_build_object(
                        'uid', best_rfid.uid,
                        'status', best_rfid.status,
                        'reason', 'selected_as_best',
                        'original_attendee', best_rfid.attendee_id
                    ))
                );
                
                -- Update consolidation strategy
                group_log := jsonb_set(group_log, '{rfid_consolidation_strategy}', '"best_rfid_selected"');
            END IF;
        ELSE
            -- Canonical attendee already has RFID, just log it
            group_log := jsonb_set(group_log, '{rfids_kept}', 
                jsonb_build_array(jsonb_build_object(
                    'uid', canonical_existing_rfid,
                    'status', 'existing',
                    'reason', 'canonical_already_had_rfid',
                    'original_attendee', canonical_record.id
                ))
            );
            group_log := jsonb_set(group_log, '{rfid_consolidation_strategy}', '"canonical_kept_existing"');
        END IF;
        
        -- Deactivate all other RFID tags from duplicate attendees
        FOR other_rfids IN
            SELECT rt.uid, rt.status, rt.attendee_id
            FROM rfid_tags rt
            WHERE rt.attendee_id = ANY(duplicate_groups.attendee_ids)
            AND rt.status IN ('assigned', 'active')
            AND (best_rfid.uid IS NULL OR rt.uid != best_rfid.uid)
            AND (canonical_existing_rfid IS NULL OR rt.uid != canonical_existing_rfid)
        LOOP
            -- Set RFID to unissued and clear attendee assignment
            UPDATE rfid_tags 
            SET status = 'unissued', 
                attendee_id = NULL,
                activated_at = NULL,
                deactivated_at = NOW(),
                reason = 'all_status_duplicate_cleanup_deactivation'
            WHERE uid = other_rfids.uid;
            
            -- Track deactivated RFIDs
            rfids_deactivated := array_append(rfids_deactivated, other_rfids.uid);
        END LOOP;
        
        -- Log deactivated RFIDs
        group_log := jsonb_set(group_log, '{rfids_deactivated}', 
            array_to_json(rfids_deactivated)::jsonb
        );
        
        -- Process each duplicate attendee (skip the canonical record)
        FOR i IN 2..array_length(duplicate_groups.attendee_ids, 1) LOOP
            SELECT * INTO duplicate_record 
            FROM attendees 
            WHERE id = duplicate_groups.attendee_ids[i];
            
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
        
        -- Reset for next group
        rfids_deactivated := ARRAY[]::TEXT[];
        
        -- Add group log to cleanup log
        cleanup_log := cleanup_log || jsonb_build_array(group_log);
    END LOOP;
    
    -- Get final count
    SELECT COUNT(*) INTO final_count FROM attendees;
    
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
        -- Handle errors without explicit ROLLBACK (PostgreSQL handles this automatically)
        error_list := array_append(error_list, SQLERRM);
        
        RETURN QUERY SELECT 
            false as cleanup_successful,
            initial_count as total_records_before,
            initial_count as total_records_after,
            0 as duplicates_removed,
            error_list as errors_encountered,
            '[]'::JSONB as cleanup_details;
END;
$function$;