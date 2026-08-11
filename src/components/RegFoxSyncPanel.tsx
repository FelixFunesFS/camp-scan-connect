import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AlertCircle, CheckCircle2, RefreshCw, Clock, Download, Activity, X, Timer, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useEvent } from '@/contexts/EventContext';

interface SyncLog {
  id: string;
  sync_type: string;
  status: string;
  total_records: number | null;
  new_records: number | null;
  updated_records: number | null;
  error_message: string | null;
  sync_started_at: string;
  sync_completed_at: string | null;
  created_at: string;
  cancelled_at: string | null;
  heartbeat_at: string | null;
  sync_timeout_minutes: number | null;
  progress_info: any;
}

interface RegFoxSyncPanelProps {
  className?: string;
}

export const RegFoxSyncPanel: React.FC<RegFoxSyncPanelProps> = ({ className }) => {
  const { selectedEvent, eventId } = useEvent();
  const [isInitialSyncing, setIsInitialSyncing] = useState(false);
  const [isManualSyncing, setIsManualSyncing] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [syncLogs, setSyncLogs] = useState<SyncLog[]>([]);
  const [lastSyncStatus, setLastSyncStatus] = useState<SyncLog | null>(null);
  const [activeSyncId, setActiveSyncId] = useState<string | null>(null);
  const debounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const boundFormId = selectedEvent?.regfox_form_id ?? null;

  // Fetch sync logs for the event being viewed
  const fetchSyncLogs = useCallback(async () => {
    if (!eventId) return;
    try {
      const { data, error } = await supabase
        .from('regfox_sync_log')
        .select('*')
        .eq('event_id', eventId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      setSyncLogs(data || []);
      if (data && data.length > 0) {
        setLastSyncStatus(data[0]);
        // Check if there's an active sync
        const activeSync = data.find(log => log.status === 'in_progress' && !log.cancelled_at);
        setActiveSyncId(activeSync?.id || null);
      }
    } catch (error) {
      console.error('Error fetching sync logs:', error);
    }
  }, [eventId]);

  // Debounced version to prevent excessive UI updates during heartbeat changes
  const debouncedFetchSyncLogs = useCallback(() => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    
    debounceTimeoutRef.current = setTimeout(() => {
      fetchSyncLogs();
    }, 300); // 300ms debounce for UI updates
  }, [fetchSyncLogs]);

  useEffect(() => {
    fetchSyncLogs();

    // Set up real-time subscription for sync logs
    const channel = supabase
      .channel('regfox-sync-logs')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'regfox_sync_log'
        },
        () => {
          debouncedFetchSyncLogs();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [debouncedFetchSyncLogs]);

  const handleInitialSync = async () => {
    if (!eventId) return;
    setIsInitialSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('regfox-sync', {
        body: { sync_type: 'initial_sync', event_id: eventId }
      });

      if (error) throw error;

      toast.success(`Full sync started for ${selectedEvent?.name ?? 'this event'}`);
      fetchSyncLogs();
    } catch (error) {
      console.error('Error during initial sync:', error);
      toast.error(`Full sync failed: ${error.message}`);
    } finally {
      setIsInitialSyncing(false);
    }
  };

  const handleManualSync = async () => {
    if (!eventId) return;
    setIsManualSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('regfox-sync', {
        body: { sync_type: 'manual_sync', event_id: eventId }
      });

      if (error) throw error;

      toast.success(`Manual sync started for ${selectedEvent?.name ?? 'this event'}`);
      fetchSyncLogs();
    } catch (error) {
      console.error('Error during manual sync:', error);
      if (error.message?.includes('SYNC_IN_PROGRESS')) {
        toast.error('Another sync is already running. Please wait or cancel it first.');
      } else {
        toast.error(`Manual sync failed: ${error.message}`);
      }
    } finally {
      setIsManualSyncing(false);
    }
  };

  const handleCancelSync = async (syncId?: string) => {
    setIsCancelling(true);
    try {
      const { data, error } = await supabase.functions.invoke('regfox-sync-cancel', {
        body: syncId ? { syncId } : { cancelAll: true }
      });

      if (error) throw error;

      toast.success(`Successfully cancelled sync${syncId ? '' : 's'}`);
      fetchSyncLogs();
    } catch (error) {
      console.error('Error cancelling sync:', error);
      toast.error(`Failed to cancel sync: ${error.message}`);
    } finally {
      setIsCancelling(false);
    }
  };

  const handleForceReset = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('regfox-cleanup', {
        body: {}
      });

      if (error) throw error;

      toast.success('Force reset completed - cleared stuck syncs');
      fetchSyncLogs();
    } catch (error) {
      console.error('Error during force reset:', error);
      toast.error(`Force reset failed: ${error.message}`);
    }
  };

  const getSyncStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return (
          <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Success
          </Badge>
        );
      case 'error':
        return (
          <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
            <AlertCircle className="h-3 w-3 mr-1" />
            Error
          </Badge>
        );
      case 'in_progress':
        return (
          <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
            <Activity className="h-3 w-3 mr-1 animate-spin" />
            In Progress
          </Badge>
        );
      default:
        return (
          <Badge className="bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200">
            <Clock className="h-3 w-3 mr-1" />
            Unknown
          </Badge>
        );
    }
  };

  const formatSyncType = (syncType: string) => {
    switch (syncType) {
      case 'initial_sync':
        return 'Initial Sync';
      case 'manual_sync':
        return 'Manual Sync';
      default:
        return syncType;
    }
  };

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            RegFox Integration
          </CardTitle>
          <CardDescription>
            Sync attendee data from RegFox for the event you are viewing
          </CardDescription>
          <div className="flex flex-wrap items-center gap-2 pt-2">
            <Badge variant="secondary">{selectedEvent?.name ?? 'No event selected'}</Badge>
            {boundFormId ? (
              <Badge variant="outline">RegFox form {boundFormId}</Badge>
            ) : (
              <Badge className="bg-amber-100 text-amber-900 dark:bg-amber-900 dark:text-amber-100">
                <AlertCircle className="mr-1 h-3 w-3" />
                No RegFox form linked
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {!boundFormId && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100">
              This event has no RegFox form linked, so a sync would fall back to another
              year's roster. Link the form before syncing.
            </div>
          )}
          {/* Sync Controls */}
          <TooltipProvider>
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={handleInitialSync}
                  disabled={isInitialSyncing || isManualSyncing || isCancelling || !!activeSyncId || !boundFormId}
                  className="flex items-center gap-2"
                >
                  {isInitialSyncing ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                  {isInitialSyncing ? 'Syncing...' : 'Full Sync'}
                </Button>
                
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      onClick={handleManualSync}
                      disabled={isInitialSyncing || isManualSyncing || isCancelling || !!activeSyncId || !boundFormId}
                      className="flex items-center gap-2"
                    >
                      {isManualSyncing ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCw className="h-4 w-4" />
                      )}
                      {isManualSyncing ? 'Syncing...' : 'Manual Sync'}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="max-w-xs">
                      <p className="font-medium">RegFox Manual Sync</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Syncs incremental changes from RegFox. Excludes abandoned registrations from import while preserving existing cancelled, waitlisted, and pending records for reference.
                      </p>
                    </div>
                  </TooltipContent>
                </Tooltip>
              
              {/* Cancel button shows when there's an active sync */}
              {activeSyncId && (
                <Button
                  variant="destructive"
                  onClick={() => handleCancelSync(activeSyncId)}
                  disabled={isCancelling}
                  className="flex items-center gap-2"
                >
                  {isCancelling ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <X className="h-4 w-4" />
                  )}
                  {isCancelling ? 'Cancelling...' : 'Cancel Sync'}
                </Button>
              )}
              
              {/* Force reset button for admin */}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleForceReset}
                disabled={isCancelling}
                className="flex items-center gap-2 text-muted-foreground"
                title="Force reset stuck syncs (use if syncs are stuck)"
              >
                <RotateCcw className="h-4 w-4" />
                Force Reset
              </Button>
            </div>
            
            {/* Progress indicator for active sync */}
            {activeSyncId && lastSyncStatus?.heartbeat_at && (
              <div className="p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                    Sync in progress...
                  </span>
                  <span className="text-xs text-blue-600 dark:text-blue-400">
                    Last activity: {new Date(lastSyncStatus.heartbeat_at).toLocaleTimeString()}
                  </span>
                </div>
                
                {lastSyncStatus.progress_info?.processed && lastSyncStatus.progress_info?.total && (
                  <div className="space-y-2">
                    <Progress 
                      value={(lastSyncStatus.progress_info.processed / lastSyncStatus.progress_info.total) * 100} 
                      className="h-2"
                    />
                    <div className="flex justify-between text-xs text-blue-600 dark:text-blue-400">
                      <span>
                        {lastSyncStatus.progress_info.processed} / {lastSyncStatus.progress_info.total} records
                      </span>
                      <span>
                        {Math.round((lastSyncStatus.progress_info.processed / lastSyncStatus.progress_info.total) * 100)}%
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          </TooltipProvider>

          {/* Last Sync Status */}
          {lastSyncStatus && (
            <div className="p-4 border rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium">Last Sync Status</h4>
                {getSyncStatusBadge(lastSyncStatus.status)}
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Type:</span>
                  <p className="font-medium">{formatSyncType(lastSyncStatus.sync_type)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Total Records:</span>
                  <p className="font-medium">{lastSyncStatus.total_records || 0}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">New:</span>
                  <p className="font-medium text-green-600">{lastSyncStatus.new_records || 0}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Updated:</span>
                  <p className="font-medium text-blue-600">{lastSyncStatus.updated_records || 0}</p>
                </div>
              </div>

              {lastSyncStatus.error_message && (
                <div className="mt-3 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded">
                  <p className="text-sm text-red-700 dark:text-red-300">
                    <strong>Error:</strong> {lastSyncStatus.error_message}
                  </p>
                </div>
              )}

              <div className="mt-3 text-xs text-muted-foreground">
                Started: {new Date(lastSyncStatus.sync_started_at).toLocaleString()}
                {lastSyncStatus.sync_completed_at ? (
                  <> • Completed: {new Date(lastSyncStatus.sync_completed_at).toLocaleString()}</>
                ) : lastSyncStatus.heartbeat_at ? (
                  <> • Last activity: {new Date(lastSyncStatus.heartbeat_at).toLocaleString()}</>
                ) : null}
                {lastSyncStatus.cancelled_at && (
                  <> • Cancelled: {new Date(lastSyncStatus.cancelled_at).toLocaleString()}</>
                )}
              </div>
            </div>
          )}

          {/* Sync History */}
          <div>
            <h4 className="font-medium mb-3">Recent Sync History</h4>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {syncLogs.length > 0 ? (
                syncLogs.map((log) => (
                  <div key={log.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      {getSyncStatusBadge(log.status)}
                      <div>
                        <p className="text-sm font-medium">{formatSyncType(log.sync_type)}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(log.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="text-right text-sm">
                      <p className="font-medium">
                        {(log.new_records || 0) + (log.updated_records || 0)} records
                      </p>
                      {log.total_records && (
                        <p className="text-xs text-muted-foreground">
                          of {log.total_records} total
                        </p>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  No sync history available. Run your first sync to get started.
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};