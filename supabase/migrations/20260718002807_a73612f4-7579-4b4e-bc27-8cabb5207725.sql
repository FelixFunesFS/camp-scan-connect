
-- attendees: add missing columns
ALTER TABLE public.attendees
  ADD COLUMN IF NOT EXISTS date_of_birth date,
  ADD COLUMN IF NOT EXISTS gender text,
  ADD COLUMN IF NOT EXISTS marital_status text,
  ADD COLUMN IF NOT EXISTS street_address text,
  ADD COLUMN IF NOT EXISTS postal_code text,
  ADD COLUMN IF NOT EXISTS country text,
  ADD COLUMN IF NOT EXISTS emergency_contact_name text,
  ADD COLUMN IF NOT EXISTS emergency_contact_phone text,
  ADD COLUMN IF NOT EXISTS dietary_restrictions text,
  ADD COLUMN IF NOT EXISTS t_shirt_size text,
  ADD COLUMN IF NOT EXISTS custom_fields jsonb,
  ADD COLUMN IF NOT EXISTS additional_guests jsonb,
  ADD COLUMN IF NOT EXISTS status text,
  ADD COLUMN IF NOT EXISTS priority text,
  ADD COLUMN IF NOT EXISTS veteran_thanked_at timestamptz;

-- rfid_tags: add missing columns
ALTER TABLE public.rfid_tags
  ADD COLUMN IF NOT EXISTS activated_at timestamptz,
  ADD COLUMN IF NOT EXISTS activation_method text;

-- admin_tasks table
CREATE TABLE IF NOT EXISTS public.admin_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  task_type text NOT NULL,
  priority text DEFAULT 'normal',
  status text DEFAULT 'open',
  category text,
  assigned_to text,
  created_by text,
  estimated_hours numeric,
  actual_hours numeric,
  due_date timestamptz,
  completed_at timestamptz,
  tags text[],
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_tasks TO authenticated;
GRANT ALL ON public.admin_tasks TO service_role;

ALTER TABLE public.admin_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read admin tasks"
  ON public.admin_tasks FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert admin tasks"
  ON public.admin_tasks FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update admin tasks"
  ON public.admin_tasks FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated can delete admin tasks"
  ON public.admin_tasks FOR DELETE TO authenticated USING (true);

CREATE TRIGGER admin_tasks_updated_at
  BEFORE UPDATE ON public.admin_tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
