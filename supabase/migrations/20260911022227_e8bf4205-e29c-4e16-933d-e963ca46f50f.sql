REVOKE EXECUTE ON FUNCTION public.cleanup_stuck_syncs() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.can_start_sync() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.release_sync_lock(uuid) FROM authenticated;