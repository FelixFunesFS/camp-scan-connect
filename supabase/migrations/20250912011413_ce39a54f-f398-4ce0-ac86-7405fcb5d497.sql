-- Add transaction_type enum if it doesn't exist (handle existing station_type)
DO $$ BEGIN
    CREATE TYPE public.transaction_type AS ENUM ('activate', 'deactivate', 'meal_breakfast', 'meal_lunch', 'meal_dinner', 'drink', 'headphone_checkout', 'headphone_checkin');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create station_transactions table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.station_transactions (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    attendee_id UUID NOT NULL,
    station_type station_type NOT NULL,
    transaction_type transaction_type NOT NULL,
    rfid_uid TEXT,
    staff_id UUID,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    extra_data JSONB DEFAULT '{}'::jsonb,
    daily_count INTEGER DEFAULT 0,
    current_status TEXT DEFAULT 'inactive'
);

-- Enable Row Level Security if table didn't exist before
DO $$ BEGIN
    ALTER TABLE public.station_transactions ENABLE ROW LEVEL SECURITY;
EXCEPTION
    WHEN others THEN null;
END $$;

-- Create policies if they don't exist
DO $$ BEGIN
    CREATE POLICY "Allow public read access to station_transactions" 
    ON public.station_transactions 
    FOR SELECT 
    USING (true);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE POLICY "Allow public insert to station_transactions" 
    ON public.station_transactions 
    FOR INSERT 
    WITH CHECK (true);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE POLICY "Allow public update to station_transactions" 
    ON public.station_transactions 
    FOR UPDATE 
    USING (true);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;