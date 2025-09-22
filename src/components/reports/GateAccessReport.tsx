import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
import { Shield, Users, Clock, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { TimePeriod, getStandardTimeBoundaries, formatTimePeriod } from "@/utils/etTimezone";
import { useBackgroundRefresh } from "@/hooks/useBackgroundRefresh";
import { 
  Tooltip as UITooltip, 
  TooltipContent as UITooltipContent, 
  TooltipProvider as UITooltipProvider, 
  TooltipTrigger as UITooltipTrigger 
} from "@/components/ui/tooltip";

interface GateAccessData {
  currentOccupancy: number;
  dailyEntries: number;
  dailyExits: number;
  hourlyActivity: Array<{ hour: string; entries: number; exits: number }>;
  peakHour: { hour: string; activity: number } | null;
  onSiteAttendees: Array<{
    name: string;
    rfid_uid: string;
    entry_time: string;
    duration_minutes: number;
  }>;
  averageVisitMinutes: number;
}

interface GateAccessReportProps {
  selectedPeriod: TimePeriod;
  refreshTrigger?: number;
}

export const GateAccessReport = ({ selectedPeriod, refreshTrigger }: GateAccessReportProps) => {
  const [gateData, setGateData] = useState<GateAccessData>({
    currentOccupancy: 0,
    dailyEntries: 0,
    dailyExits: 0,
    hourlyActivity: [],
    peakHour: null,
    onSiteAttendees: [],
    averageVisitMinutes: 0
  });
  const [isLoading, setIsLoading] = useState(true);

  const fetchGateData = useCallback(async () => {
    try {
      // Use midnight boundaries for gate access
      const boundaries = getStandardTimeBoundaries(selectedPeriod);
      
      // Get all gate transactions for the period
      const { data: gateTransactions } = await supabase
        .from('station_transactions')
        .select(`
          *,
          attendees!inner(first_name, last_name)
        `)
        .eq('station_type', 'main_gate')
        .in('transaction_type', ['gate_entry', 'gate_exit'])
        .gte('created_at', boundaries.start.toISOString())
        .lt('created_at', boundaries.end.toISOString())
        .order('created_at', { ascending: true });

      if (!gateTransactions) {
        setIsLoading(false);
        return;
      }

      // Count entries and exits
      const entries = gateTransactions.filter(t => t.transaction_type === 'gate_entry');
      const exits = gateTransactions.filter(t => t.transaction_type === 'gate_exit');

      // Calculate hourly activity
      const hourlyActivity = Array.from({ length: 24 }, (_, i) => ({
        hour: `${i}:00`,
        entries: 0,
        exits: 0
      }));

      gateTransactions.forEach(transaction => {
        const hour = new Date(transaction.created_at).getHours();
        if (transaction.transaction_type === 'gate_entry') {
          hourlyActivity[hour].entries++;
        } else {
          hourlyActivity[hour].exits++;
        }
      });

      // Find peak hour
      const peakHour = hourlyActivity
        .map(h => ({ hour: h.hour, activity: h.entries + h.exits }))
        .filter(h => h.activity > 0)
        .sort((a, b) => b.activity - a.activity)[0] || null;

      // Calculate current occupancy and on-site attendees
      const attendeeStatus = new Map<string, { lastTransaction: any; isOnSite: boolean }>();
      
      gateTransactions.forEach(transaction => {
        const attendeeId = transaction.attendee_id;
        const isEntry = transaction.transaction_type === 'gate_entry';
        
        attendeeStatus.set(attendeeId, {
          lastTransaction: transaction,
          isOnSite: isEntry
        });
      });

      // Get currently on-site attendees with details
      const onSiteAttendees = Array.from(attendeeStatus.entries())
        .filter(([_, status]) => status.isOnSite)
        .map(([attendeeId, status]) => {
          const transaction = status.lastTransaction;
          const entryTime = new Date(transaction.created_at);
          const durationMinutes = Math.floor((Date.now() - entryTime.getTime()) / (1000 * 60));
          
          return {
            name: `${transaction.attendees.first_name} ${transaction.attendees.last_name}`,
            rfid_uid: transaction.rfid_uid || 'Unknown',
            entry_time: transaction.created_at,
            duration_minutes: durationMinutes
          };
        })
        .sort((a, b) => b.duration_minutes - a.duration_minutes);

      // Calculate average visit duration from completed visits
      const completedVisits = new Map<string, Date>();
      let totalVisitMinutes = 0;
      let completedVisitCount = 0;

      gateTransactions.forEach(transaction => {
        const attendeeId = transaction.attendee_id;
        
        if (transaction.transaction_type === 'gate_entry') {
          completedVisits.set(attendeeId, new Date(transaction.created_at));
        } else if (transaction.transaction_type === 'gate_exit' && completedVisits.has(attendeeId)) {
          const entryTime = completedVisits.get(attendeeId)!;
          const exitTime = new Date(transaction.created_at);
          const visitMinutes = Math.floor((exitTime.getTime() - entryTime.getTime()) / (1000 * 60));
          totalVisitMinutes += visitMinutes;
          completedVisitCount++;
          completedVisits.delete(attendeeId);
        }
      });

      const averageVisitMinutes = completedVisitCount > 0 ? Math.round(totalVisitMinutes / completedVisitCount) : 0;

      setGateData({
        currentOccupancy: onSiteAttendees.length,
        dailyEntries: entries.length,
        dailyExits: exits.length,
        hourlyActivity,
        peakHour,
        onSiteAttendees,
        averageVisitMinutes
      });

    } catch (error) {
      console.error('Error fetching gate access data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [selectedPeriod]);

  useBackgroundRefresh({
    onRefresh: fetchGateData,
    refreshTrigger
  });

  const formatTime = (minutes: number): string => {
    if (minutes === 0) return '0m';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const formatHour = (hour: string): string => {
    const h = parseInt(hour.split(':')[0]);
    if (h === 0) return '12AM';
    if (h === 12) return '12PM';
    if (h > 12) return `${h - 12}PM`;
    return `${h}AM`;
  };

  const formatEntryTime = (timeString: string): string => {
    const date = new Date(timeString);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-6">
            <div className="animate-pulse space-y-4">
              <div className="h-6 bg-muted rounded w-1/2"></div>
              <div className="h-32 bg-muted rounded"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <UITooltipProvider>
      <div className="space-y-6">
        {/* Gate Access Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Users className="h-4 w-4" />
                Currently On-Site
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{gateData.currentOccupancy}</div>
              <div className="text-sm text-muted-foreground">Active visitors</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Shield className="h-4 w-4" />
                Gate Activity {formatTimePeriod(selectedPeriod)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-center">
                <div>
                  <div className="text-lg font-semibold text-success">{gateData.dailyEntries}</div>
                  <div className="text-xs text-muted-foreground">Entries</div>
                </div>
                <div>
                  <div className="text-lg font-semibold text-warning">{gateData.dailyExits}</div>
                  <div className="text-xs text-muted-foreground">Exits</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4" />
                Average Visit Time
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-info">{formatTime(gateData.averageVisitMinutes)}</div>
              <div className="text-sm text-muted-foreground">From completed visits</div>
            </CardContent>
          </Card>
        </div>

        {/* Hourly Activity Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Gate Activity Timeline
              </div>
              {gateData.peakHour && (
                <Badge variant="outline" className="text-xs">
                  Peak: {formatHour(gateData.peakHour.hour)} ({gateData.peakHour.activity} total)
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={gateData.hourlyActivity}>
                  <XAxis 
                    dataKey="hour" 
                    tick={{ fontSize: 12 }}
                    tickFormatter={formatHour}
                  />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip 
                    formatter={(value, name) => [value, name === 'entries' ? 'Entries' : 'Exits']}
                    labelFormatter={(hour) => `Time: ${formatHour(hour)}`}
                  />
                  <Bar 
                    dataKey="entries" 
                    fill="hsl(var(--success))" 
                    name="entries"
                    radius={[2, 2, 0, 0]}
                  />
                  <Bar 
                    dataKey="exits" 
                    fill="hsl(var(--warning))" 
                    name="exits"
                    radius={[2, 2, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Current Occupancy Table */}
        {gateData.onSiteAttendees.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Currently On-Site Attendees
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {gateData.onSiteAttendees.map((attendee, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                    <div>
                      <div className="font-medium">{attendee.name}</div>
                      <div className="text-sm text-muted-foreground">
                        RFID: {attendee.rfid_uid} • Entered: {formatEntryTime(attendee.entry_time)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">{formatTime(attendee.duration_minutes)}</div>
                      <div className="text-xs text-muted-foreground">on-site</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </UITooltipProvider>
  );
};