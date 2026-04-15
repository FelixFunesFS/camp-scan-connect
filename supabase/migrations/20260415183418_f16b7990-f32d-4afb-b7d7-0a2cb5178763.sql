
-- Create all necessary types and tables to match the existing schema

-- Enums (using DO blocks for existence check)
DO $$ BEGIN
    CREATE TYPE public.ticket_type AS ENUM ('premium_power', 'dry_site', 'day_pass', 'staff', 'vendor', 'glamping', 'cabin', 'rv_site');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE public.tag_status AS ENUM ('unissued', 'assigned', 'active', 'lost', 'replaced', 'deactivated');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE public.staff_role AS ENUM ('admin', 'checkin', 'ranger', 'vendor');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE public.scan_action AS ENUM ('entry', 'exit', 'verify');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE public.scan_result AS ENUM ('allow', 'deny');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE public.station_type AS ENUM ('main_gate', 'check_in', 'meal', 'drinks', 'headphones', 't_shirts', 'fanny_packs', 'walkie_talkies', 'golf_carts', 'rfid_assignment');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE public.transaction_type AS ENUM ('activate', 'deactivate', 'meal_breakfast', 'meal_lunch', 'meal_dinner', 'drink', 'headphone_checkout', 'headphone_checkin');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE public.registration_status AS ENUM ('registered', 'pending', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE public.site_location AS ENUM ('dry_site', 'glamping', 'cabin', 'rv_site');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE public.meal_plan AS ENUM ('standard', 'premium', 'none');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Core attendees table
CREATE TABLE IF NOT EXISTS public.attendees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    regfox_id TEXT,
    order_id TEXT,
    ticket_type public.ticket_type NOT NULL DEFAULT 'dry_site',
    site_location_assignment public.site_location,
    meal_plan public.meal_plan DEFAULT 'none',
    arrival_day TEXT DEFAULT 'Friday',
    waiver_signed BOOLEAN DEFAULT false,
    checked_in_at TIMESTAMP WITH TIME ZONE,
    activated_at TIMESTAMP WITH TIME ZONE,
    deactivated_at TIMESTAMP WITH TIME ZONE,
    most_recent_activation_method TEXT,
    most_recent_activation_at TIMESTAMP WITH TIME ZONE,
    registration_status public.registration_status DEFAULT 'registered',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- RFID tags table
CREATE TABLE IF NOT EXISTS public.rfid_tags (
    uid TEXT PRIMARY KEY,
    attendee_id UUID REFERENCES public.attendees(id) ON DELETE SET NULL,
    status public.tag_status NOT NULL DEFAULT 'unissued',
    issued_at TIMESTAMP WITH TIME ZONE,
    deactivated_at TIMESTAMP WITH TIME ZONE,
    reason TEXT
);

-- Scans table
CREATE TABLE IF NOT EXISTS public.scans (
    id BIGSERIAL PRIMARY KEY,
    rfid_uid TEXT REFERENCES public.rfid_tags(uid),
    location TEXT NOT NULL,
    action public.scan_action NOT NULL DEFAULT 'verify',
    device_id TEXT,
    scanned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    result public.scan_result NOT NULL,
    reason TEXT,
    staff_id UUID,
    extra JSONB DEFAULT '{}'::jsonb
);

-- Staff table
CREATE TABLE IF NOT EXISTS public.staff (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role public.staff_role NOT NULL DEFAULT 'ranger',
    display_name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Station transactions table
CREATE TABLE IF NOT EXISTS public.station_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attendee_id UUID NOT NULL REFERENCES public.attendees(id) ON DELETE CASCADE,
    station_type public.station_type NOT NULL,
    transaction_type public.transaction_type NOT NULL,
    rfid_uid TEXT,
    staff_id UUID,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    extra_data JSONB DEFAULT '{}'::jsonb,
    daily_count INTEGER DEFAULT 0,
    current_status TEXT DEFAULT 'inactive'
);

-- RegFox sync log table
CREATE TABLE IF NOT EXISTS public.regfox_sync_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sync_type TEXT NOT NULL,
    status TEXT NOT NULL,
    total_records INTEGER,
    new_records INTEGER,
    updated_records INTEGER,
    error_message TEXT,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    sync_started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    sync_completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Staff assistance requests table
CREATE TABLE IF NOT EXISTS public.staff_assistance_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone_number TEXT,
    attendee_name TEXT,
    email TEXT,
    issue_type TEXT NOT NULL CHECK (issue_type IN ('not_found', 'unassigned', 'activation_failed', 'system_error')),
    error_message TEXT,
    contact_info JSONB DEFAULT '{}'::jsonb,
    priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    assigned_staff_id UUID,
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolution_notes TEXT
);

