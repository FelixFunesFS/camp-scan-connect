-- Fix the cron job setup - the extensions are already enabled
-- The warning about extensions in public schema is common and not critical for pg_cron/pg_net
-- Let's just ensure our cron job is properly set up

-- First, clean up any existing jobs
SELECT cron.unschedule('regfox-auto-sync') WHERE EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'regfox-auto-sync'
);

-- Recreate the scheduled sync job (every 30 minutes)
SELECT cron.schedule(
    'regfox-auto-sync',
    '*/30 * * * *',
    $$
    SELECT
        net.http_post(
            url := 'https://oglargpkunjeblfutekl.supabase.co/functions/v1/regfox-scheduled-sync',
            headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9nbGFyZ3BrdW5qZWJsZnV0ZWtsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcyODI1NjYsImV4cCI6MjA3Mjg1ODU2Nn0.kjzDMk4kl4-ZS39GJkQc_HANIujftUoUovHL_dNiQik"}'::jsonb,
            body := '{"scheduled": true}'::jsonb
        ) as request_id;
    $$
);