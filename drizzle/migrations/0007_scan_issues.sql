CREATE TABLE public.scan_issues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid DEFAULT public.current_event_id(),
  scanned_code text,
  station_type text NOT NULL,
  issue_type text NOT NULL,
  attendee_id uuid REFERENCES public.attendees(id) ON DELETE SET NULL,
  attendee_label text,
  notes text,
  error_message text,
  status text NOT NULL DEFAULT 'open',
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.scan_issues TO anon, authenticated;
GRANT ALL ON public.scan_issues TO service_role;
ALTER TABLE public.scan_issues ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Stations can log scan issues" ON public.scan_issues FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Stations can read scan issues" ON public.scan_issues FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Stations can resolve scan issues" ON public.scan_issues FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE INDEX scan_issues_created_idx ON public.scan_issues (created_at DESC);