-- Enable RLS
ALTER TABLE IF EXISTS public.attendees ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.rfid_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.station_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.regfox_sync_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.staff_assistance_requests ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Allow public access to attendees" ON public.attendees;
DROP POLICY IF EXISTS "Allow public access to rfid_tags" ON public.rfid_tags;
DROP POLICY IF EXISTS "Allow public access to scans" ON public.scans;
DROP POLICY IF EXISTS "Allow public access to staff" ON public.staff;
DROP POLICY IF EXISTS "Allow public access to station_transactions" ON public.station_transactions;
DROP POLICY IF EXISTS "Allow public access to regfox_sync_log" ON public.regfox_sync_log;
DROP POLICY IF EXISTS "Allow public access to staff_assistance_requests" ON public.staff_assistance_requests;

-- Create permissive policies for development
CREATE POLICY "Allow public access to attendees" ON public.attendees FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access to rfid_tags" ON public.rfid_tags FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access to scans" ON public.scans FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access to staff" ON public.staff FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access to station_transactions" ON public.station_transactions FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access to regfox_sync_log" ON public.regfox_sync_log FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access to staff_assistance_requests" ON public.staff_assistance_requests FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Create update trigger function if not exists
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add update triggers
DROP TRIGGER IF EXISTS update_attendees_updated_at ON public.attendees;
CREATE TRIGGER update_attendees_updated_at BEFORE UPDATE ON public.attendees FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_regfox_sync_log_updated_at ON public.regfox_sync_log;
CREATE TRIGGER update_regfox_sync_log_updated_at BEFORE UPDATE ON public.regfox_sync_log FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_staff_assistance_requests_updated_at ON public.staff_assistance_requests;
CREATE TRIGGER update_staff_assistance_requests_updated_at BEFORE UPDATE ON public.staff_assistance_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_attendees_phone ON public.attendees(phone);
CREATE INDEX IF NOT EXISTS idx_attendees_regfox_id ON public.attendees(regfox_id);
CREATE INDEX IF NOT EXISTS idx_attendees_order_id ON public.attendees(order_id);
CREATE INDEX IF NOT EXISTS idx_rfid_tags_attendee_id ON public.rfid_tags(attendee_id);
CREATE INDEX IF NOT EXISTS idx_rfid_tags_status ON public.rfid_tags(status);
CREATE INDEX IF NOT EXISTS idx_scans_rfid_uid ON public.scans(rfid_uid);
CREATE INDEX IF NOT EXISTS idx_scans_scanned_at ON public.scans(scanned_at);
CREATE INDEX IF NOT EXISTS idx_scans_location ON public.scans(location);
CREATE INDEX IF NOT EXISTS idx_station_transactions_attendee_id ON public.station_transactions(attendee_id);
CREATE INDEX IF NOT EXISTS idx_station_transactions_station_type ON public.station_transactions(station_type);
CREATE INDEX IF NOT EXISTS idx_regfox_sync_log_created_at ON public.regfox_sync_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_regfox_sync_log_status ON public.regfox_sync_log(status);
CREATE INDEX IF NOT EXISTS idx_staff_assistance_requests_status ON public.staff_assistance_requests(status);
CREATE INDEX IF NOT EXISTS idx_staff_assistance_requests_created_at ON public.staff_assistance_requests(created_at DESC);
