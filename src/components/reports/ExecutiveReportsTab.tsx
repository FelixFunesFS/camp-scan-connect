import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ScoreCard } from "./shared/ScoreCard";
import { ExportButton } from "./shared/ExportButton";
import { supabase } from "@/integrations/supabase/client";
import { 
  TrendingUp, 
  Users, 
  Package, 
  Utensils,
  Star,
  Calendar,
  Award,
  Download,
  BarChart3,
  PieChart,
  Activity,
  Info
} from "lucide-react";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  LineChart,
  Line
} from "recharts";
import jsPDF from "jspdf";

interface ExecutiveReportsTabProps {
  isRefreshing: boolean;
}

interface ExecutiveMetrics {
  // Core metrics
  totalAttendees: number;
  totalActivated: number;
  activationRate: number;
  
  // Premium metrics
  premiumPackages: number;
  standardPackages: number;
  premiumRate: number;
  earlyAccessAttendees: number;
  
  // Engagement metrics
  mealParticipation: number;
  drinkParticipation: number;
  equipmentUsage: number;
  totalActivities: number;
  totalActivityParticipants: number;
  engagementScore: number;
  
  // Financial projections (estimated)
  estimatedRevenue: number;
  premiumRevenue: number;
  standardRevenue: number;
}

interface TrendData {
  date: string;
  registrations: number;
  activations: number;
  engagement: number;
}

