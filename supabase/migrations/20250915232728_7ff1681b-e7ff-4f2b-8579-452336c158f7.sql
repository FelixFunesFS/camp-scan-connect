-- Update database functions for 3-minute timeout instead of 30 minutes

-- Update can_start_sync function to check for 3-minute timeout
CREATE OR REPLACE FUNCTION public.can_start_sync()
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    active_sync_count integer;
    active_lock_count integer;
BEGIN
    -- Clean up expired locks first
    PERFORM cleanup_expired_locks();
    
    -- Check for active syncs (reduced from 30 minutes to 3 minutes)
    SELECT COUNT(*) INTO active_sync_count
    FROM regfox_sync_log
    WHERE status = 'in_progress' 
    AND (cancelled_at IS NULL)
    AND (sync_started_at > now() - interval '3 minutes');
    
    -- Check for active locks
    SELECT COUNT(*) INTO active_lock_count
    FROM sync_locks
    WHERE lock_type = 'regfox_sync'
    AND expires_at > now();
    
    RETURN (active_sync_count = 0 AND active_lock_count = 0);
END;
$function$;

-- Add function to detect stuck syncs with no heartbeat
CREATE OR REPLACE FUNCTION public.cleanup_stuck_syncs()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    stuck_count integer := 0;
BEGIN
    -- Find syncs that are in progress but haven't sent heartbeat in 3 minutes
    WITH stuck_syncs AS (
        UPDATE regfox_sync_log 
        SET status = 'error',
            error_message = 'Sync timed out after 3 minutes - no heartbeat',
            sync_completed_at = now()
        WHERE status = 'in_progress'
        AND cancelled_at IS NULL
        AND (heartbeat_at IS NULL OR heartbeat_at < now() - interval '3 minutes')
        RETURNING id
    )
    SELECT COUNT(*) INTO stuck_count FROM stuck_syncs;
    
    -- Release locks for stuck syncs
    DELETE FROM sync_locks 
    WHERE lock_type = 'regfox_sync'
    AND (expires_at < now() OR locked_by IN (
        SELECT id::text FROM regfox_sync_log 
        WHERE status = 'error' 
        AND error_message LIKE '%timed out%'
    ));
    
    RETURN stuck_count;
END;
$function$;

-- Update acquire_sync_lock to use 3-minute timeout
CREATE OR REPLACE FUNCTION public.acquire_sync_lock(p_sync_id uuid, p_timeout_minutes integer DEFAULT 3)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    lock_id uuid;
BEGIN
    -- Clean up any stuck syncs first
    PERFORM cleanup_stuck_syncs();
    
    -- Try to acquire lock
    INSERT INTO sync_locks (lock_type, locked_by, expires_at, metadata)
    VALUES (
        'regfox_sync',
        p_sync_id::text,
        now() + (p_timeout_minutes || ' minutes')::interval,
        jsonb_build_object('sync_id', p_sync_id, 'started_at', now())
    )
    RETURNING id INTO lock_id;
    
    RETURN lock_id;
EXCEPTION
    WHEN OTHERS THEN
        RETURN NULL;
END;
$function$;