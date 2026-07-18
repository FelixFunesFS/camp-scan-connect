
CREATE TABLE public.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  year integer NOT NULL,
  starts_at date,
  ends_at date,
  is_active boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (name, year)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.events TO authenticated;
GRANT SELECT ON public.events TO anon;
GRANT ALL ON public.events TO service_role;

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Events readable by everyone"
  ON public.events FOR SELECT USING (true);

CREATE POLICY "Authenticated can manage events"
  ON public.events FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

CREATE TRIGGER events_updated_at
  BEFORE UPDATE ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.events (id, name, year, is_active) VALUES
  ('00000000-0000-0000-0000-000000002024', 'Melanated Campout 2024', 2024, false),
  ('00000000-0000-0000-0000-000000002025', 'Melanated Campout 2025', 2025, false),
  ('00000000-0000-0000-0000-000000002026', 'Melanated Campout Signature 2026', 2026, true);

ALTER TABLE public.attendees
  ADD COLUMN event_id uuid REFERENCES public.events(id)
  DEFAULT '00000000-0000-0000-0000-000000002026';
ALTER TABLE public.rfid_tags
  ADD COLUMN event_id uuid REFERENCES public.events(id)
  DEFAULT '00000000-0000-0000-0000-000000002026';
ALTER TABLE public.station_transactions
  ADD COLUMN event_id uuid REFERENCES public.events(id)
  DEFAULT '00000000-0000-0000-0000-000000002026';
ALTER TABLE public.scans
  ADD COLUMN event_id uuid REFERENCES public.events(id)
  DEFAULT '00000000-0000-0000-0000-000000002026';
ALTER TABLE public.staff_assistance_requests
  ADD COLUMN event_id uuid REFERENCES public.events(id)
  DEFAULT '00000000-0000-0000-0000-000000002026';

CREATE INDEX idx_attendees_event_id ON public.attendees(event_id);
CREATE INDEX idx_rfid_tags_event_id ON public.rfid_tags(event_id);
CREATE INDEX idx_station_transactions_event_id ON public.station_transactions(event_id);
CREATE INDEX idx_scans_event_id ON public.scans(event_id);
CREATE INDEX idx_staff_assistance_requests_event_id ON public.staff_assistance_requests(event_id);

CREATE OR REPLACE FUNCTION public.enforce_single_active_event()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.is_active THEN
    UPDATE public.events SET is_active = false WHERE id <> NEW.id AND is_active = true;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER events_single_active
  BEFORE INSERT OR UPDATE OF is_active ON public.events
  FOR EACH ROW WHEN (NEW.is_active = true)
  EXECUTE FUNCTION public.enforce_single_active_event();
