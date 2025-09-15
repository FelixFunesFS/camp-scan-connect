-- Add new columns to regfox_sync_log for better sync management
ALTER TABLE public.regfox_sync_log 
ADD COLUMN cancelled_at timestamp with time zone,
ADD COLUMN heartbeat_at timestamp with time zone DEFAULT now(),
ADD COLUMN sync_timeout_minutes integer DEFAULT 20,
ADD COLUMN cancelled_by text,
ADD COLUMN progress_info jsonb DEFAULT '{}';

-- Create sync_locks table to prevent concurrent syncs
CREATE TABLE public.sync_locks (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    lock_type text NOT NULL,
    locked_at timestamp with time zone NOT NULL DEFAULT now(),
    locked_by text,
    expires_at timestamp with time zone NOT NULL,
    metadata jsonb DEFAULT '{}'
);

-- Enable RLS on sync_locks
ALTER TABLE public.sync_locks ENABLE ROW LEVEL SECURITY;

-- Create policies for sync_locks
CREATE POLICY "Allow authenticated users to read sync locks" 
ON public.sync_locks 
FOR SELECT 
USING (true);

CREATE POLICY "Allow authenticated users to insert sync locks" 
ON public.sync_locks 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete sync locks" 
ON public.sync_locks 
FOR DELETE 
USING (true);

-- Create function to clean up expired locks
CREATE OR REPLACE FUNCTION public.cleanup_expired_locks()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    DELETE FROM sync_locks 
    WHERE expires_at < now();
END;
$$;

-- Create function to check if sync can start
CREATE OR REPLACE FUNCTION public.can_start_sync()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    active_sync_count integer;
    active_lock_count integer;
BEGIN
    -- Clean up expired locks first
    PERFORM cleanup_expired_locks();
    
    -- Check for active syncs
    SELECT COUNT(*) INTO active_sync_count
    FROM regfox_sync_log
    WHERE status = 'in_progress' 
    AND (cancelled_at IS NULL)
    AND (sync_started_at > now() - interval '30 minutes');
    
    -- Check for active locks
    SELECT COUNT(*) INTO active_lock_count
    FROM sync_locks
    WHERE lock_type = 'regfox_sync'
    AND expires_at > now();
    
    RETURN (active_sync_count = 0 AND active_lock_count = 0);
END;
$$;

-- Create function to acquire sync lock
CREATE OR REPLACE FUNCTION public.acquire_sync_lock(p_sync_id uuid, p_timeout_minutes integer DEFAULT 20)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    lock_id uuid;
BEGIN
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
$$;

-- Create function to release sync lock
CREATE OR REPLACE FUNCTION public.release_sync_lock(p_sync_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    DELETE FROM sync_locks 
    WHERE lock_type = 'regfox_sync' 
    AND locked_by = p_sync_id::text;
    
    RETURN FOUND;
END;
$$;