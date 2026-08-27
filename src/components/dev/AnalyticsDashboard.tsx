import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";
import { Activity, Users, Database, TrendingUp, AlertTriangle } from "lucide-react";
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface AnalyticsData {
  totalRegistrations: number;
  totalApiSyncs: number;
  successRate: number;
  ticketBreakdown: Array<{ name: string; value: number; color: string }>;
  registrationVelocity: Array<{ date: string; registrations: number; syncs: number }>;
  errorRate: number;
  avgSyncDuration: number;
}

export const AnalyticsDashboard = () => {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = async () => {
    try {
      // Fetch registration data (attendee registrations)
      const { data: attendeeData, error: attendeeError } = await supabase
        .from('attendees')
        .select('ticket_type, created_at, registration_status')
        .eq('registration_status', 'registered');

      if (attendeeError) throw attendeeError;

      // Fetch API sync data
      const { data: syncData, error: syncError } = await supabase
        .from('regfox_sync_log')
        .select('status, sync_started_at, sync_completed_at, sync_type');

      if (syncError) throw syncError;

      // Calculate metrics
      const totalRegistrations = attendeeData?.length || 0;
      const totalApiSyncs = syncData?.length || 0;
      
      const successfulSyncs = syncData?.filter(s => s.status === 'completed').length || 0;
      const successRate = totalApiSyncs > 0 ? (successfulSyncs / totalApiSyncs) * 100 : 0;
      
      const errorSyncs = syncData?.filter(s => s.status === 'error').length || 0;
      const errorRate = totalApiSyncs > 0 ? (errorSyncs / totalApiSyncs) * 100 : 0;

      // Calculate average sync duration
      const completedSyncs = syncData?.filter(s => s.status === 'completed' && s.sync_completed_at) || [];
      const avgSyncDuration = completedSyncs.length > 0 ? 
        completedSyncs.reduce((acc, sync) => {
          const duration = new Date(sync.sync_completed_at!).getTime() - new Date(sync.sync_started_at).getTime();
          return acc + duration;
        }, 0) / completedSyncs.length / 1000 : 0;

      // Ticket type breakdown
      const ticketCounts = attendeeData?.reduce((acc, attendee) => {
        acc[attendee.ticket_type] = (acc[attendee.ticket_type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      const colors = ['#8b5cf6', '#f59e0b', '#10b981', '#3b82f6'];
      const ticketBreakdown = Object.entries(ticketCounts).map(([name, value], index) => ({
        name: name.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
        value,
        color: colors[index % colors.length]
      }));

      // Registration velocity (last 7 days)
      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - i);
        return date.toISOString().split('T')[0];
      }).reverse();

      const registrationVelocity = last7Days.map(date => {
        const registrations = attendeeData?.filter(a => 
          a.created_at.split('T')[0] === date
        ).length || 0;
        
        const syncs = syncData?.filter(s => 
          s.sync_started_at.split('T')[0] === date
        ).length || 0;

        return {
          date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          registrations,
          syncs
        };
      });

      setAnalytics({
        totalRegistrations,
        totalApiSyncs,
        successRate,
        ticketBreakdown,
        registrationVelocity,
        errorRate,
        avgSyncDuration
      });

    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();

    // Set up real-time updates
    const channel = supabase
      .channel('analytics-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'attendees' }, fetchAnalytics)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'regfox_sync_log' }, fetchAnalytics)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (loading || !analytics) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Loading analytics...</CardTitle>
        </CardHeader>
      </Card>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Registrations</CardTitle>
            <Users className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalRegistrations}</div>
            <p className="text-xs text-muted-foreground">Total attendees registered</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">API Syncs</CardTitle>
            <Database className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalApiSyncs}</div>
            <p className="text-xs text-muted-foreground">Bulk sync operations</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <UITooltip>
              <TooltipTrigger asChild>
                <div className="text-2xl font-bold">{analytics.successRate.toFixed(1)}%</div>
              </TooltipTrigger>
              <TooltipContent>
                <p>Percentage of successful API sync operations</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {analytics.successRate > 90 ? 'Excellent performance' : 
                   analytics.successRate > 70 ? 'Good performance' : 'Needs attention - below 70%'}
                </p>
              </TooltipContent>
            </UITooltip>
            <UITooltip>
              <TooltipTrigger asChild>
                <Progress value={analytics.successRate} className="mt-2" />
              </TooltipTrigger>
              <TooltipContent>
                <p>Visual indicator of sync reliability</p>
                <p className="text-xs text-muted-foreground">Green: {'>'}90% | Yellow: 70-90% | Red: {'<'}70%</p>
              </TooltipContent>
            </UITooltip>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Error Rate</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.errorRate.toFixed(1)}%</div>
            <Progress 
              value={analytics.errorRate} 
              className="mt-2"
            />
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <UITooltip>
              <TooltipTrigger asChild>
                <CardTitle>Registration Activity (Last 7 Days)</CardTitle>
              </TooltipTrigger>
              <TooltipContent>
                <p>Shows new attendee registrations vs API sync operations</p>
                <p className="text-xs text-muted-foreground mt-1">Blue bars: New registrations | Green bars: API syncs</p>
              </TooltipContent>
            </UITooltip>
            <CardDescription>Daily registrations and API sync activity</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analytics.registrationVelocity}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="registrations" fill="#3b82f6" name="Registrations" />
                <Bar dataKey="syncs" fill="#10b981" name="API Syncs" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <UITooltip>
              <TooltipTrigger asChild>
                <CardTitle>Ticket Type Distribution</CardTitle>
              </TooltipTrigger>
              <TooltipContent>
                <p>Breakdown of attendees by accommodation preference</p>
                <p className="text-xs text-muted-foreground mt-1">Helps with resource planning and logistics</p>
              </TooltipContent>
            </UITooltip>
            <CardDescription>Breakdown by accommodation type</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={analytics.ticketBreakdown}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {analytics.ticketBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Additional Metrics */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Metrics</CardTitle>
          <CardDescription>System performance indicators</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <UITooltip>
                <TooltipTrigger asChild>
                  <div className="text-sm font-medium">Average Sync Duration</div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>How long each API sync typically takes</p>
                  <p className="text-xs text-muted-foreground mt-1">Under 30s is excellent, over 60s may indicate issues</p>
                </TooltipContent>
              </UITooltip>
              <div className="text-2xl font-bold">{analytics.avgSyncDuration.toFixed(1)}s</div>
              <Progress value={Math.min((analytics.avgSyncDuration / 60) * 100, 100)} />
            </div>
            
            <div className="space-y-2">
              <UITooltip>
                <TooltipTrigger asChild>
                  <div className="text-sm font-medium">Data Consistency</div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Checks if both registration and sync systems are active</p>
                  <p className="text-xs text-muted-foreground mt-1">✓ = Both systems working | ⚠️ = One system inactive</p>
                </TooltipContent>
              </UITooltip>
              <div className="text-2xl font-bold">
                {analytics.totalRegistrations > 0 && analytics.totalApiSyncs > 0 ? '✓' : '⚠️'}
              </div>
              <div className="text-xs text-muted-foreground">
                Registrations and API syncs active
              </div>
            </div>

            <div className="space-y-2">
              <UITooltip>
                <TooltipTrigger asChild>
                  <div className="text-sm font-medium">System Health</div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Overall system health based on success rate</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    ✓ Excellent ({'>'}90%) | ⚠️ Good (70-90%) | ❌ Needs attention ({'<'}70%)
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Red X often indicates past webhook failures - now resolved with scheduled syncing
                  </p>
                </TooltipContent>
              </UITooltip>
              <div className="text-2xl font-bold">
                {analytics.successRate > 90 ? '✓' : analytics.successRate > 70 ? '⚠️' : '❌'}
              </div>
              <div className="text-xs text-muted-foreground">
                {analytics.successRate > 90 ? 'Excellent' : 
                 analytics.successRate > 70 ? 'Good' : 'Needs attention'}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
    </TooltipProvider>
  );
};