-- Fix security warning: Move extensions from public schema to dedicated schemas
-- Drop the cron job first
SELECT cron.unschedule('regfox-auto-sync');

-- Drop extensions from public schema
DROP EXTENSION IF EXISTS pg_cron;
DROP EXTENSION IF EXISTS pg_net;

-- Create dedicated schemas for extensions
CREATE SCHEMA IF NOT EXISTS extensions;

-- Install extensions in dedicated schema
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Recreate the cron job using the full schema-qualified function name
SELECT extensions.cron.schedule(
    'regfox-auto-sync',
    '*/30 * * * *',
    $$
    SELECT
        extensions.net.http_post(
            url := 'https://oglargpkunjeblfutekl.supabase.co/functions/v1/regfox-scheduled-sync',
            headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9nbGFyZ3BrdW5qZWJsZnV0ZWtsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcyODI1NjYsImV4cCI6MjA3Mjg1ODU2Nn0.kjzDMk4kl4-ZS39GJkQc_HANIujftUoUovHL_dNiQik"}'::jsonb,
            body := '{"scheduled": true}'::jsonb
        ) as request_id;
    $$
);