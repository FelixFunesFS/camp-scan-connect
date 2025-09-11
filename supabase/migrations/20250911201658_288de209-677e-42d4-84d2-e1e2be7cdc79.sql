-- Create enum types for MVP
CREATE TYPE public.ticket_type AS ENUM ('premium_power', 'dry_site', 'day_pass', 'staff', 'vendor');
CREATE TYPE public.tag_status AS ENUM ('unissued', 'active', 'lost', 'replaced', 'deactivated');
CREATE TYPE public.staff_role AS ENUM ('admin', 'checkin', 'ranger', 'vendor');
CREATE TYPE public.scan_action AS ENUM ('entry', 'exit', 'verify');
CREATE TYPE public.scan_result AS ENUM ('allow', 'deny');

-- Core attendees table (simplified)
CREATE TABLE public.attendees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    regfox_id TEXT,
    ticket_type public.ticket_type NOT NULL DEFAULT 'dry_site',
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RFID tags table
CREATE TABLE public.rfid_tags (
    uid TEXT PRIMARY KEY,
    attendee_id UUID REFERENCES public.attendees(id) ON DELETE SET NULL,
    status public.tag_status NOT NULL DEFAULT 'unissued',
    issued_at TIMESTAMPTZ,
    deactivated_at TIMESTAMPTZ,
    reason TEXT
);

-- Scans table for all RFID activity
CREATE TABLE public.scans (
    id BIGSERIAL PRIMARY KEY,
    rfid_uid TEXT REFERENCES public.rfid_tags(uid),
    location TEXT NOT NULL,
    action public.scan_action NOT NULL DEFAULT 'verify',
    device_id TEXT,
    scanned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    result public.scan_result NOT NULL,
    reason TEXT,
    staff_id UUID REFERENCES auth.users(id),
    extra JSONB
);

-- Staff roles table
CREATE TABLE public.staff (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role public.staff_role NOT NULL DEFAULT 'ranger',
    display_name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.attendees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rfid_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;

-- Create update trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add update triggers
CREATE TRIGGER update_attendees_updated_at
    BEFORE UPDATE ON public.attendees
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- RLS Policies

-- Staff table policies (users can only see their own record initially)
CREATE POLICY "Users can view their own staff record" ON public.staff
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own staff record" ON public.staff
    FOR UPDATE USING (auth.uid() = user_id);

-- Attendees policies (staff can read based on role)
CREATE POLICY "Staff can view attendees" ON public.attendees
    FOR SELECT TO authenticated USING (
        EXISTS (SELECT 1 FROM public.staff WHERE user_id = auth.uid())
    );

CREATE POLICY "Check-in and admin staff can modify attendees" ON public.attendees
    FOR ALL TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.staff 
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'checkin')
        )
    );

-- RFID tags policies
CREATE POLICY "Staff can view RFID tags" ON public.rfid_tags
    FOR SELECT TO authenticated USING (
        EXISTS (SELECT 1 FROM public.staff WHERE user_id = auth.uid())
    );

CREATE POLICY "Check-in and admin staff can modify RFID tags" ON public.rfid_tags
    FOR ALL TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.staff 
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'checkin')
        )
    );

-- Scans policies (all staff can insert scans)
CREATE POLICY "Staff can view scans" ON public.scans
    FOR SELECT TO authenticated USING (
        EXISTS (SELECT 1 FROM public.staff WHERE user_id = auth.uid())
    );

CREATE POLICY "Staff can insert scans" ON public.scans
    FOR INSERT TO authenticated WITH CHECK (
        EXISTS (SELECT 1 FROM public.staff WHERE user_id = auth.uid())
        AND staff_id = auth.uid()
    );

-- Insert some sample data for testing
INSERT INTO public.attendees (first_name, last_name, email, phone, regfox_id, ticket_type) VALUES
('John', 'Doe', 'john@example.com', '555-0001', 'RF001', 'premium_power'),
('Jane', 'Smith', 'jane@example.com', '555-0002', 'RF002', 'dry_site'),
('Mike', 'Johnson', 'mike@example.com', '555-0003', 'RF003', 'day_pass');

-- Create indexes for performance
CREATE INDEX idx_attendees_phone ON public.attendees(phone);
CREATE INDEX idx_attendees_regfox_id ON public.attendees(regfox_id);
CREATE INDEX idx_scans_rfid_uid ON public.scans(rfid_uid);
CREATE INDEX idx_scans_scanned_at ON public.scans(scanned_at);
CREATE INDEX idx_scans_location ON public.scans(location);