export const ExecutiveReportsTab: React.FC<ExecutiveReportsTabProps> = ({ isRefreshing }) => {
  const [metrics, setMetrics] = useState<ExecutiveMetrics>({
    totalAttendees: 0,
    totalActivated: 0,
    activationRate: 0,
    premiumPackages: 0,
    standardPackages: 0,
    premiumRate: 0,
    earlyAccessAttendees: 0,
    mealParticipation: 0,
    drinkParticipation: 0,
    equipmentUsage: 0,
    totalActivities: 0,
    totalActivityParticipants: 0,
    engagementScore: 0,
    estimatedRevenue: 0,
    premiumRevenue: 0,
    standardRevenue: 0
  });
  const [trendData, setTrendData] = useState<TrendData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchExecutiveMetrics = async () => {
    try {
      setIsLoading(true);

      // Get all required data
      const [
        { data: attendees, error: attendeesError },
        { data: transactions, error: transactionsError },
        { data: activities, error: activitiesError }
      ] = await Promise.all([
        supabase.from('attendees').select('*'),
        supabase.from('station_transactions').select('*'),
        supabase.from('activities').select('*')
      ]);

      if (attendeesError) throw attendeesError;
      if (transactionsError) throw transactionsError;
      if (activitiesError) throw activitiesError;

      // Core metrics
      const totalAttendees = attendees?.length || 0;
      const totalActivated = attendees?.filter(a => a.activated_at).length || 0;
      const activationRate = totalAttendees > 0 ? Math.round((totalActivated / totalAttendees) * 100) : 0;

      // Premium metrics
      const premiumPackages = attendees?.filter(a => 
        ['premium_power', 'glamping', 'cabin', 'staff', 'vendor'].includes(a.ticket_type)
      ).length || 0;
      const standardPackages = attendees?.filter(a => 
        ['dry_site', 'rv_site', 'day_pass'].includes(a.ticket_type)
      ).length || 0;
      const premiumRate = totalAttendees > 0 ? Math.round((premiumPackages / totalAttendees) * 100) : 0;
      const earlyAccessAttendees = attendees?.filter(a => 
        a.early_access || a.arrival_window === 'early'
      ).length || 0;

      // Engagement metrics
      const mealParticipation = transactions?.filter(t => t.station_type === 'meal').length || 0;
      const drinkParticipation = transactions?.filter(t => t.station_type === 'drinks').length || 0;
      const equipmentUsage = transactions?.filter(t => t.station_type === 'headphones').length || 0;
      const totalActivities = activities?.length || 0;
      const totalActivityParticipants = activities?.reduce((sum, a) => sum + (a.participant_count || 0), 0) || 0;

      // Calculate engagement score (weighted average)
      const totalInteractions = mealParticipation + drinkParticipation + equipmentUsage + totalActivityParticipants;
      const engagementScore = totalAttendees > 0 ? Math.round((totalInteractions / totalAttendees) * 10) : 0;

      // Financial projections (estimated based on ticket types)
      const ticketPrices = {
        'dry_site': 150,
        'premium_power': 200,
        'glamping': 350,
        'cabin': 450,
        'rv_site': 175,
        'day_pass': 75,
        'staff': 0,
        'vendor': 0
      };
      
      const estimatedRevenue = attendees?.reduce((total, attendee) => {
        const price = ticketPrices[attendee.ticket_type as keyof typeof ticketPrices] || 0;
        return total + price;
      }, 0) || 0;

      const premiumRevenue = attendees?.filter(a => 
        ['premium_power', 'glamping', 'cabin'].includes(a.ticket_type)
      ).reduce((total, attendee) => {
        const price = ticketPrices[attendee.ticket_type as keyof typeof ticketPrices] || 0;
        return total + price;
      }, 0) || 0;

      const standardRevenue = estimatedRevenue - premiumRevenue;

      // Generate trend data from activation timestamps
      const trendMap = new Map<string, { registrations: number; activations: number; engagement: number }>();
      
      // Initialize last 7 days
      const today = new Date();
      for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        trendMap.set(dateStr, { registrations: 0, activations: 0, engagement: 0 });
      }

      // Process activations by date
      attendees?.forEach(attendee => {
        const createdDate = new Date(attendee.created_at).toISOString().split('T')[0];
        const activatedDate = attendee.activated_at ? new Date(attendee.activated_at).toISOString().split('T')[0] : null;
        
        // Count registrations
        if (trendMap.has(createdDate)) {
          const current = trendMap.get(createdDate)!;
          current.registrations += 1;
          trendMap.set(createdDate, current);
        }
        
        // Count activations
        if (activatedDate && trendMap.has(activatedDate)) {
          const current = trendMap.get(activatedDate)!;
          current.activations += 1;
          trendMap.set(activatedDate, current);
        }
      });

      // Process transactions for engagement
      transactions?.forEach(transaction => {
        const date = new Date(transaction.created_at).toISOString().split('T')[0];
        if (trendMap.has(date)) {
          const current = trendMap.get(date)!;
          current.engagement += 1;
          trendMap.set(date, current);
        }
      });

      const trendArray = Array.from(trendMap.entries()).map(([date, data]) => ({
        date,
        registrations: data.registrations,
        activations: data.activations,
        engagement: data.engagement
      }));

      setMetrics({
        totalAttendees,
        totalActivated,
        activationRate,
        premiumPackages,
        standardPackages,
        premiumRate,
        earlyAccessAttendees,
        mealParticipation,
        drinkParticipation,
        equipmentUsage,
        totalActivities,
        totalActivityParticipants,
        engagementScore,
        estimatedRevenue,
        premiumRevenue,
        standardRevenue
      });

      setTrendData(trendArray);

    } catch (error) {
      console.error("Error fetching executive metrics:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchExecutiveMetrics();
  }, []);

  useEffect(() => {
    if (isRefreshing) {
      fetchExecutiveMetrics();
    }
  }, [isRefreshing]);

  // Set up real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel('executive-reports-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'attendees'
      }, () => {
        fetchExecutiveMetrics();
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'station_transactions'
      }, () => {
        fetchExecutiveMetrics();
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'activities'
      }, () => {
        fetchExecutiveMetrics();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const generateExecutivePDF = async () => {
    try {
      const pdf = new jsPDF();
      
      // Header
      pdf.setFontSize(20);
      pdf.setTextColor(2, 48, 71);
      pdf.text('Melanated Campout 2025', 20, 20);
      
      pdf.setFontSize(16);
      pdf.text('Executive Summary Report', 20, 32);
      
      pdf.setFontSize(10);
      pdf.setTextColor(100, 100, 100);
      pdf.text(`Generated: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`, 20, 42);

      // Executive Summary
      pdf.setFontSize(14);
      pdf.setTextColor(0, 0, 0);
      pdf.text('Executive Overview', 20, 58);
      
      let yPos = 70;
      const summaryData = [
        `Event Reach: ${metrics.totalAttendees.toLocaleString()} total attendees`,
        `Activation Success: ${metrics.activationRate}% check-in completion rate`,
        `Premium Market: ${metrics.premiumRate}% premium package adoption`,
        `Engagement Score: ${metrics.engagementScore}/10 average interactions per attendee`,
        `Revenue Projection: $${metrics.estimatedRevenue.toLocaleString()} estimated total revenue`,
        `Premium Revenue: $${metrics.premiumRevenue.toLocaleString()} (${Math.round((metrics.premiumRevenue / metrics.estimatedRevenue) * 100)}% of total)`
      ];

      pdf.setFontSize(11);
      summaryData.forEach((item) => {
        pdf.text(`• ${item}`, 25, yPos);
        yPos += 8;
      });

      // Key Performance Indicators
      yPos += 10;
      pdf.setFontSize(14);
      pdf.text('Key Performance Indicators', 20, yPos);
      
      yPos += 12;
      const kpiData = [
        ['Metric', 'Value', 'Target', 'Status'],
        ['Check-in Rate', `${metrics.activationRate}%`, '80%', metrics.activationRate >= 80 ? '✓' : '⚠'],
        ['Premium Adoption', `${metrics.premiumRate}%`, '30%', metrics.premiumRate >= 30 ? '✓' : '⚠'],
        ['Engagement Score', `${metrics.engagementScore}/10`, '7/10', metrics.engagementScore >= 7 ? '✓' : '⚠'],
        ['Service Utilization', `${metrics.mealParticipation + metrics.drinkParticipation}`, '-', '✓']
      ];

      pdf.setFontSize(9);
      kpiData.forEach((row, index) => {
        const x = 25;
        if (index === 0) {
          pdf.setFont(undefined, 'bold');
        } else {
          pdf.setFont(undefined, 'normal');
        }
        
        pdf.text(row[0], x, yPos);
        pdf.text(row[1], x + 50, yPos);
        pdf.text(row[2], x + 80, yPos);
        pdf.text(row[3], x + 110, yPos);
        yPos += 8;
      });

      // Strategic Insights
      yPos += 10;
      pdf.setFont(undefined, 'bold');
      pdf.setFontSize(14);
      pdf.text('Strategic Insights & Recommendations', 20, yPos);
      
      yPos += 12;
      pdf.setFont(undefined, 'normal');
      pdf.setFontSize(10);
      const insights = [
        `High-Value Audience: ${metrics.premiumRate}% premium package adoption indicates strong market positioning`,
        `Strong Engagement: ${metrics.engagementScore}/10 engagement score shows active community participation`,
        `Revenue Performance: $${(metrics.estimatedRevenue / 1000).toFixed(0)}K total revenue with ${Math.round((metrics.premiumRevenue / metrics.estimatedRevenue) * 100)}% from premium packages`,
        `Operational Excellence: ${metrics.mealParticipation + metrics.drinkParticipation} F&B interactions demonstrate smooth service delivery`,
        `Growth Opportunity: ${100 - metrics.activationRate}% activation opportunity for improved attendee experience`
      ];

      insights.forEach((insight) => {
        pdf.text(`• ${insight}`, 25, yPos);
        yPos += 10;
      });

      // Next page for detailed metrics
      pdf.addPage();
      
      // Detailed Metrics
      pdf.setFontSize(16);
      pdf.setTextColor(2, 48, 71);
      pdf.text('Detailed Performance Metrics', 20, 20);
      
      yPos = 35;
      pdf.setFontSize(12);
      pdf.setTextColor(0, 0, 0);
      
      const detailedMetrics = [
        ['Registration & Activation', [
          `Total Registrations: ${metrics.totalAttendees}`,
          `Completed Check-ins: ${metrics.totalActivated}`,
          `Activation Rate: ${metrics.activationRate}%`,
          `Early Access: ${metrics.earlyAccessAttendees} attendees`
        ]],
        ['Package Distribution', [
          `Premium Packages: ${metrics.premiumPackages} (${metrics.premiumRate}%)`,
          `Standard Packages: ${metrics.standardPackages} (${100 - metrics.premiumRate}%)`,
          `Premium Revenue: $${metrics.premiumRevenue.toLocaleString()}`,
          `Standard Revenue: $${metrics.standardRevenue.toLocaleString()}`
        ]],
        ['Service Utilization', [
          `Meal Services: ${metrics.mealParticipation} interactions`,
          `Beverage Services: ${metrics.drinkParticipation} interactions`,
          `Equipment Rentals: ${metrics.equipmentUsage} transactions`,
          `Activities: ${metrics.totalActivities} events, ${metrics.totalActivityParticipants} participants`
        ]]
      ];

      detailedMetrics.forEach(([category, items]) => {
        pdf.setFont(undefined, 'bold');
        pdf.text(category as string, 20, yPos);
        yPos += 8;
        
        pdf.setFont(undefined, 'normal');
        pdf.setFontSize(10);
        (items as string[]).forEach(item => {
          pdf.text(`  • ${item}`, 25, yPos);
          yPos += 6;
        });
        yPos += 5;
      });

      // Footer
      pdf.setFontSize(8);
      pdf.setTextColor(100, 100, 100);
      pdf.text('Melanated Campout 2025 - Confidential Executive Report', 20, 280);

      pdf.save('melanated-campout-executive-report.pdf');
    } catch (error) {
      console.error("Error generating executive report:", error);
    }
  };

  // Chart data
  const packageData = [
    { name: 'Premium Packages', value: metrics.premiumPackages, color: 'hsl(var(--primary))' },
    { name: 'Standard Packages', value: metrics.standardPackages, color: 'hsl(var(--secondary))' }
  ];

  const revenueData = [
    { name: 'Premium Revenue', value: metrics.premiumRevenue, color: 'hsl(var(--primary))' },
    { name: 'Standard Revenue', value: metrics.standardRevenue, color: 'hsl(var(--secondary))' }
  ];

  const engagementData = [
    { name: 'Meals', value: metrics.mealParticipation },
    { name: 'Drinks', value: metrics.drinkParticipation },
    { name: 'Equipment', value: metrics.equipmentUsage },
    { name: 'Activities', value: metrics.totalActivityParticipants }
  ];

  const chartConfig = {
    registrations: { label: "Registrations", color: "hsl(var(--primary))" },
    activations: { label: "Activations", color: "hsl(var(--secondary))" },
    engagement: { label: "Engagement", color: "hsl(var(--accent))" }
  };

  const exportData = [
    { metric: "Total Attendees", value: metrics.totalAttendees },
    { metric: "Activation Rate", value: `${metrics.activationRate}%` },
    { metric: "Premium Rate", value: `${metrics.premiumRate}%` },
    { metric: "Engagement Score", value: `${metrics.engagementScore}/10` },
    { metric: "Estimated Revenue", value: `$${metrics.estimatedRevenue.toLocaleString()}` },
    { metric: "Premium Revenue", value: `$${metrics.premiumRevenue.toLocaleString()}` },
    { metric: "Standard Revenue", value: `$${metrics.standardRevenue.toLocaleString()}` }
  ];

  return (
    <TooltipProvider>
      <div className="space-y-6" data-export-target>
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-primary">📈 Executive Reports</h2>
            <p className="text-muted-foreground">High-level insights and sponsor impact metrics</p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={generateExecutivePDF}
              className="bg-primary hover:bg-primary/90"
            >
              <Download className="h-4 w-4 mr-2" />
              Executive PDF
            </Button>
            <ExportButton 
              data={exportData}
              filename="executive-report"
              title="Executive Report"
            />
          </div>
        </div>

        {/* Executive Summary */}
        <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-secondary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-primary">
              <Award className="h-5 w-5" />
              Executive Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div>
                    <ScoreCard
                      title="Event Reach"
                      value={metrics.totalAttendees}
                      subtitle="total attendees"
                      icon={Users}
                      isLoading={isLoading}
                      variant="default"
                    />
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Total number of registered attendees for the event</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <div>
                    <ScoreCard
                      title="Activation Success"
                      value={`${metrics.activationRate}%`}
                      subtitle="check-in completion"
                      icon={TrendingUp}
                      isLoading={isLoading}
                      variant={metrics.activationRate > 70 ? "success" : "warning"}
                    />
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Percentage of attendees who have successfully checked in</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <div>
                    <ScoreCard
                      title="Premium Market"
                      value={`${metrics.premiumRate}%`}
                      subtitle={`${metrics.premiumPackages} premium packages`}
                      icon={Star}
                      isLoading={isLoading}
                      variant="success"
                    />
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Percentage of attendees who purchased premium experiences</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <div>
                    <ScoreCard
                      title="Engagement Score"
                      value={`${metrics.engagementScore}/10`}
                      subtitle="avg interactions"
                      icon={Activity}
                      isLoading={isLoading}
                      variant={metrics.engagementScore > 7 ? "success" : "warning"}
                    />
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Average number of service interactions per attendee</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </CardContent>
        </Card>

        {/* Financial Overview */}
        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Financial Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div>
                    <ScoreCard
                      title="Total Revenue"
                      value={`$${(metrics.estimatedRevenue / 1000).toFixed(0)}K`}
                      subtitle="projected"
                      icon={TrendingUp}
                      isLoading={isLoading}
                      variant="success"
                    />
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Estimated total revenue from ticket sales</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <div>
                    <ScoreCard
                      title="Premium Revenue"
                      value={`$${(metrics.premiumRevenue / 1000).toFixed(0)}K`}
                      subtitle={`${Math.round((metrics.premiumRevenue / metrics.estimatedRevenue) * 100)}% of total`}
                      icon={Star}
                      isLoading={isLoading}
                      variant="success"
                    />
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Revenue generated from premium ticket packages</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <div>
                    <ScoreCard
                      title="Standard Revenue"
                      value={`$${(metrics.standardRevenue / 1000).toFixed(0)}K`}
                      subtitle="base packages"
                      icon={Package}
                      isLoading={isLoading}
                      variant="default"
                    />
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Revenue from standard ticket packages</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </CardContent>
        </Card>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Trend Analysis */}
          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                7-Day Trend Analysis
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80 w-full">
                <ChartContainer config={chartConfig}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trendData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                      <XAxis 
                        dataKey="date" 
                        tick={{ fontSize: 10 }}
                        tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      />
                      <YAxis tick={{ fontSize: 12 }} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Line
                        type="monotone"
                        dataKey="registrations"
                        stroke="hsl(var(--primary))"
                        strokeWidth={2}
                        name="Registrations"
                      />
                      <Line
                        type="monotone"
                        dataKey="activations"
                        stroke="hsl(var(--secondary))"
                        strokeWidth={2}
                        name="Activations"
                      />
                      <Line
                        type="monotone"
                        dataKey="engagement"
                        stroke="hsl(var(--accent))"
                        strokeWidth={2}
                        name="Engagement"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </div>
            </CardContent>
          </Card>

          {/* Revenue Distribution */}
          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChart className="h-5 w-5 text-primary" />
                Revenue Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPieChart>
                    <Pie
                      data={revenueData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: $${(value / 1000).toFixed(0)}K`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {revenueData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <ChartTooltip 
                      formatter={(value: number) => [`$${value.toLocaleString()}`, 'Revenue']}
                    />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Service Engagement Breakdown */}
        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Utensils className="h-5 w-5 text-primary" />
              Service Engagement Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={engagementData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <ChartTooltip />
                  <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Key Insights */}
        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-primary">
              <Award className="h-5 w-5" />
              Strategic Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h4 className="font-semibold text-primary">Market Position</h4>
                <div className="space-y-3">
                  <div className="p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg">
                    <div className="font-medium text-green-800 dark:text-green-200">Premium Market Penetration</div>
                    <div className="text-sm text-green-600 dark:text-green-300">
                      {metrics.premiumRate}% premium package adoption shows strong market positioning
                    </div>
                  </div>
                  <div className="p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <div className="font-medium text-blue-800 dark:text-blue-200">Revenue Performance</div>
                    <div className="text-sm text-blue-600 dark:text-blue-300">
                      ${(metrics.estimatedRevenue / 1000).toFixed(0)}K total with {Math.round((metrics.premiumRevenue / metrics.estimatedRevenue) * 100)}% from premium
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-semibold text-primary">Operational Excellence</h4>
                <div className="space-y-3">
                  <div className="p-3 bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800 rounded-lg">
                    <div className="font-medium text-purple-800 dark:text-purple-200">High Engagement</div>
                    <div className="text-sm text-purple-600 dark:text-purple-300">
                      {metrics.engagementScore}/10 engagement score shows active participation
                    </div>
                  </div>
                  <div className="p-3 bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded-lg">
                    <div className="font-medium text-orange-800 dark:text-orange-200">Service Delivery</div>
                    <div className="text-sm text-orange-600 dark:text-orange-300">
                      {(metrics.mealParticipation + metrics.drinkParticipation).toLocaleString()} total F&B interactions
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
};