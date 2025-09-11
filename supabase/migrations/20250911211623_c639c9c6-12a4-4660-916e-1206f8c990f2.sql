-- Add columns for early check-in override functionality
ALTER TABLE public.attendees 
ADD COLUMN IF NOT EXISTS arrival_window TEXT DEFAULT 'standard' CHECK (arrival_window IN ('early', 'standard'));

ALTER TABLE public.attendees 
ADD COLUMN IF NOT EXISTS early_access BOOLEAN DEFAULT false;

ALTER TABLE public.attendees 
ADD COLUMN IF NOT EXISTS override_early_checkin BOOLEAN DEFAULT false;

-- Create index for faster queries on arrival_window
CREATE INDEX IF NOT EXISTS idx_attendees_arrival_window ON public.attendees(arrival_window);

-- Create index for faster queries on override_early_checkin  
CREATE INDEX IF NOT EXISTS idx_attendees_override_early ON public.attendees(override_early_checkin);