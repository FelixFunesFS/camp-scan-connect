import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { AlertCircle, CheckCircle2, RefreshCw, Clock, Download, Activity } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

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
}

interface RegFoxSyncPanelProps {
  className?: string;
}

export const RegFoxSyncPanel: React.FC<RegFoxSyncPanelProps> = ({ className }) => {
  const [isInitialSyncing, setIsInitialSyncing] = useState(false);
  const [isManualSyncing, setIsManualSyncing] = useState(false);
  const [syncLogs, setSyncLogs] = useState<SyncLog[]>([]);
  const [lastSyncStatus, setLastSyncStatus] = useState<SyncLog | null>(null);

  // Fetch sync logs
  const fetchSyncLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('regfox_sync_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      setSyncLogs(data || []);
      if (data && data.length > 0) {
        setLastSyncStatus(data[0]);
      }
    } catch (error) {
      console.error('Error fetching sync logs:', error);
    }
  };

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
          fetchSyncLogs();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleInitialSync = async () => {
    setIsInitialSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('regfox-sync', {
        body: {}
      });

      if (error) throw error;

      toast.success('Initial sync completed successfully!');
      fetchSyncLogs();
    } catch (error) {
      console.error('Error during initial sync:', error);
      toast.error(`Initial sync failed: ${error.message}`);
    } finally {
      setIsInitialSyncing(false);
    }
  };

  const handleManualSync = async () => {
    setIsManualSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('regfox-manual-sync', {
        body: {}
      });

      if (error) throw error;

      toast.success('Manual sync completed successfully!');
      fetchSyncLogs();
    } catch (error) {
      console.error('Error during manual sync:', error);
      toast.error(`Manual sync failed: ${error.message}`);
    } finally {
      setIsManualSyncing(false);
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
      case 'webhook':
        return 'Webhook';
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
            Sync attendee data from RegFox registration system
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Sync Controls */}
          <div className="flex gap-4">
            <Button
              onClick={handleInitialSync}
              disabled={isInitialSyncing || isManualSyncing}
              className="flex items-center gap-2"
            >
              {isInitialSyncing ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              {isInitialSyncing ? 'Syncing...' : 'Full Sync'}
            </Button>
            
            <Button
              variant="outline"
              onClick={handleManualSync}
              disabled={isInitialSyncing || isManualSyncing}
              className="flex items-center gap-2"
            >
              {isManualSyncing ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              {isManualSyncing ? 'Syncing...' : 'Manual Sync'}
            </Button>
          </div>

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
                Last synced: {new Date(lastSyncStatus.sync_completed_at || lastSyncStatus.sync_started_at).toLocaleString()}
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