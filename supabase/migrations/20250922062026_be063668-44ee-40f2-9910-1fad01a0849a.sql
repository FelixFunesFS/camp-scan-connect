-- Fix critical security vulnerability in staff_assistance_requests table RLS policies
-- Remove duplicate policies that allow public access to customer support data

-- Drop the insecure policies that use "true" expressions (public access)
DROP POLICY IF EXISTS "Allow staff to read staff_assistance_requests" ON public.staff_assistance_requests;
DROP POLICY IF EXISTS "Allow staff to update staff_assistance_requests" ON public.staff_assistance_requests;

-- The secure policies already exist and will remain:
-- "Allow authenticated staff to read staff assistance requests" - properly authenticated
-- "Allow authenticated staff to update staff assistance requests" - properly authenticated
-- "Allow anyone to insert staff assistance requests" - this is appropriate for public support requests

-- Verify the remaining policies are secure:
-- SELECT: Only authenticated staff can read (auth.uid() IS NOT NULL AND staff verification)
-- UPDATE: Only authenticated staff can update (auth.uid() IS NOT NULL AND staff verification)
-- INSERT: Public can create support requests (appropriate for customer support)