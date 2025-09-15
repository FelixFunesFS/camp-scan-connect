-- Add order_id column to attendees table
ALTER TABLE public.attendees 
ADD COLUMN order_id text;