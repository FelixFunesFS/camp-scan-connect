ALTER TABLE public.attendees ADD COLUMN IF NOT EXISTS locked_fields text[] NOT NULL DEFAULT '{}';
ALTER TABLE public.attendees ADD COLUMN IF NOT EXISTS override_log jsonb;
UPDATE public.attendees SET locked_fields = ARRAY['meal_plan'] WHERE id IN ('c1ff91dc-7cc2-46a0-92a2-ed3532f2b737','f91e0116-ef6b-447f-bab7-54dff8b157c9');