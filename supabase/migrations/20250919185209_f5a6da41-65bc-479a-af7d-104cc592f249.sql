-- Drop the foreign key constraint on staff table that requires auth.users
ALTER TABLE public.staff DROP CONSTRAINT IF EXISTS staff_user_id_fkey;

-- Create initial staff records for code-based authentication  
INSERT INTO public.staff (user_id, role, display_name) 
VALUES (
    'aaaaaaaa-bbbb-cccc-dddd-111111111111'::uuid,
    'ranger'::staff_role,
    'Staff Member'
);

INSERT INTO public.staff (user_id, role, display_name)
VALUES (
    'aaaaaaaa-bbbb-cccc-dddd-222222222222'::uuid,
    'admin'::staff_role, 
    'Administrator'
);

-- Create function to authenticate staff by code
CREATE OR REPLACE FUNCTION public.authenticate_staff_code(p_code text)
RETURNS TABLE(staff_id uuid, staff_role staff_role, display_name text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF p_code = 'mc2025' THEN
        RETURN QUERY
        SELECT s.user_id, s.role, s.display_name
        FROM public.staff s
        WHERE s.user_id = 'aaaaaaaa-bbbb-cccc-dddd-111111111111'::uuid;
    ELSIF p_code = 'admin2025' THEN
        RETURN QUERY
        SELECT s.user_id, s.role, s.display_name
        FROM public.staff s
        WHERE s.user_id = 'aaaaaaaa-bbbb-cccc-dddd-222222222222'::uuid;
    END IF;
END;
$$;

-- Update RLS policies to work with code-based staff authentication
-- For attendees table
DROP POLICY IF EXISTS "Allow authenticated staff to read attendees" ON public.attendees;
CREATE POLICY "Allow staff to read attendees" 
ON public.attendees FOR SELECT 
USING (true);

DROP POLICY IF EXISTS "Allow authenticated staff to update attendees" ON public.attendees;
CREATE POLICY "Allow staff to update attendees" 
ON public.attendees FOR UPDATE 
USING (true);

-- For rfid_tags table  
DROP POLICY IF EXISTS "Allow authenticated staff to read rfid_tags" ON public.rfid_tags;
CREATE POLICY "Allow staff to read rfid_tags" 
ON public.rfid_tags FOR SELECT 
USING (true);

DROP POLICY IF EXISTS "Allow authenticated staff to update rfid_tags" ON public.rfid_tags;  
CREATE POLICY "Allow staff to update rfid_tags" 
ON public.rfid_tags FOR UPDATE 
USING (true);

DROP POLICY IF EXISTS "Allow authenticated staff to insert rfid_tags" ON public.rfid_tags;
CREATE POLICY "Allow staff to insert rfid_tags" 
ON public.rfid_tags FOR INSERT 
WITH CHECK (true);

-- For station_transactions table
DROP POLICY IF EXISTS "Allow authenticated staff to read station_transactions" ON public.station_transactions;
CREATE POLICY "Allow staff to read station_transactions" 
ON public.station_transactions FOR SELECT 
USING (true);

DROP POLICY IF EXISTS "Allow authenticated staff to update station_transactions" ON public.station_transactions;
CREATE POLICY "Allow staff to update station_transactions" 
ON public.station_transactions FOR UPDATE 
USING (true);

DROP POLICY IF EXISTS "Allow authenticated staff to insert station_transactions" ON public.station_transactions;
CREATE POLICY "Allow staff to insert station_transactions" 
ON public.station_transactions FOR INSERT 
WITH CHECK (true);

-- For staff_assistance_requests table
DROP POLICY IF EXISTS "Allow authenticated staff to read staff_assistance_requests" ON public.staff_assistance_requests;
CREATE POLICY "Allow staff to read staff_assistance_requests" 
ON public.staff_assistance_requests FOR SELECT 
USING (true);

DROP POLICY IF EXISTS "Allow authenticated staff to update staff_assistance_requests" ON public.staff_assistance_requests;
CREATE POLICY "Allow staff to update staff_assistance_requests" 
ON public.staff_assistance_requests FOR UPDATE 
USING (true);