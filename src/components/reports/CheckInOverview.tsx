import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Users, UserCheck, AlertTriangle, TrendingUp, Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface CheckInStats {
  totalExpected: number;
  checkedIn: number;
  pending: number;
  percentage: number;
  pendingIssues: number;
  activationBreakdown: {
    selfActivated: number;
    staffAssisted: number;
  };
  peakHour: string;
  arrivalDayBreakdown: {
    thursday: {
      expected: number;
      checkedIn: number;
      percentage: number;
    };
    friday: {
      expected: number;
      checkedIn: number;
      percentage: number;
    };
  };
}

// CheckInOverview component - displays daily check-in statistics
export const CheckInOverview = () => {
  const [stats, setStats] = useState<CheckInStats>({
    totalExpected: 0,
    checkedIn: 0,
    pending: 0,
    percentage: 0,
    pendingIssues: 0,
    activationBreakdown: {
      selfActivated: 0,
      staffAssisted: 0
    },
    peakHour: 'N/A',
    arrivalDayBreakdown: {
      thursday: { expected: 0, checkedIn: 0, percentage: 0 },
      friday: { expected: 0, checkedIn: 0, percentage: 0 }
    }
  });

  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Get total attendees and activated count with arrival day info
        const { data: attendees } = await supabase
          .from('attendees')
          .select('id, activated_at, created_at, arrival_window, early_access')
          .eq('registration_status', 'registered');

        if (!attendees) return;

        const totalExpected = attendees.length;
        const checkedIn = attendees.filter(a => a.activated_at).length;
        const pending = totalExpected - checkedIn;
        const percentage = totalExpected > 0 ? Math.round((checkedIn / totalExpected) * 100) : 0;

        // Get attendees checked in today for peak hour calculation
        const checkedInToday = attendees.filter(a => 
          a.activated_at && new Date(a.activated_at).toDateString() === new Date().toDateString()
        );

        // Get pending staff assistance requests
        const { data: assistanceRequests } = await supabase
          .from('staff_assistance_requests')
          .select('id')
          .in('status', ['open', 'in_progress']);

        const pendingIssues = assistanceRequests?.length || 0;

        // Get activation method breakdown
        const { data: activationData } = await supabase
          .from('station_transactions')
          .select('activation_method')
          .eq('transaction_type', 'activate')
          .not('activation_method', 'is', null);

        const selfActivated = activationData?.filter(a => a.activation_method === 'self').length || 0;
        const staffAssisted = activationData?.filter(a => a.activation_method === 'staff').length || 0;

        // Calculate arrival day breakdown
        const thursdayAttendees = attendees.filter(a => a.early_access === true || a.arrival_window === 'early');
        const fridayAttendees = attendees.filter(a => a.early_access === false || a.arrival_window === 'standard');
        
        const thursdayExpected = thursdayAttendees.length;
        const thursdayCheckedIn = thursdayAttendees.filter(a => a.activated_at).length;
        const thursdayPercentage = thursdayExpected > 0 ? Math.round((thursdayCheckedIn / thursdayExpected) * 100) : 0;
        
        const fridayExpected = fridayAttendees.length;
        const fridayCheckedIn = fridayAttendees.filter(a => a.activated_at).length; 
        const fridayPercentage = fridayExpected > 0 ? Math.round((fridayCheckedIn / fridayExpected) * 100) : 0;

        // Find peak hour
        const hourCounts = checkedInToday.reduce((acc, a) => {
          const hour = new Date(a.activated_at!).getHours();
          acc[hour] = (acc[hour] || 0) + 1;
          return acc;
        }, {} as Record<number, number>);

        const peakHourNum = Object.entries(hourCounts)
          .sort(([,a], [,b]) => b - a)[0]?.[0];
        
        let peakHour = 'N/A';
        if (peakHourNum) {
          const hour = parseInt(peakHourNum);
          peakHour = `${hour === 0 ? 12 : hour > 12 ? hour - 12 : hour}${hour >= 12 ? 'PM' : 'AM'}`;
        }

        setStats({
          totalExpected,
          checkedIn,
          pending,
          percentage,
          pendingIssues,
          activationBreakdown: {
            selfActivated,
            staffAssisted
          },
          peakHour,
          arrivalDayBreakdown: {
            thursday: {
              expected: thursdayExpected,
              checkedIn: thursdayCheckedIn,
              percentage: thursdayPercentage
            },
            friday: {
              expected: fridayExpected,
              checkedIn: fridayCheckedIn,
              percentage: fridayPercentage
            }
          }
        });
      } catch (error) {
        console.error('Error fetching check-in stats:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Daily Check-in Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-8 bg-muted rounded"></div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[1,2,3,4].map(i => (
                <div key={i} className="h-16 bg-muted rounded"></div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Daily Check-in Overview
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Key Metrics */}
        <div className="text-center space-y-2">
          <div className="text-3xl font-bold text-primary">
            {stats.checkedIn} / {stats.totalExpected}
          </div>
          <div className="text-lg text-muted-foreground">
            Attendees Checked In
          </div>
          <Progress value={stats.percentage} className="h-3" />
          <div className="text-sm text-muted-foreground">
            {stats.percentage}% Complete • {stats.pending} Remaining
          </div>
        </div>

        {/* Quick Stats Grid */}
        <TooltipProvider>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="text-center p-4 bg-success/10 rounded-lg cursor-help">
                  <div className="flex items-center justify-center gap-1 mb-2">
                    <UserCheck className="h-6 w-6 text-success" />
                    <Info className="h-3 w-3 text-muted-foreground" />
                  </div>
                  <div className="text-2xl font-bold text-success">{stats.checkedIn}</div>
                  <div className="text-sm text-muted-foreground">Checked In</div>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <div className="text-sm">
                  <p>Total attendees who have activated their wristbands</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Self-activated: {stats.activationBreakdown.selfActivated} | 
                    Staff-assisted: {stats.activationBreakdown.staffAssisted}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Thursday Early: {stats.arrivalDayBreakdown.thursday.checkedIn}/{stats.arrivalDayBreakdown.thursday.expected} ({stats.arrivalDayBreakdown.thursday.percentage}%) | 
                    Friday Standard: {stats.arrivalDayBreakdown.friday.checkedIn}/{stats.arrivalDayBreakdown.friday.expected} ({stats.arrivalDayBreakdown.friday.percentage}%)
                  </p>
                </div>
              </TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="text-center p-4 bg-warning/10 rounded-lg cursor-help">
                  <div className="flex items-center justify-center gap-1 mb-2">
                    <Users className="h-6 w-6 text-warning" />
                    <Info className="h-3 w-3 text-muted-foreground" />
                  </div>
                  <div className="text-2xl font-bold text-warning">{stats.pending}</div>
                  <div className="text-sm text-muted-foreground">Pending</div>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-sm">Attendees who haven't activated their wristbands yet</p>
              </TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="text-center p-4 bg-destructive/10 rounded-lg cursor-help">
                  <div className="flex items-center justify-center gap-1 mb-2">
                    <AlertTriangle className="h-6 w-6 text-destructive" />
                    <Info className="h-3 w-3 text-muted-foreground" />
                  </div>
                  <div className="text-2xl font-bold text-destructive">{stats.pendingIssues}</div>
                  <div className="text-sm text-muted-foreground">Pending Issues</div>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-sm">Open staff assistance requests requiring attention</p>
              </TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="text-center p-4 bg-primary/10 rounded-lg cursor-help">
                  <div className="flex items-center justify-center gap-1 mb-2">
                    <TrendingUp className="h-6 w-6 text-primary" />
                    <Info className="h-3 w-3 text-muted-foreground" />
                  </div>
                  <div className="text-2xl font-bold text-primary">{stats.peakHour}</div>
                  <div className="text-sm text-muted-foreground">Peak Hour</div>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-sm">Hour with the most attendee check-ins today</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </TooltipProvider>

        {/* Arrival Day Breakdown */}
        <div className="mt-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Arrival Day Breakdown
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="border-info/20 bg-info/5">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm font-medium text-info">Thursday Early Access</div>
                  <Badge variant="secondary" className="text-xs">
                    {stats.arrivalDayBreakdown.thursday.percentage}%
                  </Badge>
                </div>
                <div className="text-2xl font-bold text-info mb-2">
                  {stats.arrivalDayBreakdown.thursday.checkedIn} / {stats.arrivalDayBreakdown.thursday.expected}
                </div>
                <Progress 
                  value={stats.arrivalDayBreakdown.thursday.percentage} 
                  className="h-2 bg-info/10"
                />
                <div className="text-xs text-muted-foreground mt-1">
                  {stats.arrivalDayBreakdown.thursday.expected - stats.arrivalDayBreakdown.thursday.checkedIn} remaining
                </div>
              </CardContent>
            </Card>

            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm font-medium text-primary">Friday Standard</div>
                  <Badge variant="secondary" className="text-xs">
                    {stats.arrivalDayBreakdown.friday.percentage}%
                  </Badge>
                </div>
                <div className="text-2xl font-bold text-primary mb-2">
                  {stats.arrivalDayBreakdown.friday.checkedIn} / {stats.arrivalDayBreakdown.friday.expected}
                </div>
                <Progress 
                  value={stats.arrivalDayBreakdown.friday.percentage} 
                  className="h-2 bg-primary/10"
                />
                <div className="text-xs text-muted-foreground mt-1">
                  {stats.arrivalDayBreakdown.friday.expected - stats.arrivalDayBreakdown.friday.checkedIn} remaining
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};