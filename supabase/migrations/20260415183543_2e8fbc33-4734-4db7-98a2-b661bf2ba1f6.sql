
-- Add missing transaction_type enum values
ALTER TYPE public.transaction_type ADD VALUE IF NOT EXISTS 'golf_cart_checkout';
ALTER TYPE public.transaction_type ADD VALUE IF NOT EXISTS 'golf_cart_checkin';
ALTER TYPE public.transaction_type ADD VALUE IF NOT EXISTS 'walkie_talkie_checkout';
ALTER TYPE public.transaction_type ADD VALUE IF NOT EXISTS 'walkie_talkie_checkin';
ALTER TYPE public.transaction_type ADD VALUE IF NOT EXISTS 'fanny_pack_checkout';
ALTER TYPE public.transaction_type ADD VALUE IF NOT EXISTS 'fanny_pack_checkin';
ALTER TYPE public.transaction_type ADD VALUE IF NOT EXISTS 'meal_sat_breakfast';
ALTER TYPE public.transaction_type ADD VALUE IF NOT EXISTS 'meal_sun_breakfast';
ALTER TYPE public.transaction_type ADD VALUE IF NOT EXISTS 'meal_fri_lunch';
ALTER TYPE public.transaction_type ADD VALUE IF NOT EXISTS 'meal_sat_lunch';
ALTER TYPE public.transaction_type ADD VALUE IF NOT EXISTS 'meal_fri_dinner';
ALTER TYPE public.transaction_type ADD VALUE IF NOT EXISTS 'meal_sat_dinner';
ALTER TYPE public.transaction_type ADD VALUE IF NOT EXISTS 'gate_entry';
ALTER TYPE public.transaction_type ADD VALUE IF NOT EXISTS 'gate_exit';

-- Add activation_method column to station_transactions
ALTER TABLE public.station_transactions 
ADD COLUMN IF NOT EXISTS activation_method TEXT;
