import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  Download
} from "lucide-react";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid
} from "recharts";
import jsPDF from "jspdf";

interface SponsorImpactTabProps {
  isRefreshing: boolean;
}

interface SponsorMetrics {
  totalAttendees: number;
  premiumPackages: number;
  standardPackages: number;
  earlyAccessAttendees: number;
  mealParticipation: number;
  drinkParticipation: number;
  equipmentUsage: number;
  engagementRate: number;
}

export const SponsorImpactTab: React.FC<SponsorImpactTabProps> = ({ isRefreshing }) => {
  const [metrics, setMetrics] = useState<SponsorMetrics>({
    totalAttendees: 0,
    premiumPackages: 0,
    standardPackages: 0,
    earlyAccessAttendees: 0,
    mealParticipation: 0,
    drinkParticipation: 0,
    equipmentUsage: 0,
    engagementRate: 0
  });
  const [isLoading, setIsLoading] = useState(true);

  const fetchSponsorMetrics = async () => {
    try {
      setIsLoading(true);

      // Get attendee data
      const { data: attendees, error: attendeesError } = await supabase
        .from('attendees')
        .select('*');

      if (attendeesError) throw attendeesError;

      // Get station transactions
      const { data: transactions, error: transactionsError } = await supabase
        .from('station_transactions')
        .select('*');

      if (transactionsError) throw transactionsError;

      const totalAttendees = attendees?.length || 0;
      const premiumPackages = attendees?.filter(a => 
        ['premium_power', 'staff', 'vendor'].includes(a.ticket_type)
      ).length || 0;
      const standardPackages = attendees?.filter(a => 
        ['dry_site', 'day_pass'].includes(a.ticket_type)
      ).length || 0;
      const earlyAccessAttendees = attendees?.filter(a => a.early_access || a.arrival_window === 'early').length || 0;

      // Calculate engagement metrics
      const mealParticipation = transactions?.filter(t => t.station_type === 'meal').length || 0;
      const drinkParticipation = transactions?.filter(t => t.station_type === 'drinks').length || 0;
      const equipmentUsage = transactions?.filter(t => t.station_type === 'headphones').length || 0;

      // Calculate overall engagement rate
      const totalActivities = mealParticipation + drinkParticipation + equipmentUsage;
      const engagementRate = totalAttendees > 0 ? Math.round((totalActivities / totalAttendees) * 100) : 0;

      setMetrics({
        totalAttendees,
        premiumPackages,
        standardPackages,
        earlyAccessAttendees,
        mealParticipation,
        drinkParticipation,
        equipmentUsage,
        engagementRate
      });

    } catch (error) {
      console.error("Error fetching sponsor metrics:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSponsorMetrics();
  }, []);

  useEffect(() => {
    if (isRefreshing) {
      fetchSponsorMetrics();
    }
  }, [isRefreshing]);

  // Set up real-time subscription
  useEffect(() => {
    const attendeesChannel = supabase
      .channel('sponsor-attendees-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'attendees'
      }, () => {
        fetchSponsorMetrics();
      })
      .subscribe();

    const transactionsChannel = supabase
      .channel('sponsor-transactions-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'station_transactions'
      }, () => {
        fetchSponsorMetrics();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(attendeesChannel);
      supabase.removeChannel(transactionsChannel);
    };
  }, []);

  // Prepare chart data
  const packageData = [
    { name: 'Premium Packages', value: metrics.premiumPackages, color: '#FB8500' },
    { name: 'Standard Packages', value: metrics.standardPackages, color: '#023047' }
  ];

  const engagementData = [
    { name: 'Meal Services', value: metrics.mealParticipation, color: '#FB8500' },
    { name: 'Beverage Services', value: metrics.drinkParticipation, color: '#023047' },
    { name: 'Equipment Usage', value: metrics.equipmentUsage, color: '#8ECAE6' }
  ];

  const COLORS = ['#FB8500', '#023047', '#8ECAE6', '#FFB703', '#219EBC'];

  const generateSponsorReport = async () => {
    try {
      const pdf = new jsPDF();
      
      // Header
      pdf.setFontSize(18);
      pdf.setTextColor(2, 48, 71); // Primary color
      pdf.text('Melanated Campout 2025', 20, 20);
      
      pdf.setFontSize(14);
      pdf.text('Sponsor Impact Report', 20, 30);
      
      pdf.setFontSize(10);
      pdf.setTextColor(100, 100, 100);
      pdf.text(`Generated: ${new Date().toLocaleDateString()}`, 20, 40);

      // Executive Summary
      pdf.setFontSize(12);
      pdf.setTextColor(0, 0, 0);
      pdf.text('Executive Summary', 20, 55);
      
      let yPos = 65;
      const summaryData = [
        `Total Event Attendees: ${metrics.totalAttendees.toLocaleString()}`,
        `Premium Package Holders: ${metrics.premiumPackages.toLocaleString()} (${metrics.totalAttendees > 0 ? Math.round((metrics.premiumPackages / metrics.totalAttendees) * 100) : 0}%)`,
        `Early Access Participants: ${metrics.earlyAccessAttendees.toLocaleString()}`,
        `Overall Engagement Rate: ${metrics.engagementRate}%`,
        `Meal Service Participation: ${metrics.mealParticipation.toLocaleString()}`,
        `Beverage Service Participation: ${metrics.drinkParticipation.toLocaleString()}`,
        `Equipment Usage: ${metrics.equipmentUsage.toLocaleString()}`
      ];

      pdf.setFontSize(9);
      summaryData.forEach((item) => {
        pdf.text(item, 25, yPos);
        yPos += 8;
      });

      // Key Insights
      yPos += 10;
      pdf.setFontSize(12);
      pdf.setTextColor(0, 0, 0);
      pdf.text('Key Sponsor Value Propositions', 20, yPos);
      
      yPos += 10;
      const insights = [
        `• High-value audience with ${Math.round((metrics.premiumPackages / metrics.totalAttendees) * 100)}% premium package adoption`,
        `• Strong engagement with ${metrics.engagementRate}% participation rate across services`,
        `• Premium experience focus: ${metrics.earlyAccessAttendees} early access attendees`,
        `• Active community: ${metrics.mealParticipation + metrics.drinkParticipation} food & beverage interactions`,
        `• Tech-savvy audience: ${metrics.equipmentUsage} equipment rentals`
      ];

      pdf.setFontSize(9);
      insights.forEach((item) => {
        pdf.text(item, 25, yPos);
        yPos += 8;
      });

      // Package Breakdown
      yPos += 10;
      pdf.setFontSize(12);
      pdf.text('Package Distribution Analysis', 20, yPos);
      
      yPos += 10;
      pdf.setFontSize(9);
      pdf.text(`Premium Packages (${metrics.premiumPackages}): High-value attendees with enhanced experiences`, 25, yPos);
      yPos += 6;
      pdf.text(`Standard Packages (${metrics.standardPackages}): Core audience with strong engagement`, 25, yPos);

      // Footer
      pdf.setFontSize(8);
      pdf.setTextColor(100, 100, 100);
      pdf.text('Melanated Campout 2025 - Confidential Sponsor Report', 20, 280);

      pdf.save('melanated-campout-sponsor-impact-report.pdf');
    } catch (error) {
      console.error("Error generating sponsor report:", error);
    }
  };

  const exportData = [
    { metric: "Total Attendees", value: metrics.totalAttendees },
    { metric: "Premium Packages", value: metrics.premiumPackages },
    { metric: "Standard Packages", value: metrics.standardPackages },
    { metric: "Early Access Attendees", value: metrics.earlyAccessAttendees },
    { metric: "Engagement Rate", value: `${metrics.engagementRate}%` },
    { metric: "Meal Participation", value: metrics.mealParticipation },
    { metric: "Drink Participation", value: metrics.drinkParticipation },
    { metric: "Equipment Usage", value: metrics.equipmentUsage }
  ];

  return (
    <div className="space-y-6" data-export-target>
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-primary">Sponsor Impact Report</h2>
          <p className="text-muted-foreground">Executive summary and engagement metrics for sponsors</p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={generateSponsorReport}
            className="bg-primary hover:bg-primary/90"
          >
            <Download className="h-4 w-4 mr-2" />
            Sponsor PDF
          </Button>
          <ExportButton 
            data={exportData}
            filename="sponsor-impact-report"
            title="Sponsor Impact Report"
          />
        </div>
      </div>

      {/* Executive Summary Cards */}
      <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-secondary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-primary">
            <Award className="h-5 w-5" />
            Executive Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <ScoreCard
              title="Total Attendees"
              value={metrics.totalAttendees}
              subtitle="Event reach"
              icon={Users}
              isLoading={isLoading}
              variant="default"
            />
            <ScoreCard
              title="Premium Audience"
              value={`${metrics.totalAttendees > 0 ? Math.round((metrics.premiumPackages / metrics.totalAttendees) * 100) : 0}%`}
              subtitle={`${metrics.premiumPackages} premium packages`}
              icon={Star}
              isLoading={isLoading}
              variant="success"
            />
            <ScoreCard
              title="Engagement Rate"
              value={`${metrics.engagementRate}%`}
              subtitle="Active participation"
              icon={TrendingUp}
              isLoading={isLoading}
              variant={metrics.engagementRate > 70 ? "success" : "warning"}
            />
            <ScoreCard
              title="Early Access"
              value={metrics.earlyAccessAttendees}
              subtitle="VIP experience"
              icon={Calendar}
              isLoading={isLoading}
              variant="success"
            />
          </div>
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Package Distribution */}
        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              Audience Value Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={packageData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent, value }) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {packageData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <ChartTooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Premium Package Rate</span>
                <span className="font-medium text-primary">
                  {metrics.totalAttendees > 0 ? Math.round((metrics.premiumPackages / metrics.totalAttendees) * 100) : 0}%
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">High-Value Audience</span>
                <span className="font-medium">{metrics.premiumPackages} attendees</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Engagement Metrics */}
        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Utensils className="h-5 w-5 text-primary" />
              Service Engagement
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={engagementData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fontSize: 10 }}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis tick={{ fontSize: 12 }} />
                  <ChartTooltip />
                  <Bar dataKey="value" fill="#FB8500" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total Interactions</span>
                <span className="font-medium">
                  {(metrics.mealParticipation + metrics.drinkParticipation + metrics.equipmentUsage).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Avg. per Attendee</span>
                <span className="font-medium">
                  {metrics.totalAttendees > 0 
                    ? ((metrics.mealParticipation + metrics.drinkParticipation + metrics.equipmentUsage) / metrics.totalAttendees).toFixed(1)
                    : 0}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sponsor Value Propositions */}
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-primary">
            <TrendingUp className="h-5 w-5" />
            Key Sponsor Value Propositions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h4 className="font-semibold text-primary">Audience Quality</h4>
              <div className="space-y-3">
                <div className="p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg">
                  <div className="font-medium text-green-800 dark:text-green-200">Premium Market Penetration</div>
                  <div className="text-sm text-green-600 dark:text-green-300">
                    {Math.round((metrics.premiumPackages / metrics.totalAttendees) * 100)}% of attendees chose premium experiences
                  </div>
                </div>
                <div className="p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <div className="font-medium text-blue-800 dark:text-blue-200">Early Adopters</div>
                  <div className="text-sm text-blue-600 dark:text-blue-300">
                    {metrics.earlyAccessAttendees} attendees with early access privileges
                  </div>
                </div>
                <div className="p-3 bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800 rounded-lg">
                  <div className="font-medium text-purple-800 dark:text-purple-200">Engaged Community</div>
                  <div className="text-sm text-purple-600 dark:text-purple-300">
                    {metrics.engagementRate}% active participation across all services
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="font-semibold text-primary">Event Impact</h4>
              <div className="space-y-3">
                <div className="p-3 bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded-lg">
                  <div className="font-medium text-orange-800 dark:text-orange-200">Food & Beverage Reach</div>
                  <div className="text-sm text-orange-600 dark:text-orange-300">
                    {(metrics.mealParticipation + metrics.drinkParticipation).toLocaleString()} total F&B interactions
                  </div>
                </div>
                <div className="p-3 bg-teal-50 dark:bg-teal-950/20 border border-teal-200 dark:border-teal-800 rounded-lg">
                  <div className="font-medium text-teal-800 dark:text-teal-200">Technology Integration</div>
                  <div className="text-sm text-teal-600 dark:text-teal-300">
                    {metrics.equipmentUsage} equipment rental transactions
                  </div>
                </div>
                <div className="p-3 bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-800 rounded-lg">
                  <div className="font-medium text-indigo-800 dark:text-indigo-200">Event Scale</div>
                  <div className="text-sm text-indigo-600 dark:text-indigo-300">
                    {metrics.totalAttendees.toLocaleString()} total attendees across all packages
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};