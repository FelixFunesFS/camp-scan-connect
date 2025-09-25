-- Create function to update meal plans for entire order groups
-- If any attendee in an order has a meal plan, all attendees in that order should get the same meal plan
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
    chosen_meal_plan text;
BEGIN
    -- Find orders where at least one attendee has a meal plan but not all do
    FOR order_record IN
        SELECT 
            o.order_id,
            COUNT(*) as total_attendees,
            COUNT(CASE WHEN a.meal_plan IS NOT NULL AND a.meal_plan != '' AND a.meal_plan != '0' AND a.meal_plan != 'none' THEN 1 END) as meal_plan_attendees,
            -- Get the first non-null, non-empty meal plan value to use for the whole group
            (SELECT a2.meal_plan 
             FROM attendees a2 
             WHERE a2.order_id = o.order_id 
             AND a2.registration_status = 'registered'
             AND a2.meal_plan IS NOT NULL 
             AND a2.meal_plan != '' 
             AND a2.meal_plan != '0' 
             AND a2.meal_plan != 'none'
             LIMIT 1) as group_meal_plan
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
        -- Get the meal plan to apply to the whole group
        chosen_meal_plan := order_record.group_meal_plan;
        
        -- Skip if no valid meal plan found
        IF chosen_meal_plan IS NULL THEN
            CONTINUE;
        END IF;
        
        -- Update all attendees in this order to have the same meal plan
        UPDATE attendees 
        SET 
            meal_plan = chosen_meal_plan,
            updated_at = NOW()
        WHERE order_id = order_record.order_id
        AND registration_status = 'registered'
        AND (meal_plan IS NULL OR meal_plan = '' OR meal_plan = '0' OR meal_plan = 'none' OR meal_plan != chosen_meal_plan);
        
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
$function$