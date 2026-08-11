CREATE TABLE public.waiver_signatures (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  attendee_id uuid NOT NULL REFERENCES public.attendees(id) ON DELETE CASCADE,
  event_id uuid REFERENCES public.events(id),
  typed_name text NOT NULL,
  agreement_version text NOT NULL DEFAULT 'MC2026-v1',
  signed_by_self boolean NOT NULL DEFAULT true,
  witnessed_by text,
  name_match boolean,
  user_agent text,
  signed_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (attendee_id, event_id)
);

GRANT SELECT, INSERT ON public.waiver_signatures TO anon;
GRANT SELECT, INSERT ON public.waiver_signatures TO authenticated;
GRANT ALL ON public.waiver_signatures TO service_role;

ALTER TABLE public.waiver_signatures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read waiver signatures"
  ON public.waiver_signatures FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Anyone can add waiver signatures"
  ON public.waiver_signatures FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE TRIGGER update_waiver_signatures_updated_at
  BEFORE UPDATE ON public.waiver_signatures
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.apply_waiver_signature()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.event_id IS NULL THEN
    SELECT event_id INTO NEW.event_id FROM public.attendees WHERE id = NEW.attendee_id;
  END IF;
  UPDATE public.attendees SET waiver_signed = true WHERE id = NEW.attendee_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER waiver_signature_marks_attendee
  BEFORE INSERT ON public.waiver_signatures
  FOR EACH ROW EXECUTE FUNCTION public.apply_waiver_signature();