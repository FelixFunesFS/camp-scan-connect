-- Add missing columns to attendees table for complete RegFox data capture
ALTER TABLE public.attendees ADD COLUMN IF NOT EXISTS street_address text;
ALTER TABLE public.attendees ADD COLUMN IF NOT EXISTS city text;
ALTER TABLE public.attendees ADD COLUMN IF NOT EXISTS state text;
ALTER TABLE public.attendees ADD COLUMN IF NOT EXISTS postal_code text;
ALTER TABLE public.attendees ADD COLUMN IF NOT EXISTS country text;
ALTER TABLE public.attendees ADD COLUMN IF NOT EXISTS date_of_birth date;
ALTER TABLE public.attendees ADD COLUMN IF NOT EXISTS gender text;
ALTER TABLE public.attendees ADD COLUMN IF NOT EXISTS marital_status text;
ALTER TABLE public.attendees ADD COLUMN IF NOT EXISTS t_shirt_size text;
ALTER TABLE public.attendees ADD COLUMN IF NOT EXISTS dietary_restrictions text;
ALTER TABLE public.attendees ADD COLUMN IF NOT EXISTS emergency_contact_name text;
ALTER TABLE public.attendees ADD COLUMN IF NOT EXISTS emergency_contact_phone text;
ALTER TABLE public.attendees ADD COLUMN IF NOT EXISTS special_accommodations text;
ALTER TABLE public.attendees ADD COLUMN IF NOT EXISTS how_did_you_hear text;
ALTER TABLE public.attendees ADD COLUMN IF NOT EXISTS additional_guests jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.attendees ADD COLUMN IF NOT EXISTS custom_fields jsonb DEFAULT '{}'::jsonb;