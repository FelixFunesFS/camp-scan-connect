-- Add missing fields to attendees table for RegFox integration
ALTER TABLE public.attendees ADD COLUMN IF NOT EXISTS waiver_signed BOOLEAN DEFAULT false;
ALTER TABLE public.attendees ADD COLUMN IF NOT EXISTS checked_in_at TIMESTAMP WITH TIME ZONE;

-- Create regfox_sync_log table to track sync operations
CREATE TABLE public.regfox_sync_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sync_type TEXT NOT NULL, -- 'initial_sync', 'webhook', 'manual_sync'
  status TEXT NOT NULL, -- 'success', 'error', 'in_progress'
  total_records INTEGER,
  new_records INTEGER,
  updated_records INTEGER,
  error_message TEXT,
  sync_started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  sync_completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on regfox_sync_log
ALTER TABLE public.regfox_sync_log ENABLE ROW LEVEL SECURITY;

-- Create policies for regfox_sync_log (admin only access)
CREATE POLICY "Allow authenticated users to read sync logs" 
ON public.regfox_sync_log 
FOR SELECT 
USING (true);

CREATE POLICY "Allow authenticated users to insert sync logs" 
ON public.regfox_sync_log 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update sync logs" 
ON public.regfox_sync_log 
FOR UPDATE 
USING (true);

-- Add trigger for automatic timestamp updates on regfox_sync_log
CREATE TRIGGER update_regfox_sync_log_updated_at
BEFORE UPDATE ON public.regfox_sync_log
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for better performance on regfox_id lookups
CREATE INDEX IF NOT EXISTS idx_attendees_regfox_id ON public.attendees(regfox_id);

-- Create index for sync log queries
CREATE INDEX IF NOT EXISTS idx_regfox_sync_log_created_at ON public.regfox_sync_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_regfox_sync_log_status ON public.regfox_sync_log(status);