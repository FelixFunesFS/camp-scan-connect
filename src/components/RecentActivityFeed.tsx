import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { Activity, Clock, Users, CreditCard } from 'lucide-react';

interface ActivityItem {
  id: string;
  type: 'activation' | 'assignment' | 'sync' | 'system';
  message: string;
  timestamp: string;
  user?: string;
}

export const RecentActivityFeed: React.FC = () => {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRecentActivity();
    
    // Set up real-time subscription
    const channel = supabase
      .channel('activity-feed')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'station_transactions'
      }, () => {
        fetchRecentActivity();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchRecentActivity = async () => {
    try {
      const { data, error } = await supabase
        .from('station_transactions')
        .select(`
          id,
          transaction_type,
          created_at,
          attendees(first_name, last_name)
        `)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      const formattedActivities: ActivityItem[] = data?.map((item: any) => ({
        id: item.id,
        type: item.transaction_type === 'activate' ? 'activation' : 'assignment',
        message: item.transaction_type === 'activate' 
          ? `${item.attendees?.first_name} ${item.attendees?.last_name} activated`
          : `RFID assigned to ${item.attendees?.first_name} ${item.attendees?.last_name}`,
        timestamp: item.created_at
      })) || [];

      setActivities(formattedActivities);
    } catch (error) {
      console.error('Error fetching activity:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'activation': return <Users className="h-3 w-3" />;
      case 'assignment': return <CreditCard className="h-3 w-3" />;
      default: return <Activity className="h-3 w-3" />;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'activation': return 'text-emerald-500';
      case 'assignment': return 'text-blue-500';
      default: return 'text-muted-foreground';
    }
  };

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-primary" />
          Recent Activity
          {!loading && <Badge variant="outline">{activities.length}</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-64">
          <div className="space-y-3">
            {loading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center gap-3 animate-pulse">
                    <div className="h-3 w-3 bg-muted rounded-full" />
                    <div className="h-3 bg-muted rounded flex-1" />
                    <div className="h-3 w-16 bg-muted rounded" />
                  </div>
                ))}
              </div>
            ) : activities.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-4">
                No recent activity
              </p>
            ) : (
              activities.map((activity) => (
                <div key={activity.id} className="flex items-center gap-3 text-sm">
                  <div className={getActivityColor(activity.type)}>
                    {getActivityIcon(activity.type)}
                  </div>
                  <span className="flex-1 truncate">{activity.message}</span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(activity.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};