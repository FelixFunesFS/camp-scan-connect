import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Users, UserCheck, AlertTriangle, TrendingUp, Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getStandardTimeBoundaries, getCurrentETDate } from "@/utils/etTimezone";
import { PendingIssuesModal } from "./PendingIssuesModal";

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
interface CheckInOverviewProps {
  refreshTrigger?: number;
}

export const CheckInOverview = ({ refreshTrigger }: CheckInOverviewProps = {}) => {
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
  const [showPendingIssuesModal, setShowPendingIssuesModal] = useState(false);

  const fetchStats = async () => {
    try {
      // Get total attendees with RFID status - consider checked in if activated_at is set OR has active RFID
      const { data: attendees } = await supabase
        .from('attendees')
        .select(`
          id, activated_at, created_at, arrival_window, early_access,
          rfid_tags!inner(uid, status, activated_at)
        `)
        .eq('registration_status', 'registered')
        .eq('rfid_tags.status', 'active');

      const { data: allAttendees } = await supabase
        .from('attendees')
        .select('id, activated_at, arrival_window, early_access')
        .eq('registration_status', 'registered');

      if (!allAttendees) return;

      // Count attendees who are checked in (have activated_at OR active RFID)
      const attendeesWithActiveRfid = attendees?.map(a => a.id) || [];
      const checkedInAttendees = allAttendees.filter(a => 
        a.activated_at || attendeesWithActiveRfid.includes(a.id)
      );

      const totalExpected = allAttendees.length;
      const checkedIn = checkedInAttendees.length;
      const pending = totalExpected - checkedIn;
      const percentage = totalExpected > 0 ? Math.round((checkedIn / totalExpected) * 100) : 0;

        // Get attendees checked in today (ET timezone) for peak hour calculation
        const todayBoundaries = getStandardTimeBoundaries('today');
        const checkedInToday = checkedInAttendees.filter(a => {
          const activationDate = a.activated_at || 
            attendees?.find(att => att.id === a.id)?.rfid_tags?.[0]?.activated_at;
          return activationDate && 
            new Date(activationDate) >= todayBoundaries.start && 
            new Date(activationDate) < todayBoundaries.end;
        });

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

        // Calculate arrival day breakdown - Sept 25-26, 2025
        const thursdayAttendees = allAttendees.filter(a => a.early_access === true || a.arrival_window === 'early');
        const fridayAttendees = allAttendees.filter(a => a.early_access === false || a.arrival_window === 'standard');
        
        // Sept 25, 2025 boundaries (Thursday)
        const sept25Start = new Date('2025-09-25T00:00:00-04:00'); // Sept 25 midnight ET
        const sept25End = new Date('2025-09-26T00:00:00-04:00');   // Sept 26 midnight ET
        
        // Sept 26, 2025 boundaries (Friday) 
        const sept26Start = new Date('2025-09-26T00:00:00-04:00'); // Sept 26 midnight ET
        const sept26End = new Date('2025-09-27T00:00:00-04:00');   // Sept 27 midnight ET
        
        const thursdayExpected = thursdayAttendees.length;
        const thursdayCheckedIn = thursdayAttendees.filter(a => {
          const activationDate = a.activated_at || 
            attendees?.find(att => att.id === a.id)?.rfid_tags?.[0]?.activated_at;
          return activationDate && 
            new Date(activationDate) >= sept25Start && 
            new Date(activationDate) < sept25End;
        }).length;
        const thursdayPercentage = thursdayExpected > 0 ? Math.round((thursdayCheckedIn / thursdayExpected) * 100) : 0;
        
        const fridayExpected = fridayAttendees.length;
        const fridayCheckedIn = fridayAttendees.filter(a => {
          const activationDate = a.activated_at || 
            attendees?.find(att => att.id === a.id)?.rfid_tags?.[0]?.activated_at;
          return activationDate && 
            new Date(activationDate) >= sept26Start && 
            new Date(activationDate) < sept26End;
        }).length;
        const fridayPercentage = fridayExpected > 0 ? Math.round((fridayCheckedIn / fridayExpected) * 100) : 0;

        // Find peak hour using ET timezone conversion
        const hourCounts = checkedInToday.reduce((acc, a) => {
          const activationDate = a.activated_at || 
            attendees?.find(att => att.id === a.id)?.rfid_tags?.[0]?.activated_at;
          if (activationDate) {
            // Convert UTC time to ET hour for accurate hour calculation
            const utcDate = new Date(activationDate);
            const etHour = new Date(utcDate.toLocaleString("en-US", { timeZone: "America/New_York" })).getHours();
            acc[etHour] = (acc[etHour] || 0) + 1;
          }
          return acc;
        }, {} as Record<number, number>);

        const peakHourNum = Object.entries(hourCounts)
          .sort(([,a], [,b]) => b - a)[0]?.[0];
        
        let peakHour = 'N/A';
        if (peakHourNum) {
          const hour = parseInt(peakHourNum);
          peakHour = `${hour === 0 ? 12 : hour > 12 ? hour - 12 : hour}${hour >= 12 ? 'PM' : 'AM'} ET`;
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

  useEffect(() => {
    fetchStats();
  }, [refreshTrigger]);

  const handleIssuesUpdated = () => {
    fetchStats(); // Refresh stats when issues are updated
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
          Event Check-in Overview
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
          Event Check-in Overview
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
                <div 
                  className="text-center p-4 bg-destructive/10 rounded-lg cursor-pointer hover:bg-destructive/20 transition-colors"
                  onClick={() => setShowPendingIssuesModal(true)}
                >
                  <div className="flex items-center justify-center gap-1 mb-2">
                    <AlertTriangle className="h-6 w-6 text-destructive" />
                    <Info className="h-3 w-3 text-muted-foreground" />
                  </div>
                  <div className="text-2xl font-bold text-destructive">{stats.pendingIssues}</div>
                  <div className="text-sm text-muted-foreground">Pending Issues</div>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-sm">Click to view open staff assistance requests</p>
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

        <PendingIssuesModal
          open={showPendingIssuesModal}
          onOpenChange={setShowPendingIssuesModal}
          onIssuesUpdated={handleIssuesUpdated}
        />
      </CardContent>
    </Card>
  );
};