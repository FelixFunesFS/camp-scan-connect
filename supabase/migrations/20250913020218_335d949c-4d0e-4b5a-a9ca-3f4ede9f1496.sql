-- Fix security issue for get_daily_transaction_count function
CREATE OR REPLACE FUNCTION public.get_daily_transaction_count(p_attendee_id uuid, p_station_type station_type, p_transaction_types transaction_type[])
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    RETURN (
        SELECT COUNT(*)
        FROM public.station_transactions
        WHERE attendee_id = p_attendee_id
        AND station_type = p_station_type
        AND transaction_type = ANY(p_transaction_types)
        AND DATE(created_at) = CURRENT_DATE
    );
END;
$function$;