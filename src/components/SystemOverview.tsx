import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { Shield, Users, CreditCard, Activity, Zap, Globe, CheckCircle2, AlertCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';

interface SystemMetrics {
  attendees: {
    total: number;
    activated: number;
    activationRate: number;
  };
  rfids: {
    total: number;
    assigned: number;
    assignmentRate: number;
  };
  dailyActivity: {
    transactions: number;
    activations: number;
  };
  lastSync: {
    status: string;
    timestamp: string | null;
  };
}

interface SystemOverviewProps {
  className?: string;
}

export const SystemOverview: React.FC<SystemOverviewProps> = ({ className }) => {
  const [metrics, setMetrics] = useState<SystemMetrics>({
    attendees: { total: 0, activated: 0, activationRate: 0 },
    rfids: { total: 0, assigned: 0, assignmentRate: 0 },
    dailyActivity: { transactions: 0, activations: 0 },
    lastSync: { status: 'unknown', timestamp: null }
  });
  const [loading, setLoading] = useState(true);

  const fetchSystemMetrics = async () => {
    try {
      const { data: attendeeData } = await supabase
        .from('attendees')
        .select('id, activated_at');

      const { data: rfidData } = await supabase
        .from('rfid_tags')
        .select('uid, status, attendee_id');

      const today = new Date().toISOString().split('T')[0];
      const { data: transactionData } = await supabase
        .from('station_transactions')
        .select('id, transaction_type')
        .gte('created_at', `${today}T00:00:00.000Z`)
        .lt('created_at', `${today}T23:59:59.999Z`);

      const { data: syncData } = await supabase
        .from('regfox_sync_log')
        .select('status, sync_completed_at')
        .order('sync_started_at', { ascending: false })
        .limit(1);

      const totalAttendees = attendeeData?.length || 0;
      const activatedAttendees = attendeeData?.filter(a => a.activated_at).length || 0;
      const activationRate = totalAttendees > 0 ? (activatedAttendees / totalAttendees) * 100 : 0;

      const totalRfids = rfidData?.length || 0;
      const assignedRfids = rfidData?.filter(r => r.status === 'assigned' || r.status === 'active').length || 0;
      const assignmentRate = totalRfids > 0 ? (assignedRfids / totalRfids) * 100 : 0;

      const todayTransactions = transactionData?.length || 0;
      const todayActivations = transactionData?.filter(t => t.transaction_type === 'activate').length || 0;

      setMetrics({
        attendees: { total: totalAttendees, activated: activatedAttendees, activationRate },
        rfids: { total: totalRfids, assigned: assignedRfids, assignmentRate },
        dailyActivity: { transactions: todayTransactions, activations: todayActivations },
        lastSync: {
          status: syncData?.[0]?.status || 'unknown',
          timestamp: syncData?.[0]?.sync_completed_at || null
        }
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
    const interval = setInterval(fetchSystemMetrics, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
      case 'success':
        return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
      case 'in_progress':
        return <Activity className="h-4 w-4 text-blue-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-amber-500" />;
    }
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 animate-spin text-primary" />
            <div>
              <p className="font-medium">Loading System Status...</p>
              <p className="text-sm text-muted-foreground">Fetching metrics</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          System Overview
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-500" />
              <span className="text-sm font-medium">Attendees</span>
              <Badge variant="outline">{metrics.attendees.total}</Badge>
            </div>
            <Progress value={metrics.attendees.activationRate} className="h-2" />
            <p className="text-xs text-muted-foreground">
              {metrics.attendees.activated} activated ({metrics.attendees.activationRate.toFixed(1)}%)
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-emerald-500" />
              <span className="text-sm font-medium">RFID Tags</span>
              <Badge variant="outline">{metrics.rfids.total}</Badge>
            </div>
            <Progress value={metrics.rfids.assignmentRate} className="h-2" />
            <p className="text-xs text-muted-foreground">
              {metrics.rfids.assigned} assigned ({metrics.rfids.assignmentRate.toFixed(1)}%)
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-purple-500" />
              <span className="text-sm font-medium">Today</span>
              <Badge variant="outline">{metrics.dailyActivity.transactions}</Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              {metrics.dailyActivity.activations} activations
            </p>
          </div>
        </div>

        {/* Status */}
        <div className="flex items-center justify-between p-3 border rounded-lg">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-amber-500" />
            <span className="text-sm">RegFox Sync Status</span>
          </div>
          <div className="flex items-center gap-2">
            {getStatusIcon(metrics.lastSync.status)}
            <Badge variant={metrics.lastSync.status === 'completed' ? 'default' : 'secondary'}>
              {metrics.lastSync.status}
            </Badge>
          </div>
        </div>

        {metrics.lastSync.timestamp && (
          <p className="text-xs text-muted-foreground">
            Last sync: {new Date(metrics.lastSync.timestamp).toLocaleString()}
          </p>
        )}
      </CardContent>
    </Card>
  );
};