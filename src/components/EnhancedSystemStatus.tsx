import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { Shield, Users, CreditCard, Activity, Zap, Globe, Clock, CheckCircle2, AlertCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';

interface SystemMetrics {
  attendees: {
    total: number;
    activated: number;
    activationRate: number;
  };
  rfids: {
    total: number;
    active: number;
    assigned: number;
    unissued: number;
    assignmentRate: number;
  };
  dailyActivity: {
    transactions: number;
    activations: number;
  };
  lastSync: {
    status: string;
    timestamp: string | null;
    recordsProcessed: number;
  };
  webhookStatus: 'connected' | 'disconnected' | 'unknown';
}

interface EnhancedSystemStatusProps {
  className?: string;
  onViewDetails?: () => void;
}

export const EnhancedSystemStatus: React.FC<EnhancedSystemStatusProps> = ({ className, onViewDetails }) => {
  const [metrics, setMetrics] = useState<SystemMetrics>({
    attendees: { total: 0, activated: 0, activationRate: 0 },
    rfids: { total: 0, active: 0, assigned: 0, unissued: 0, assignmentRate: 0 },
    dailyActivity: { transactions: 0, activations: 0 },
    lastSync: { status: 'unknown', timestamp: null, recordsProcessed: 0 },
    webhookStatus: 'unknown'
  });

  const [loading, setLoading] = useState(true);

  const fetchSystemMetrics = async () => {
    try {
      // Fetch attendee metrics
      const { data: attendeeData, error: attendeeError } = await supabase
        .from('attendees')
        .select('id, activated_at');

      if (attendeeError) throw attendeeError;

      const totalAttendees = attendeeData?.length || 0;
      const activatedAttendees = attendeeData?.filter(a => a.activated_at).length || 0;
      const activationRate = totalAttendees > 0 ? (activatedAttendees / totalAttendees) * 100 : 0;

      // Fetch RFID metrics
      const { data: rfidData, error: rfidError } = await supabase
        .from('rfid_tags')
        .select('uid, status, attendee_id');

      if (rfidError) throw rfidError;

      const totalRfids = rfidData?.length || 0;
      const activeRfids = rfidData?.filter(r => r.status === 'active').length || 0;
      const assignedRfids = rfidData?.filter(r => r.status === 'assigned').length || 0;
      const unissuedRfids = rfidData?.filter(r => r.status === 'unissued').length || 0;
      const assignmentRate = totalRfids > 0 ? ((activeRfids + assignedRfids) / totalRfids) * 100 : 0;

      // Fetch today's transactions
      const today = new Date().toISOString().split('T')[0];
      const { data: transactionData, error: transactionError } = await supabase
        .from('station_transactions')
        .select('id, transaction_type, created_at')
        .gte('created_at', `${today}T00:00:00.000Z`)
        .lt('created_at', `${today}T23:59:59.999Z`);

      if (transactionError) throw transactionError;

      const todayTransactions = transactionData?.length || 0;
      const todayActivations = transactionData?.filter(t => t.transaction_type === 'activate').length || 0;

      // Fetch last sync info
      const { data: syncData, error: syncError } = await supabase
        .from('regfox_sync_log')
        .select('status, sync_completed_at, total_records')
        .order('sync_started_at', { ascending: false })
        .limit(1);

      if (syncError) throw syncError;

      const lastSync = syncData?.[0];

      // Check webhook status (simplified - in reality you'd ping the webhook endpoint)
      const webhookStatus: 'connected' | 'disconnected' | 'unknown' = 'connected'; // Placeholder

      setMetrics({
        attendees: {
          total: totalAttendees,
          activated: activatedAttendees,
          activationRate
        },
        rfids: {
          total: totalRfids,
          active: activeRfids,
          assigned: assignedRfids,
          unissued: unissuedRfids,
          assignmentRate
        },
        dailyActivity: {
          transactions: todayTransactions,
          activations: todayActivations
        },
        lastSync: {
          status: lastSync?.status || 'unknown',
          timestamp: lastSync?.sync_completed_at || null,
          recordsProcessed: lastSync?.total_records || 0
        },
        webhookStatus
      });

    } catch (error) {
      console.error('Error fetching system metrics:', error);
      toast.error('Failed to load system metrics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSystemMetrics();

    // Set up real-time subscriptions
    const attendeeChannel = supabase
      .channel('attendee-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'attendees' }, 
        () => fetchSystemMetrics()
      )
      .subscribe();

    const rfidChannel = supabase
      .channel('rfid-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'rfid_tags' }, 
        () => fetchSystemMetrics()
      )
      .subscribe();

    const transactionChannel = supabase
      .channel('transaction-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'station_transactions' }, 
        () => fetchSystemMetrics()
      )
      .subscribe();

    const syncChannel = supabase
      .channel('sync-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'regfox_sync_log' }, 
        () => fetchSystemMetrics()
      )
      .subscribe();

    // Cleanup subscriptions
    return () => {
      supabase.removeChannel(attendeeChannel);
      supabase.removeChannel(rfidChannel);
      supabase.removeChannel(transactionChannel);
      supabase.removeChannel(syncChannel);
    };
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
      case 'success':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'in_progress':
        return <Activity className="h-4 w-4 text-blue-500" />;
      case 'error':
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variant = status === 'completed' || status === 'success' ? 'default' : 
                   status === 'in_progress' ? 'secondary' : 'destructive';
    return <Badge variant={variant}>{status}</Badge>;
  };

  if (loading) {
    return (
      <Card className="p-4">
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 animate-spin text-primary" />
          <div>
            <p className="mobile-subtitle">Loading System Status...</p>
            <p className="text-sm text-muted-foreground">Fetching real-time metrics</p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            System Status
          </CardTitle>
          {onViewDetails && (
            <Button variant="outline" size="sm" onClick={onViewDetails}>
              View Details
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* System Health Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-blue-500" />
                <span className="text-sm font-medium">Attendees</span>
              </div>
              <Badge variant="outline">{metrics.attendees.total}</Badge>
            </div>
            <div className="mt-2">
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span>Activated: {metrics.attendees.activated}</span>
                <span>{metrics.attendees.activationRate.toFixed(1)}%</span>
              </div>
              <Progress value={metrics.attendees.activationRate} className="h-2" />
            </div>
          </Card>

          <Card className="p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-green-500" />
                <span className="text-sm font-medium">RFID Tags</span>
              </div>
              <Badge variant="outline">{metrics.rfids.total}</Badge>
            </div>
            <div className="mt-2">
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span>Assigned: {metrics.rfids.active + metrics.rfids.assigned}</span>
                <span>{metrics.rfids.assignmentRate.toFixed(1)}%</span>
              </div>
              <Progress value={metrics.rfids.assignmentRate} className="h-2" />
            </div>
          </Card>

          <Card className="p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-purple-500" />
                <span className="text-sm font-medium">Today's Activity</span>
              </div>
              <Badge variant="outline">{metrics.dailyActivity.transactions}</Badge>
            </div>
            <div className="mt-2">
              <div className="text-xs text-muted-foreground">
                {metrics.dailyActivity.activations} activations
              </div>
            </div>
          </Card>
        </div>

        {/* System Services Status */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium">Service Status</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-yellow-500" />
                <span className="text-sm">RegFox Sync</span>
              </div>
              <div className="flex items-center gap-2">
                {getStatusIcon(metrics.lastSync.status)}
                {getStatusBadge(metrics.lastSync.status)}
              </div>
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-blue-500" />
                <span className="text-sm">Webhook Status</span>
              </div>
              <div className="flex items-center gap-2">
                {getStatusIcon(metrics.webhookStatus)}
                <Badge variant={metrics.webhookStatus === 'connected' ? 'default' : 'destructive'}>
                  {metrics.webhookStatus}
                </Badge>
              </div>
            </div>
          </div>

          {metrics.lastSync.timestamp && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              Last sync: {new Date(metrics.lastSync.timestamp).toLocaleString()} 
              ({metrics.lastSync.recordsProcessed} records)
            </div>
          )}
        </div>

        {/* Quick Stats */}
        <div className="pt-3 border-t">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-lg font-semibold text-green-600">{metrics.rfids.active}</div>
              <div className="text-xs text-muted-foreground">Active RFIDs</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-blue-600">{metrics.rfids.assigned}</div>
              <div className="text-xs text-muted-foreground">Assigned RFIDs</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-gray-600">{metrics.rfids.unissued}</div>
              <div className="text-xs text-muted-foreground">Available RFIDs</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-purple-600">{metrics.dailyActivity.activations}</div>
              <div className="text-xs text-muted-foreground">Today's Activations</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};