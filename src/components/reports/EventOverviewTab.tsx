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
  totalActivated: number;
  waiversSigned: number;
  waiversMissing: number;
  activationPercentage: number;
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
    totalActivated: 0,
    waiversSigned: 0,
    waiversMissing: 0,
    activationPercentage: 0
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
      const activatedAttendees = attendees?.filter(a => a.activated_at) || [];
      const totalActivated = activatedAttendees.length;
      const waiversSigned = attendees?.filter(a => a.waiver_signed === true).length || 0;
      const waiversMissing = totalRegistered - waiversSigned;
      const activationPercentage = totalRegistered > 0 ? Math.round((totalActivated / totalRegistered) * 100) : 0;

      setStats({
        totalRegistered,
        totalActivated,
        waiversSigned,
        waiversMissing,
        activationPercentage
      });

      // Generate real daily check-in data from actual timestamps
      const realDailyData: DailyCheckInData[] = [];
      
      if (activatedAttendees.length > 0) {
        // Group check-ins by date
        const activationsByDate = activatedAttendees.reduce((acc, attendee) => {
          if (attendee.activated_at) {
            const date = new Date(attendee.activated_at).toISOString().split('T')[0];
            acc[date] = (acc[date] || 0) + 1;
          }
          return acc;
        }, {} as Record<string, number>);

        // Convert to chart data format
        Object.entries(activationsByDate).forEach(([date, actual]) => {
          const dateObj = new Date(date);
          const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
          
          realDailyData.push({
            date,
            day: dayName,
            expected: actual as number, // Use actual as expected since we don't have expected data
            actual: actual as number
          });
        });

        // Sort by date
        realDailyData.sort((a, b) => a.date.localeCompare(b.date));
      }

      setDailyData(realDailyData);

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
    { metric: "Total Activated", value: stats.totalActivated },
    { metric: "Activation Percentage", value: `${stats.activationPercentage}%` },
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
    <div className="space-y-8" data-export-target>
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
          title="Total Activated"
          value={stats.totalActivated}
          subtitle={`${stats.activationPercentage}% of total`}
          icon={UserCheck}
          isLoading={isLoading}
          variant={stats.activationPercentage > 70 ? "success" : stats.activationPercentage > 40 ? "warning" : "error"}
        />
        <ScoreCard
          title="Activation Rate"
          value={`${stats.activationPercentage}%`}
          icon={Clock}
          isLoading={isLoading}
          variant={stats.activationPercentage > 70 ? "success" : "warning"}
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
        <CardContent className="pb-8">
          <div className="h-80 w-full">
            <ChartContainer config={chartConfig}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
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