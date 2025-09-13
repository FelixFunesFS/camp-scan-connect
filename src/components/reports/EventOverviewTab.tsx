import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScoreCard } from "./shared/ScoreCard";
import { ExportButton } from "./shared/ExportButton";
import { supabase } from "@/integrations/supabase/client";
import { 
  Users, 
  UserCheck, 
  FileText, 
  Clock,
  Calendar
} from "lucide-react";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  LineChart,
  Line
} from "recharts";

interface EventOverviewTabProps {
  isRefreshing: boolean;
}

interface OverviewStats {
  totalRegistered: number;
  totalCheckedIn: number;
  waiversSigned: number;
  waiversMissing: number;
  checkInPercentage: number;
}

interface DailyCheckInData {
  date: string;
  expected: number;
  actual: number;
  day: string;
}

export const EventOverviewTab: React.FC<EventOverviewTabProps> = ({ isRefreshing }) => {
  const [stats, setStats] = useState<OverviewStats>({
    totalRegistered: 0,
    totalCheckedIn: 0,
    waiversSigned: 0,
    waiversMissing: 0,
    checkInPercentage: 0
  });
  const [dailyData, setDailyData] = useState<DailyCheckInData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchOverviewData = async () => {
    try {
      setIsLoading(true);

      // Get total registered attendees
      const { data: attendees, error: attendeesError } = await supabase
        .from('attendees')
        .select('*');

      if (attendeesError) throw attendeesError;

      const totalRegistered = attendees?.length || 0;
      const checkedInAttendees = attendees?.filter(a => a.checked_in_at) || [];
      const totalCheckedIn = checkedInAttendees.length;
      const waiversSigned = attendees?.filter(a => a.waiver_signed).length || 0;
      const waiversMissing = totalRegistered - waiversSigned;
      const checkInPercentage = totalRegistered > 0 ? Math.round((totalCheckedIn / totalRegistered) * 100) : 0;

      setStats({
        totalRegistered,
        totalCheckedIn,
        waiversSigned,
        waiversMissing,
        checkInPercentage
      });

      // Generate daily check-in data (mock data for visualization)
      const mockDailyData: DailyCheckInData[] = [
        { date: "2025-04-25", day: "Fri", expected: 120, actual: 0 },
        { date: "2025-04-26", day: "Sat", expected: 800, actual: totalCheckedIn * 0.6 },
        { date: "2025-04-27", day: "Sun", expected: 200, actual: totalCheckedIn * 0.4 },
        { date: "2025-04-28", day: "Mon", expected: 80, actual: 0 }
      ];

      setDailyData(mockDailyData);

    } catch (error) {
      console.error("Error fetching overview data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOverviewData();
  }, []);

  useEffect(() => {
    if (isRefreshing) {
      fetchOverviewData();
    }
  }, [isRefreshing]);

  // Set up real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel('attendees-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'attendees'
      }, () => {
        fetchOverviewData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const chartConfig = {
    expected: {
      label: "Expected",
      color: "hsl(var(--primary))",
    },
    actual: {
      label: "Actual",
      color: "hsl(var(--secondary))",
    },
  };

  const exportData = [
    { metric: "Total Registered", value: stats.totalRegistered },
    { metric: "Total Checked In", value: stats.totalCheckedIn },
    { metric: "Check-in Percentage", value: `${stats.checkInPercentage}%` },
    { metric: "Waivers Signed", value: stats.waiversSigned },
    { metric: "Waivers Missing", value: stats.waiversMissing },
    ...dailyData.map(d => ({
      date: d.date,
      day: d.day,
      expected: d.expected,
      actual: d.actual
    }))
  ];

  return (
    <div className="space-y-6" data-export-target>
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-primary">Event Overview</h2>
          <p className="text-muted-foreground">Real-time registration and check-in metrics</p>
        </div>
        <ExportButton 
          data={exportData}
          filename="event-overview"
          title="Event Overview Report"
        />
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <ScoreCard
          title="Total Registered"
          value={stats.totalRegistered}
          icon={Users}
          isLoading={isLoading}
          variant="default"
        />
        <ScoreCard
          title="Total Checked In"
          value={stats.totalCheckedIn}
          subtitle={`${stats.checkInPercentage}% of total`}
          icon={UserCheck}
          isLoading={isLoading}
          variant={stats.checkInPercentage > 70 ? "success" : stats.checkInPercentage > 40 ? "warning" : "error"}
        />
        <ScoreCard
          title="Check-In Rate"
          value={`${stats.checkInPercentage}%`}
          icon={Clock}
          isLoading={isLoading}
          variant={stats.checkInPercentage > 70 ? "success" : "warning"}
        />
        <ScoreCard
          title="Waivers Signed"
          value={stats.waiversSigned}
          subtitle={`${stats.waiversMissing} missing`}
          icon={FileText}
          isLoading={isLoading}
          variant={stats.waiversMissing === 0 ? "success" : "warning"}
        />
        <ScoreCard
          title="Waivers Missing"
          value={stats.waiversMissing}
          icon={FileText}
          isLoading={isLoading}
          variant={stats.waiversMissing === 0 ? "success" : "error"}
        />
      </div>

      {/* Expected vs Actual Chart */}
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Expected vs Actual Arrivals
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80 w-full">
            <ChartContainer config={chartConfig}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis 
                    dataKey="day" 
                    tick={{ fontSize: 12 }}
                    tickLine={{ stroke: 'hsl(var(--muted-foreground))' }}
                  />
                  <YAxis 
                    tick={{ fontSize: 12 }}
                    tickLine={{ stroke: 'hsl(var(--muted-foreground))' }}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar 
                    dataKey="expected" 
                    fill="hsl(var(--primary))" 
                    name="Expected"
                    radius={[2, 2, 0, 0]}
                  />
                  <Bar 
                    dataKey="actual" 
                    fill="hsl(var(--secondary))" 
                    name="Actual"
                    radius={[2, 2, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </div>
        </CardContent>
      </Card>

      {/* Real-time Status */}
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="text-sm text-muted-foreground">
            Last Updated: {new Date().toLocaleString()}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            Real-time data updates enabled
          </div>
        </CardContent>
      </Card>
    </div>
  );
};