import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ScoreCard } from "./shared/ScoreCard";
import { ExportButton } from "./shared/ExportButton";
import { ResponsiveChartContainer } from "./shared/ResponsiveChartContainer";
import { supabase } from "@/integrations/supabase/client";
import { 
  Users, 
  UserCheck, 
  FileText,
  Package,
  TrendingUp,
  Eye,
  EyeOff,
  Calendar,
  Info
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
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from "recharts";

interface EventAnalyticsTabProps {
  isRefreshing: boolean;
}

interface AnalyticsData {
  totalRegistered: number;
  totalActivated: number;
  waiversSigned: number;
  waiversMissing: number;
  activationPercentage: number;
  packageStats: Record<string, { total: number; active: number; inactive: number }>;
  dailyData: Array<{ date: string; expected: number; actual: number; day: string }>;
}

export const EventAnalyticsTab: React.FC<EventAnalyticsTabProps> = ({ isRefreshing }) => {
  const [data, setData] = useState<AnalyticsData>({
    totalRegistered: 0,
    totalActivated: 0,
    waiversSigned: 0,
    waiversMissing: 0,
    activationPercentage: 0,
    packageStats: {},
    dailyData: []
  });
  const [isLoading, setIsLoading] = useState(true);
  const [visibleSeries, setVisibleSeries] = useState({
    expected: true,
    actual: true,
    active: true,
    inactive: true
  });

  const fetchAnalyticsData = async () => {
    try {
      setIsLoading(true);

      // Get attendees data
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

      // Process package statistics
      const packageStats: Record<string, { total: number; active: number; inactive: number }> = {};
      
      attendees?.forEach(attendee => {
        const ticketType = attendee.ticket_type;
        
        if (!packageStats[ticketType]) {
          packageStats[ticketType] = { total: 0, active: 0, inactive: 0 };
        }
        
        packageStats[ticketType].total++;
        if (attendee.activated_at) {
          packageStats[ticketType].active++;
        } else {
          packageStats[ticketType].inactive++;
        }
      });

      // Generate daily check-in data
      const dailyData: Array<{ date: string; expected: number; actual: number; day: string }> = [];
      
      if (activatedAttendees.length > 0) {
        const activationsByDate = activatedAttendees.reduce((acc, attendee) => {
          if (attendee.activated_at) {
            const date = new Date(attendee.activated_at).toISOString().split('T')[0];
            acc[date] = (acc[date] || 0) + 1;
          }
          return acc;
        }, {} as Record<string, number>);

        Object.entries(activationsByDate).forEach(([date, actual]) => {
          const dateObj = new Date(date);
          const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
          
          dailyData.push({
            date,
            day: dayName,
            expected: actual as number,
            actual: actual as number
          });
        });

        dailyData.sort((a, b) => a.date.localeCompare(b.date));
      }

      setData({
        totalRegistered,
        totalActivated,
        waiversSigned,
        waiversMissing,
        activationPercentage,
        packageStats,
        dailyData
      });

    } catch (error) {
      console.error("Error fetching analytics data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalyticsData();
  }, []);

  useEffect(() => {
    if (isRefreshing) {
      fetchAnalyticsData();
    }
  }, [isRefreshing]);

  // Set up real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel('event-analytics-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'attendees'
      }, () => {
        fetchAnalyticsData();
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
    active: {
      label: "Active",
      color: "hsl(var(--secondary))",
    },
    inactive: {
      label: "Inactive",
      color: "hsl(var(--muted-foreground))",
    },
  };

  // Prepare chart data with filtering
  const packageChartData = Object.entries(data.packageStats).map(([type, stats]) => ({
    name: type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
    total: stats.total,
    ...(visibleSeries.active && { active: stats.active }),
    ...(visibleSeries.inactive && { inactive: stats.inactive })
  }));

  const pieData = Object.entries(data.packageStats).map(([type, stats], index) => ({
    name: type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
    value: stats.total,
    fill: `hsl(var(--primary) / ${1 - index * 0.1})`
  }));

  const filteredDailyData = data.dailyData.map(item => ({
    ...item,
    ...(visibleSeries.expected && { expected: item.expected }),
    ...(visibleSeries.actual && { actual: item.actual })
  }));

  const toggleSeries = (series: keyof typeof visibleSeries) => {
    setVisibleSeries(prev => ({ ...prev, [series]: !prev[series] }));
  };

  const exportData = [
    { metric: "Total Registered", value: data.totalRegistered },
    { metric: "Total Activated", value: data.totalActivated },
    { metric: "Activation Percentage", value: `${data.activationPercentage}%` },
    { metric: "Waivers Signed", value: data.waiversSigned },
    { metric: "Waivers Missing", value: data.waiversMissing },
    ...Object.entries(data.packageStats).map(([type, stats]) => ({
      packageType: type,
      total: stats.total,
      active: stats.active,
      inactive: stats.inactive,
      utilization: `${stats.total > 0 ? Math.round((stats.active / stats.total) * 100) : 0}%`
    }))
  ];

  return (
    <TooltipProvider>
      <div className="space-y-6" data-export-target>
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-primary">📊 Event Analytics</h2>
            <p className="text-muted-foreground">Registration insights and package utilization</p>
          </div>
          <ExportButton 
            data={exportData}
            filename="event-analytics"
            title="Event Analytics Report"
          />
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Tooltip>
            <TooltipTrigger asChild>
              <div>
                <ScoreCard
                  title="Total Registered"
                  value={data.totalRegistered}
                  icon={Users}
                  isLoading={isLoading}
                  variant="default"
                />
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Total number of attendees registered for the event</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <div>
                <ScoreCard
                  title="Activated"
                  value={data.totalActivated}
                  subtitle={`${data.activationPercentage}% of total`}
                  icon={UserCheck}
                  isLoading={isLoading}
                  variant={data.activationPercentage > 70 ? "success" : data.activationPercentage > 40 ? "warning" : "error"}
                />
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Attendees who have completed check-in and received RFID</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <div>
                <ScoreCard
                  title="Activation Rate"
                  value={`${data.activationPercentage}%`}
                  icon={TrendingUp}
                  isLoading={isLoading}
                  variant={data.activationPercentage > 70 ? "success" : "warning"}
                />
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Percentage of registered attendees who have checked in</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <div>
                <ScoreCard
                  title="Waivers Signed"
                  value={data.waiversSigned}
                  subtitle={`${data.waiversMissing} missing`}
                  icon={FileText}
                  isLoading={isLoading}
                  variant={data.waiversMissing === 0 ? "success" : "warning"}
                />
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Legal waivers completed by attendees</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <div>
                <ScoreCard
                  title="Package Types"
                  value={Object.keys(data.packageStats).length}
                  subtitle="ticket varieties"
                  icon={Package}
                  isLoading={isLoading}
                  variant="default"
                />
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Different ticket package types available</p>
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Daily Check-ins Chart */}
          <Card className="border-primary/20">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  Daily Check-ins
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Click legend items to show/hide data series</p>
                    </TooltipContent>
                  </Tooltip>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant={visibleSeries.expected ? "default" : "outline"}
                      onClick={() => toggleSeries('expected')}
                      className="h-6 px-2 text-xs"
                    >
                      <Eye className="h-3 w-3 mr-1" />
                      Expected
                    </Button>
                    <Button
                      size="sm"
                      variant={visibleSeries.actual ? "default" : "outline"}
                      onClick={() => toggleSeries('actual')}
                      className="h-6 px-2 text-xs"
                    >
                      <Eye className="h-3 w-3 mr-1" />
                      Actual
                    </Button>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pb-4">
              <div className="h-[240px] md:h-[320px] w-full">
                <ChartContainer config={chartConfig}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={filteredDailyData} margin={{ top: 20, right: 20, left: 10, bottom: 20 }}>
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
                      {visibleSeries.expected && (
                        <Bar 
                          dataKey="expected" 
                          fill="hsl(var(--primary))" 
                          name="Expected"
                          radius={[2, 2, 0, 0]}
                        />
                      )}
                      {visibleSeries.actual && (
                        <Bar 
                          dataKey="actual" 
                          fill="hsl(var(--secondary))" 
                          name="Actual"
                          radius={[2, 2, 0, 0]}
                        />
                      )}
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </div>
            </CardContent>
          </Card>

          {/* Package Distribution */}
          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5 text-primary" />
                Package Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[240px] md:h-[320px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <ChartTooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Package Status Breakdown */}
        <Card className="border-primary/20">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Package Activation Status
              </CardTitle>
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant={visibleSeries.active ? "default" : "outline"}
                  onClick={() => toggleSeries('active')}
                  className="h-6 px-2 text-xs"
                >
                  {visibleSeries.active ? <Eye className="h-3 w-3 mr-1" /> : <EyeOff className="h-3 w-3 mr-1" />}
                  Active
                </Button>
                <Button
                  size="sm"
                  variant={visibleSeries.inactive ? "default" : "outline"}
                  onClick={() => toggleSeries('inactive')}
                  className="h-6 px-2 text-xs"
                >
                  {visibleSeries.inactive ? <Eye className="h-3 w-3 mr-1" /> : <EyeOff className="h-3 w-3 mr-1" />}
                  Inactive
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveChartContainer
              data={packageChartData}
              chartType="bar"
              showTooltip={true}
            >
              <BarChart data={packageChartData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="name" />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                {visibleSeries.active && <Bar dataKey="active" stackId="a" fill="hsl(var(--secondary))" name="Active" />}
                {visibleSeries.inactive && <Bar dataKey="inactive" stackId="a" fill="hsl(var(--muted-foreground))" name="Inactive" />}
              </BarChart>
            </ResponsiveChartContainer>
          </CardContent>
        </Card>

        {/* Live Data Status */}
        <Card className="border-primary/20">
          <CardContent className="py-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              Real-time data updates enabled • Last updated: {new Date().toLocaleString()}
            </div>
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
};