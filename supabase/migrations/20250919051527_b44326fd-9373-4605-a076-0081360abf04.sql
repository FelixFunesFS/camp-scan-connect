-- Fix critical security vulnerability: restrict attendees table access to authenticated staff only

-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Allow public read access to attendees" ON public.attendees;
DROP POLICY IF EXISTS "Allow public updates to attendees" ON public.attendees;

-- Create secure policies that only allow authenticated staff access
CREATE POLICY "Allow authenticated staff to read attendees" 
ON public.attendees 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL AND 
  EXISTS (
    SELECT 1 FROM public.staff 
    WHERE staff.user_id = auth.uid()
  )
);

CREATE POLICY "Allow authenticated staff to update attendees" 
ON public.attendees 
FOR UPDATE 
USING (
  auth.uid() IS NOT NULL AND 
  EXISTS (
    SELECT 1 FROM public.staff 
    WHERE staff.user_id = auth.uid()
  )
);

-- Keep the sync functions policy for RegFox integration
-- This policy already exists and allows sync functions to insert attendees

-- Also secure the rfid_tags table which references attendees
DROP POLICY IF EXISTS "Allow public read access to rfid_tags" ON public.rfid_tags;
DROP POLICY IF EXISTS "Allow public updates to rfid_tags" ON public.rfid_tags;
DROP POLICY IF EXISTS "Allow public insert to rfid_tags" ON public.rfid_tags;

CREATE POLICY "Allow authenticated staff to read rfid_tags" 
ON public.rfid_tags 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL AND 
  EXISTS (
    SELECT 1 FROM public.staff 
    WHERE staff.user_id = auth.uid()
  )
);

CREATE POLICY "Allow authenticated staff to update rfid_tags" 
ON public.rfid_tags 
FOR UPDATE 
USING (
  auth.uid() IS NOT NULL AND 
  EXISTS (
    SELECT 1 FROM public.staff 
    WHERE staff.user_id = auth.uid()
  )
);

CREATE POLICY "Allow authenticated staff to insert rfid_tags" 
ON public.rfid_tags 
FOR INSERT 
WITH CHECK (
  auth.uid() IS NOT NULL AND 
  EXISTS (
    SELECT 1 FROM public.staff 
    WHERE staff.user_id = auth.uid()
  )
);

-- Secure station_transactions table
DROP POLICY IF EXISTS "Allow public read access to station_transactions" ON public.station_transactions;
DROP POLICY IF EXISTS "Allow public update to station_transactions" ON public.station_transactions;
DROP POLICY IF EXISTS "Allow public insert to station_transactions" ON public.station_transactions;

CREATE POLICY "Allow authenticated staff to read station_transactions" 
ON public.station_transactions 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL AND 
  EXISTS (
    SELECT 1 FROM public.staff 
    WHERE staff.user_id = auth.uid()
  )
);

CREATE POLICY "Allow authenticated staff to update station_transactions" 
ON public.station_transactions 
FOR UPDATE 
USING (
  auth.uid() IS NOT NULL AND 
  EXISTS (
    SELECT 1 FROM public.staff 
    WHERE staff.user_id = auth.uid()
  )
);

CREATE POLICY "Allow authenticated staff to insert station_transactions" 
ON public.station_transactions 
FOR INSERT 
WITH CHECK (
  auth.uid() IS NOT NULL AND 
  EXISTS (
    SELECT 1 FROM public.staff 
    WHERE staff.user_id = auth.uid()
  )
);

-- Secure scans table  
DROP POLICY IF EXISTS "Allow public read access to scans" ON public.scans;
DROP POLICY IF EXISTS "Allow public insert to scans" ON public.scans;

CREATE POLICY "Allow authenticated staff to read scans" 
ON public.scans 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL AND 
  EXISTS (
    SELECT 1 FROM public.staff 
    WHERE staff.user_id = auth.uid()
  )
);

CREATE POLICY "Allow authenticated staff to insert scans" 
ON public.scans 
FOR INSERT 
WITH CHECK (
  auth.uid() IS NOT NULL AND 
  EXISTS (
    SELECT 1 FROM public.staff 
    WHERE staff.user_id = auth.uid()
  )
);

-- Secure staff_assistance_requests table
DROP POLICY IF EXISTS "Allow public read access to staff assistance requests" ON public.staff_assistance_requests;
DROP POLICY IF EXISTS "Allow public updates to staff assistance requests" ON public.staff_assistance_requests;
DROP POLICY IF EXISTS "Allow public insert to staff assistance requests" ON public.staff_assistance_requests;

-- Allow anyone to submit requests but only staff to read/update them
CREATE POLICY "Allow anyone to insert staff assistance requests" 
ON public.staff_assistance_requests 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Allow authenticated staff to read staff assistance requests" 
ON public.staff_assistance_requests 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL AND 
  EXISTS (
    SELECT 1 FROM public.staff 
    WHERE staff.user_id = auth.uid()
  )
);

CREATE POLICY "Allow authenticated staff to update staff assistance requests" 
ON public.staff_assistance_requests 
FOR UPDATE 
USING (
  auth.uid() IS NOT NULL AND 
  EXISTS (
    SELECT 1 FROM public.staff 
    WHERE staff.user_id = auth.uid()
  )
);