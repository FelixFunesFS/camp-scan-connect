-- Comprehensive RFID cleanup migration (fixed)
-- This will preserve only the 3 specified keeper RFIDs and clean up all others

-- Step 1: Reset activated_at for attendees who will lose their RFID assignments
-- (except those with keeper RFIDs)
UPDATE attendees 
SET activated_at = NULL 
WHERE id IN (
    SELECT DISTINCT rt.attendee_id 
    FROM rfid_tags rt 
    WHERE rt.attendee_id IS NOT NULL 
    AND rt.uid NOT IN ('mocke24098509', 'mockwwer098', 'mocke2340985')
);

-- Step 2: Clean up station_transactions for RFIDs that will be removed
DELETE FROM station_transactions 
WHERE rfid_uid IS NOT NULL 
AND rfid_uid NOT IN ('mocke24098509', 'mockwwer098', 'mocke2340985');

-- Step 3: Remove all RFID assignments except the 3 keepers
-- Set them back to unissued status
UPDATE rfid_tags 
SET 
    status = 'unissued',
    attendee_id = NULL,
    activated_at = NULL,
    deactivated_at = NULL,
    reason = 'Bulk cleanup - removed during data consolidation',
    activation_method = NULL,
    issued_at = NULL
WHERE uid NOT IN ('mocke24098509', 'mockwwer098', 'mocke2340985');

-- Step 4: Ensure the keeper RFIDs have proper status
-- Set keeper RFIDs to 'assigned' status (not active until user activates)
UPDATE rfid_tags 
SET 
    status = 'assigned',
    activated_at = NULL,
    activation_method = NULL
WHERE uid IN ('mocke24098509', 'mockwwer098', 'mocke2340985');

-- Step 5: Add constraint to prevent multiple active RFIDs per attendee
-- First drop if exists
DROP INDEX IF EXISTS unique_active_rfid_per_attendee;

-- Create a unique partial index to ensure only one active/assigned RFID per attendee
CREATE UNIQUE INDEX unique_active_rfid_per_attendee 
ON rfid_tags (attendee_id) 
WHERE status IN ('active', 'assigned') AND attendee_id IS NOT NULL;

-- Step 6: Update the lookup function to remove overall_status and fix status logic
CREATE OR REPLACE FUNCTION public.lookup_attendees_by_phone(p_phone text)
RETURNS TABLE(attendee_count integer, has_group_order boolean, order_id text, attendee_details jsonb[], order_companions jsonb[])
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
    normalized_phone TEXT;
    result_record RECORD;
BEGIN
    -- Normalize the phone number
    normalized_phone := normalize_phone(p_phone);
    
    -- Get attendee details for this phone number with explicit column references
    WITH phone_attendees AS (
        SELECT 
            a.id,
            a.first_name,
            a.last_name,
            a.order_id as attendee_order_id,
            a.activated_at as attendee_activated_at,
            a.meal_plan,
            a.arrival_window,
            a.ticket_type,
            a.waiver_signed,
            rt.uid as rfid_uid,
            rt.activated_at as rfid_activated_at,
            rt.status as rfid_status
        FROM attendees a
        LEFT JOIN rfid_tags rt ON rt.attendee_id = a.id AND rt.status IN ('assigned', 'active')
        WHERE normalize_phone(a.phone) = normalized_phone
        AND a.registration_status = 'registered'
    ),
    -- Get order companions (people in same orders but different phones)
    order_companions AS (
        SELECT DISTINCT
            oc.id,
            oc.first_name,
            oc.last_name,
            oc.order_id as companion_order_id,
            oc.phone as companion_phone,
            oc.activated_at as companion_activated_at,
            oc.meal_plan as companion_meal_plan,
            oc.arrival_window as companion_arrival_window,
            oc.ticket_type as companion_ticket_type,
            oc.waiver_signed as companion_waiver_signed,
            rt2.uid as companion_rfid_uid,
            rt2.activated_at as companion_rfid_activated_at,
            rt2.status as companion_rfid_status
        FROM phone_attendees pa
        INNER JOIN attendees oc ON oc.order_id = pa.attendee_order_id 
            AND oc.order_id IS NOT NULL 
            AND oc.order_id != ''
            AND normalize_phone(oc.phone) != normalized_phone
            AND oc.registration_status = 'registered'
        LEFT JOIN rfid_tags rt2 ON rt2.attendee_id = oc.id AND rt2.status IN ('assigned', 'active')
    ),
    summary AS (
        SELECT 
            COUNT(*) as total_count,
            COUNT(DISTINCT NULLIF(pa.attendee_order_id, '')) as distinct_orders,
            MIN(pa.attendee_order_id) as first_order_id,
            ARRAY_AGG(
                jsonb_build_object(
                    'id', pa.id,
                    'name', pa.first_name || ' ' || pa.last_name,
                    'order_id', pa.attendee_order_id,
                    'meal_plan', pa.meal_plan,
                    'arrival_window', pa.arrival_window,
                    'ticket_type', pa.ticket_type,
                    'waiver_signed', pa.waiver_signed,
                    'rfid_uid', pa.rfid_uid,
                    'activated_at', pa.attendee_activated_at,
                    'rfid_activated_at', pa.rfid_activated_at,
                    'rfid_status', pa.rfid_status,
                    'is_activated', CASE WHEN pa.attendee_activated_at IS NOT NULL THEN true ELSE false END,
                    'has_rfid', CASE WHEN pa.rfid_uid IS NOT NULL THEN true ELSE false END
                )
            ) as details,
            COALESCE(ARRAY_AGG(
                CASE WHEN oc.id IS NOT NULL THEN
                    jsonb_build_object(
                        'id', oc.id,
                        'name', oc.first_name || ' ' || oc.last_name,
                        'order_id', oc.companion_order_id,
                        'phone', oc.companion_phone,
                        'meal_plan', oc.companion_meal_plan,
                        'arrival_window', oc.companion_arrival_window,
                        'ticket_type', oc.companion_ticket_type,
                        'waiver_signed', oc.companion_waiver_signed,
                        'rfid_uid', oc.companion_rfid_uid,
                        'activated_at', oc.companion_activated_at,
                        'rfid_activated_at', oc.companion_rfid_activated_at,
                        'rfid_status', oc.companion_rfid_status,
                        'is_activated', CASE WHEN oc.companion_activated_at IS NOT NULL THEN true ELSE false END,
                        'has_rfid', CASE WHEN oc.companion_rfid_uid IS NOT NULL THEN true ELSE false END
                    )
                ELSE NULL END
            ) FILTER (WHERE oc.id IS NOT NULL), ARRAY[]::jsonb[]) as companions
        FROM phone_attendees pa
        LEFT JOIN order_companions oc ON true
    )
    SELECT 
        s.total_count::integer as result_attendee_count,
        CASE 
            WHEN s.distinct_orders = 1 AND s.first_order_id IS NOT NULL AND s.first_order_id != '' THEN true
            ELSE false
        END as result_has_group,
        CASE 
            WHEN s.distinct_orders = 1 AND s.first_order_id IS NOT NULL AND s.first_order_id != '' THEN s.first_order_id
            ELSE NULL
        END as result_order_id,
        s.details as result_details,
        s.companions as result_companions
    FROM summary s
    INTO result_record;
    
    -- Return results using the function's return column names
    RETURN QUERY SELECT 
        result_record.result_attendee_count,
        result_record.result_has_group,
        result_record.result_order_id,
        result_record.result_details,
        result_record.result_companions;
END;
$function$;