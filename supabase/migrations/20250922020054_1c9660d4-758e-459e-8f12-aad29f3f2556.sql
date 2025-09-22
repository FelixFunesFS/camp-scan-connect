-- Add 'paused' as a valid status for admin_tasks
-- Since the table doesn't have strict constraints, we can simply update the default and add a check constraint
ALTER TABLE admin_tasks ADD CONSTRAINT admin_tasks_status_check 
CHECK (status IN ('open', 'in_progress', 'paused', 'testing', 'completed', 'cancelled'));