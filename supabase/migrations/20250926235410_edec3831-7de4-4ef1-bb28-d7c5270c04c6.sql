-- Update bulk_activate_assigned_rfids function with proper security permissions
CREATE OR REPLACE FUNCTION public.bulk_activate_assigned_rfids()
RETURNS TABLE(
  activation_successful boolean, 
  total_activated integer, 
  veterans_thanked integer, 
  activated_attendees jsonb[], 
  activation_details jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    activated_count INTEGER := 0;
    veterans_count INTEGER := 0;
    activation_log JSONB[] := ARRAY[]::JSONB[];
    attendee_record RECORD;
BEGIN
    -- Activate all RFID tags with status = 'assigned'
    -- Also update attendees.activated_at and veteran_thanked_at
    FOR attendee_record IN
        SELECT 
            a.id as attendee_id,
            a.first_name || ' ' || a.last_name as full_name,
            a.is_veteran,
            a.veteran_thanked_at,
            rt.uid as rfid_uid
        FROM attendees a
        INNER JOIN rfid_tags rt ON rt.attendee_id = a.id
        WHERE rt.status = 'assigned'
        AND a.registration_status = 'registered'
        ORDER BY a.first_name, a.last_name
    LOOP
        -- Update RFID tag to active
        UPDATE rfid_tags 
        SET 
            status = 'active',
            activated_at = NOW(),
            activation_method = 'bulk_staff_activation'
        WHERE uid = attendee_record.rfid_uid;
        
        -- Update attendee activation and veteran thanking
        UPDATE attendees 
        SET 
            activated_at = NOW(),
            veteran_thanked_at = CASE 
                WHEN is_veteran = true AND veteran_thanked_at IS NULL THEN NOW()
                ELSE veteran_thanked_at
            END
        WHERE id = attendee_record.attendee_id;
        
        -- Create audit trail in station_transactions
        INSERT INTO station_transactions (
            attendee_id,
            station_type,
            transaction_type,
            rfid_uid,
            activation_method,
            extra_data
        ) VALUES (
            attendee_record.attendee_id,
            'activation',
            'activate',
            attendee_record.rfid_uid,
            'bulk_staff_activation',
            jsonb_build_object(
                'activation_source', 'bulk_activation',
                'attendee_name', attendee_record.full_name,
                'is_veteran', attendee_record.is_veteran,
                'veteran_thanked', (attendee_record.is_veteran = true)
            )
        );
        
        -- Track counts and details
        activated_count := activated_count + 1;
        
        IF attendee_record.is_veteran = true AND attendee_record.veteran_thanked_at IS NULL THEN
            veterans_count := veterans_count + 1;
        END IF;
        
        -- Add to activation log
        activation_log := activation_log || ARRAY[
            jsonb_build_object(
                'attendee_id', attendee_record.attendee_id,
                'name', attendee_record.full_name,
                'rfid_uid', attendee_record.rfid_uid,
                'is_veteran', attendee_record.is_veteran,
                'was_veteran_thanked', (attendee_record.is_veteran = true AND attendee_record.veteran_thanked_at IS NULL)
            )
        ];
    END LOOP;
    
    -- Return summary results
    RETURN QUERY SELECT 
        true as activation_successful,
        activated_count as total_activated,
        veterans_count as veterans_thanked,
        activation_log as activated_attendees,
        jsonb_build_object(
            'total_processed', activated_count,
            'veterans_thanked', veterans_count,
            'activation_method', 'bulk_staff_activation',
            'processed_at', NOW()
        ) as activation_details;
        
EXCEPTION
    WHEN OTHERS THEN
        RETURN QUERY SELECT 
            false as activation_successful,
            0 as total_activated,
            0 as veterans_thanked,
            ARRAY[]::JSONB[] as activated_attendees,
            jsonb_build_object('error', SQLERRM) as activation_details;
END;
$$;