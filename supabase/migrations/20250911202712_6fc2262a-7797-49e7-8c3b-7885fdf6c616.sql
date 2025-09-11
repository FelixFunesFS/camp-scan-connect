-- Ensure public access policies exist for non-admin operations
-- Use OR REPLACE to handle existing policies

-- Public access to scans table (most important for ranger functionality)
CREATE OR REPLACE FUNCTION allow_public_scans() RETURNS void AS $$
BEGIN
    -- Drop existing restrictive policies if they exist
    DROP POLICY IF EXISTS "Staff can insert scans" ON public.scans;
    DROP POLICY IF EXISTS "Staff can view scans" ON public.scans;
    
    -- Create new public policies
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
END;
$$ LANGUAGE plpgsql;

SELECT allow_public_scans();
DROP FUNCTION allow_public_scans();