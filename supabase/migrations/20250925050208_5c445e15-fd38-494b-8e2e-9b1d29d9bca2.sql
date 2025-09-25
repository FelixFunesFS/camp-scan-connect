-- Standardize all meal plans to "Plan 1"

-- Update the existing function to always set meal plans to "1" instead of preserving original values
CREATE OR REPLACE FUNCTION public.update_group_meal_plans()
 RETURNS TABLE(orders_updated integer, attendees_updated integer, updated_orders text[])
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    updated_order_count integer := 0;
    updated_attendee_count integer := 0;
    updated_order_list text[] := ARRAY[]::text[];
    order_record RECORD;
    current_update_count integer;
BEGIN
    -- Find orders where at least one attendee has a meal plan but not all do
    FOR order_record IN
        SELECT 
            o.order_id,
            COUNT(*) as total_attendees,
            COUNT(CASE WHEN a.meal_plan IS NOT NULL AND a.meal_plan != '' AND a.meal_plan != '0' AND a.meal_plan != 'none' THEN 1 END) as meal_plan_attendees
        FROM (
            SELECT DISTINCT order_id 
            FROM attendees 
            WHERE order_id IS NOT NULL 
            AND order_id != ''
            AND registration_status = 'registered'
        ) o
        JOIN attendees a ON a.order_id = o.order_id AND a.registration_status = 'registered'
        GROUP BY o.order_id
        HAVING COUNT(CASE WHEN a.meal_plan IS NOT NULL AND a.meal_plan != '' AND a.meal_plan != '0' AND a.meal_plan != 'none' THEN 1 END) > 0
        AND COUNT(CASE WHEN a.meal_plan IS NOT NULL AND a.meal_plan != '' AND a.meal_plan != '0' AND a.meal_plan != 'none' THEN 1 END) != COUNT(*)
    LOOP        
        -- Update all attendees in this order to have standardized meal plan "1"
        UPDATE attendees 
        SET 
            meal_plan = '1',  -- Always set to "1" which displays as "Plan 1"
            updated_at = NOW()
        WHERE order_id = order_record.order_id
        AND registration_status = 'registered'
        AND (meal_plan IS NULL OR meal_plan = '' OR meal_plan = '0' OR meal_plan = 'none');
        
        -- Track the updates
        GET DIAGNOSTICS current_update_count = ROW_COUNT;
        
        -- Only count if we actually updated something
        IF current_update_count > 0 THEN
            updated_attendee_count := updated_attendee_count + current_update_count;
            updated_order_count := updated_order_count + 1;
            updated_order_list := array_append(updated_order_list, order_record.order_id);
        END IF;
        
    END LOOP;
    
    -- Return summary
    RETURN QUERY SELECT 
        updated_order_count as orders_updated,
        updated_attendee_count as attendees_updated,
        updated_order_list as updated_orders;
END;
$function$;

-- Create function to standardize all existing meal plan data to "1"
CREATE OR REPLACE FUNCTION public.standardize_all_meal_plans()
 RETURNS TABLE(total_updated integer, details jsonb)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    update_count integer := 0;
    details_obj jsonb := '{}'::jsonb;
BEGIN
    -- Convert all meal plan values to "1" for consistency
    UPDATE attendees 
    SET 
        meal_plan = '1',
        updated_at = NOW()
    WHERE meal_plan IS NOT NULL 
    AND meal_plan != '' 
    AND meal_plan != '0' 
    AND meal_plan != 'none'
    AND meal_plan != '1'
    AND registration_status = 'registered';
    
    GET DIAGNOSTICS update_count = ROW_COUNT;
    
    -- Build details object
    details_obj := jsonb_build_object(
        'updated_count', update_count,
        'message', 'All meal plans standardized to "1" (displays as "Plan 1")',
        'timestamp', NOW()
    );
    
    RETURN QUERY SELECT 
        update_count as total_updated,
        details_obj as details;
END;
$function$;

-- Run the standardization immediately
SELECT * FROM standardize_all_meal_plans();