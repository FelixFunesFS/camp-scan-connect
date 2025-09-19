-- Create initial staff records for code-based authentication
-- Staff record for general staff access
INSERT INTO public.staff (user_id, role, display_name) 
VALUES (
    'staff-001'::uuid,  -- Simple UUID for staff code
    'ranger'::staff_role,
    'Staff Member'
);

-- Staff record for admin access  
INSERT INTO public.staff (user_id, role, display_name)
VALUES (
    'admin-001'::uuid,  -- Simple UUID for admin code
    'admin'::staff_role, 
    'Administrator'
);

-- Create a simple function to authenticate staff by code
CREATE OR REPLACE FUNCTION public.authenticate_staff_code(p_code text)
RETURNS TABLE(staff_id uuid, staff_role staff_role, display_name text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Check staff code (mc2025)
    IF p_code = 'mc2025' THEN
        RETURN QUERY
        SELECT s.user_id, s.role, s.display_name
        FROM public.staff s
        WHERE s.user_id = 'staff-001'::uuid;
    -- Check admin code (admin2025)  
    ELSIF p_code = 'admin2025' THEN
        RETURN QUERY
        SELECT s.user_id, s.role, s.display_name
        FROM public.staff s
        WHERE s.user_id = 'admin-001'::uuid;
    ELSE
        -- Return empty result for invalid codes
        RETURN;
    END IF;
END;
$$;