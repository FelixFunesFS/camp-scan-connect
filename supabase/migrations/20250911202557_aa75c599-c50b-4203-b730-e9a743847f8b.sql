-- Update RLS policies to allow public access for non-admin operations

-- Allow public access to attendees table for check-in operations
CREATE POLICY IF NOT EXISTS "Allow public access to attendees for check-in" 
ON public.attendees 
FOR SELECT 
TO anon, authenticated
USING (true);

-- Allow public access to rfid_tags table for scanning operations  
CREATE POLICY IF NOT EXISTS "Allow public access to rfid_tags for scanning" 
ON public.rfid_tags 
FOR SELECT 
TO anon, authenticated
USING (true);

CREATE POLICY IF NOT EXISTS "Allow public updates to rfid_tags for activation" 
ON public.rfid_tags 
FOR UPDATE 
TO anon, authenticated
USING (true);

-- Allow public access to scans table for ranger operations
CREATE POLICY IF NOT EXISTS "Allow public insert to scans" 
ON public.scans 
FOR INSERT 
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "Allow public select from scans" 
ON public.scans 
FOR SELECT 
TO anon, authenticated
USING (true);