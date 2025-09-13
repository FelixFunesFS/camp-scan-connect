-- Clean up stuck sync logs that are older than 10 minutes and still in progress
UPDATE regfox_sync_log 
SET status = 'error', 
    error_message = 'Sync timed out or failed to complete',
    sync_completed_at = now()
WHERE status = 'in_progress' 
AND sync_started_at < (now() - INTERVAL '10 minutes');