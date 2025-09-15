-- Check if 'assigned' status already exists in the tag_status enum
-- If it doesn't exist, add it to distinguish between assigned and active status

DO $$
BEGIN
    -- Check if 'assigned' value exists in tag_status enum
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'assigned' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'tag_status')
    ) THEN
        -- Add 'assigned' status to the enum
        ALTER TYPE tag_status ADD VALUE 'assigned' AFTER 'unissued';
    END IF;
END $$;