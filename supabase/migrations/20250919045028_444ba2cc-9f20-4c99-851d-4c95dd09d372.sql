-- Create staff assistance requests table for staff notifications
CREATE TABLE public.staff_assistance_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  phone_number TEXT,
  attendee_name TEXT,
  email TEXT,
  issue_type TEXT NOT NULL CHECK (issue_type IN ('not_found', 'unassigned', 'activation_failed', 'system_error')),
  error_message TEXT,
  contact_info JSONB DEFAULT '{}',
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  assigned_staff_id UUID,
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolution_notes TEXT
);

-- Enable Row Level Security
ALTER TABLE public.staff_assistance_requests ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (since this is a self-service system)
CREATE POLICY "Allow public insert to staff assistance requests" 
ON public.staff_assistance_requests 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Allow public read access to staff assistance requests" 
ON public.staff_assistance_requests 
FOR SELECT 
USING (true);

CREATE POLICY "Allow public updates to staff assistance requests" 
ON public.staff_assistance_requests 
FOR UPDATE 
USING (true);

-- Create index for efficient queries
CREATE INDEX idx_staff_assistance_requests_status ON public.staff_assistance_requests(status);
CREATE INDEX idx_staff_assistance_requests_created_at ON public.staff_assistance_requests(created_at DESC);
CREATE INDEX idx_staff_assistance_requests_priority ON public.staff_assistance_requests(priority);

-- Create function to update timestamps
CREATE TRIGGER update_staff_assistance_requests_updated_at
BEFORE UPDATE ON public.staff_assistance_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();