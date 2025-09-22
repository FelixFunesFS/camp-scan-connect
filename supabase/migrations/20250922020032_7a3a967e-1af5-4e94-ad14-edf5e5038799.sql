-- Add 'paused' as a valid status for admin_tasks
-- First, let's check if there's an existing constraint
DO $$ 
BEGIN
    -- Add paused status to the existing check constraint if it exists
    -- or create a new one if none exists
    IF EXISTS (
        SELECT 1 FROM information_schema.check_constraints 
        WHERE constraint_name LIKE '%status%' 
        AND table_name = 'admin_tasks'
    ) THEN
        -- Drop existing constraint
        ALTER TABLE admin_tasks DROP CONSTRAINT IF EXISTS admin_tasks_status_check;
    END IF;
    
    -- Add the updated constraint with paused status
    ALTER TABLE admin_tasks ADD CONSTRAINT admin_tasks_status_check 
    CHECK (status IN ('open', 'in_progress', 'paused', 'testing', 'completed', 'cancelled'));
    
END $$;