-- Create function to update group early access (fixed syntax)
CREATE OR REPLACE FUNCTION public.update_group_early_access()
RETURNS TABLE(
    orders_updated integer,
    attendees_updated integer,
    updated_orders text[]
)
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
    -- Find orders where at least one attendee has early access but not all do
    FOR order_record IN
        SELECT 
            o.order_id,
            COUNT(*) as total_attendees,
            COUNT(CASE WHEN a.early_access = true THEN 1 END) as early_attendees,
            COUNT(CASE WHEN a.arrival_window = 'early' THEN 1 END) as early_arrival_attendees
        FROM (
            SELECT DISTINCT order_id 
            FROM attendees 
            WHERE order_id IS NOT NULL 
            AND order_id != ''
            AND registration_status = 'registered'
        ) o
        JOIN attendees a ON a.order_id = o.order_id AND a.registration_status = 'registered'
        GROUP BY o.order_id
        HAVING COUNT(CASE WHEN a.early_access = true THEN 1 END) > 0
        AND (
            COUNT(CASE WHEN a.early_access = true THEN 1 END) != COUNT(*) OR
            COUNT(CASE WHEN a.arrival_window = 'early' THEN 1 END) != COUNT(*)
        )
    LOOP
        -- Update all attendees in this order to have early access and early arrival
        UPDATE attendees 
        SET 
            early_access = true,
            arrival_window = 'early',
            updated_at = NOW()
        WHERE order_id = order_record.order_id
        AND registration_status = 'registered'
        AND (early_access = false OR arrival_window != 'early');
        
        -- Track the updates
        GET DIAGNOSTICS current_update_count = ROW_COUNT;
        updated_attendee_count := updated_attendee_count + current_update_count;
        updated_order_count := updated_order_count + 1;
        updated_order_list := array_append(updated_order_list, order_record.order_id);
        
    END LOOP;
    
    -- Return summary
    RETURN QUERY SELECT 
        updated_order_count as orders_updated,
        updated_attendee_count as attendees_updated,
        updated_order_list as updated_orders;
END;
$function$;