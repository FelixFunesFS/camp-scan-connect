
-- Add missing columns to attendees table that the code expects
ALTER TABLE public.attendees 
ADD COLUMN IF NOT EXISTS arrival_window TEXT,
ADD COLUMN IF NOT EXISTS is_veteran BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS state TEXT,
ADD COLUMN IF NOT EXISTS special_accommodations TEXT;

-- Add missing columns to regfox_sync_log that the code expects
ALTER TABLE public.regfox_sync_log 
ADD COLUMN IF NOT EXISTS heartbeat_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS sync_timeout_minutes INTEGER DEFAULT 30,
ADD COLUMN IF NOT EXISTS progress_info JSONB DEFAULT '{}'::jsonb;

-- Add 'abandoned' to registration_status enum if not exists
-- Note: PostgreSQL doesn't support ALTER TYPE ADD VALUE in transactions easily
-- We'll handle this by checking if it works
DO $$ 
BEGIN
    ALTER TYPE public.registration_status ADD VALUE IF NOT EXISTS 'abandoned';
EXCEPTION WHEN duplicate_object THEN 
    NULL;
END $$;
