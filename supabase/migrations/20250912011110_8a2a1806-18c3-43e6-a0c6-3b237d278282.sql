-- Create enum for station types
CREATE TYPE public.station_type AS ENUM ('activation', 'meal', 'drinks', 'headphones');

-- Create enum for transaction types
CREATE TYPE public.transaction_type AS ENUM ('activate', 'deactivate', 'meal_breakfast', 'meal_lunch', 'meal_dinner', 'drink', 'headphone_checkout', 'headphone_checkin');

-- Create station_transactions table
CREATE TABLE public.station_transactions (
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

-- Enable Row Level Security
ALTER TABLE public.station_transactions ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow public read access to station_transactions" 
ON public.station_transactions 
FOR SELECT 
USING (true);

CREATE POLICY "Allow public insert to station_transactions" 
ON public.station_transactions 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Allow public update to station_transactions" 
ON public.station_transactions 
FOR UPDATE 
USING (true);

-- Add basic indexes for performance
CREATE INDEX idx_station_transactions_attendee_id ON public.station_transactions(attendee_id);
CREATE INDEX idx_station_transactions_station_type ON public.station_transactions(station_type);
CREATE INDEX idx_station_transactions_created_at ON public.station_transactions(created_at);

-- Create function to get daily transaction count
CREATE OR REPLACE FUNCTION public.get_daily_transaction_count(
    p_attendee_id UUID,
    p_station_type station_type,
    p_transaction_types transaction_type[]
)
RETURNS INTEGER AS $$
BEGIN
    RETURN (
        SELECT COUNT(*)
        FROM public.station_transactions
        WHERE attendee_id = p_attendee_id
        AND station_type = p_station_type
        AND transaction_type = ANY(p_transaction_types)
        AND DATE(created_at) = CURRENT_DATE
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;