-- Clear stuck sync and expired locks
UPDATE regfox_sync_log 
SET 
  status = 'error',
  sync_completed_at = now(),
  error_message = 'Sync cancelled due to CPU timeout - cleared by admin',
  cancelled_at = now(),
  cancelled_by = 'system_cleanup'
WHERE status = 'in_progress' 
  AND sync_started_at < now() - interval '30 minutes';

-- Clean up expired locks
DELETE FROM sync_locks 
WHERE expires_at < now() 
  OR (lock_type = 'regfox_sync' AND locked_at < now() - interval '30 minutes');