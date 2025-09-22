-- Fix critical security vulnerability in attendees table RLS policies
-- The current policies allow public access to sensitive personal data

-- Drop the insecure policies that use "true" expressions
DROP POLICY IF EXISTS "Allow staff to read attendees" ON public.attendees;
DROP POLICY IF EXISTS "Allow staff to update attendees" ON public.attendees;

-- Create secure policies that actually verify staff authentication
CREATE POLICY "Allow authenticated staff to read attendees" 
ON public.attendees 
FOR SELECT 
TO authenticated
USING (
    auth.uid() IS NOT NULL 
    AND EXISTS (
        SELECT 1 FROM public.staff 
        WHERE staff.user_id = auth.uid()
    )
);

CREATE POLICY "Allow authenticated staff to update attendees" 
ON public.attendees 
FOR UPDATE 
TO authenticated
USING (
    auth.uid() IS NOT NULL 
    AND EXISTS (
        SELECT 1 FROM public.staff 
        WHERE staff.user_id = auth.uid()
    )
)
WITH CHECK (
    auth.uid() IS NOT NULL 
    AND EXISTS (
        SELECT 1 FROM public.staff 
        WHERE staff.user_id = auth.uid()
    )
);

-- Keep the insert policy for sync functions (this one is properly scoped)
-- The "Allow sync functions to insert attendees" policy remains unchanged as it's for system operations