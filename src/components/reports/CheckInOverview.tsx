import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Users, UserCheck, Clock, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface CheckInStats {
  totalExpected: number;
  checkedIn: number;
  pending: number;
  percentage: number;
  avgCheckInTime: string;
  peakHour: string;
}

export const CheckInOverview = () => {
  const [stats, setStats] = useState<CheckInStats>({
    totalExpected: 0,
    checkedIn: 0,
    pending: 0,
    percentage: 0,
    avgCheckInTime: '0:00',
    peakHour: 'N/A'
  });

  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Get total attendees and activated count
        const { data: attendees } = await supabase
          .from('attendees')
          .select('id, activated_at, created_at')
          .eq('registration_status', 'registered');

        if (!attendees) return;

        const totalExpected = attendees.length;
        const checkedIn = attendees.filter(a => a.activated_at).length;
        const pending = totalExpected - checkedIn;
        const percentage = totalExpected > 0 ? Math.round((checkedIn / totalExpected) * 100) : 0;

        // Calculate average check-in time (simplified)
        const checkedInToday = attendees.filter(a => 
          a.activated_at && new Date(a.activated_at).toDateString() === new Date().toDateString()
        );

        let avgCheckInTime = '0:00';
        let peakHour = 'N/A';

        if (checkedInToday.length > 0) {
          // Calculate average time from registration to activation
          const times = checkedInToday
            .filter(a => a.activated_at && a.created_at)
            .map(a => {
              const created = new Date(a.created_at).getTime();
              const activated = new Date(a.activated_at!).getTime();
              return (activated - created) / (1000 * 60); // minutes
            });

          if (times.length > 0) {
            const avgMinutes = Math.round(times.reduce((a, b) => a + b) / times.length);
            avgCheckInTime = `${Math.floor(avgMinutes / 60)}:${(avgMinutes % 60).toString().padStart(2, '0')}`;
          }

          // Find peak hour
          const hourCounts = checkedInToday.reduce((acc, a) => {
            const hour = new Date(a.activated_at!).getHours();
            acc[hour] = (acc[hour] || 0) + 1;
            return acc;
          }, {} as Record<number, number>);

          const peakHourNum = Object.entries(hourCounts)
            .sort(([,a], [,b]) => b - a)[0]?.[0];
          
          if (peakHourNum) {
            const hour = parseInt(peakHourNum);
            peakHour = `${hour === 0 ? 12 : hour > 12 ? hour - 12 : hour}${hour >= 12 ? 'PM' : 'AM'}`;
          }
        }

        setStats({
          totalExpected,
          checkedIn,
          pending,
          percentage,
          avgCheckInTime,
          peakHour
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
          <div className="text-center p-4 bg-success/10 rounded-lg">
            <UserCheck className="h-6 w-6 text-success mx-auto mb-2" />
            <div className="text-2xl font-bold text-success">{stats.checkedIn}</div>
            <div className="text-sm text-muted-foreground">Checked In</div>
          </div>
          
          <div className="text-center p-4 bg-warning/10 rounded-lg">
            <Users className="h-6 w-6 text-warning mx-auto mb-2" />
            <div className="text-2xl font-bold text-warning">{stats.pending}</div>
            <div className="text-sm text-muted-foreground">Pending</div>
          </div>
          
          <div className="text-center p-4 bg-info/10 rounded-lg">
            <Clock className="h-6 w-6 text-info mx-auto mb-2" />
            <div className="text-2xl font-bold text-info">{stats.avgCheckInTime}</div>
            <div className="text-sm text-muted-foreground">Avg Check-in Time</div>
          </div>
          
          <div className="text-center p-4 bg-primary/10 rounded-lg">
            <TrendingUp className="h-6 w-6 text-primary mx-auto mb-2" />
            <div className="text-2xl font-bold text-primary">{stats.peakHour}</div>
            <div className="text-sm text-muted-foreground">Peak Hour</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};