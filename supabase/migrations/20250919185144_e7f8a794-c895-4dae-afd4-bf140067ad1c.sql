-- Create initial staff records for code-based authentication
-- Staff record for general staff access
INSERT INTO public.staff (user_id, role, display_name) 
VALUES (
    'aaaaaaaa-bbbb-cccc-dddd-111111111111'::uuid,  -- Fixed UUID for staff code
    'ranger'::staff_role,
    'Staff Member'
);

-- Staff record for admin access  
INSERT INTO public.staff (user_id, role, display_name)
VALUES (
    'aaaaaaaa-bbbb-cccc-dddd-222222222222'::uuid,  -- Fixed UUID for admin code
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
        WHERE s.user_id = 'aaaaaaaa-bbbb-cccc-dddd-111111111111'::uuid;
    -- Check admin code (admin2025)  
    ELSIF p_code = 'admin2025' THEN
        RETURN QUERY
        SELECT s.user_id, s.role, s.display_name
        FROM public.staff s
        WHERE s.user_id = 'aaaaaaaa-bbbb-cccc-dddd-222222222222'::uuid;
    ELSE
        -- Return empty result for invalid codes
        RETURN;
    END IF;
END;
$$;