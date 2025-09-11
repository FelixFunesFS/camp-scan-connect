-- Update RLS policies to allow public access for non-admin operations
-- First, drop existing restrictive policies and create new public ones

-- Drop existing policies for attendees
DROP POLICY IF EXISTS "Staff can view attendees" ON public.attendees;
DROP POLICY IF EXISTS "Check-in and admin staff can modify attendees" ON public.attendees;

-- Allow public read access to attendees for check-in operations
CREATE POLICY "Allow public read access to attendees" 
ON public.attendees 
FOR SELECT 
TO anon, authenticated
USING (true);

-- Drop existing policies for rfid_tags  
DROP POLICY IF EXISTS "Staff can view RFID tags" ON public.rfid_tags;
DROP POLICY IF EXISTS "Check-in and admin staff can modify RFID tags" ON public.rfid_tags;

-- Allow public access to rfid_tags for scanning operations
CREATE POLICY "Allow public read access to rfid_tags" 
ON public.rfid_tags 
FOR SELECT 
TO anon, authenticated
USING (true);

CREATE POLICY "Allow public updates to rfid_tags" 
ON public.rfid_tags 
FOR UPDATE 
TO anon, authenticated
USING (true);

-- Drop existing policies for scans
DROP POLICY IF EXISTS "Staff can view scans" ON public.scans;
DROP POLICY IF EXISTS "Staff can insert scans" ON public.scans;

-- Allow public access to scans for ranger operations
CREATE POLICY "Allow public insert to scans" 
ON public.scans 
FOR INSERT 
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Allow public read access to scans" 
ON public.scans 
FOR SELECT 
TO anon, authenticated
USING (true);