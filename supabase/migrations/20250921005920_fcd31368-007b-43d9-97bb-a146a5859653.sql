-- Create admin_tasks table for task management
CREATE TABLE public.admin_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  task_type TEXT NOT NULL CHECK (task_type IN ('feature_request', 'bug_fix', 'improvement', 'maintenance')),
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'testing', 'completed', 'cancelled')),
  category TEXT,
  assigned_to UUID,
  created_by UUID,
  estimated_hours INTEGER,
  actual_hours INTEGER,
  due_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  tags JSONB DEFAULT '[]'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Enable Row Level Security
ALTER TABLE public.admin_tasks ENABLE ROW LEVEL SECURITY;

-- Create policies for admin task access
CREATE POLICY "Allow staff to view admin tasks" 
ON public.admin_tasks 
FOR SELECT 
USING (true);

CREATE POLICY "Allow staff to insert admin tasks" 
ON public.admin_tasks 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Allow staff to update admin tasks" 
ON public.admin_tasks 
FOR UPDATE 
USING (true);

CREATE POLICY "Allow staff to delete admin tasks" 
ON public.admin_tasks 
FOR DELETE 
USING (true);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_admin_tasks_updated_at
BEFORE UPDATE ON public.admin_tasks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_admin_tasks_status ON public.admin_tasks(status);
CREATE INDEX idx_admin_tasks_priority ON public.admin_tasks(priority);
CREATE INDEX idx_admin_tasks_assigned_to ON public.admin_tasks(assigned_to);
CREATE INDEX idx_admin_tasks_created_at ON public.admin_tasks(created_at);
CREATE INDEX idx_admin_tasks_due_date ON public.admin_tasks(due_date);