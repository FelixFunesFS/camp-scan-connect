-- Add meal_plan column to attendees table
ALTER TABLE public.attendees 
ADD COLUMN meal_plan TEXT;