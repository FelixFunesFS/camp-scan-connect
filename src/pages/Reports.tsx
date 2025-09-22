import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Download, RefreshCw, BarChart3, Headphones } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { CheckInOverview } from "@/components/reports/CheckInOverview";
import { HeadphonesTracker } from "@/components/reports/HeadphonesTracker";
import { AnalyticsCards } from "@/components/reports/AnalyticsCards";
import { GateAccessReport } from "@/components/reports/GateAccessReport";
import { CheckInStatusAndOnSite } from "@/components/reports/CheckInStatusAndOnSite";
import { useCsvExport } from "@/hooks/useCsvExport";
import { supabase } from "@/integrations/supabase/client";
import { TimePeriod, formatTimePeriod } from "@/utils/etTimezone";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const Reports = () => {
  const navigate = useNavigate();
  const { exportToCsv } = useCsvExport();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>('today');

  const handleRefresh = () => {
    setIsRefreshing(true);
    setRefreshTrigger(prev => prev + 1);
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  const handleExportReport = async () => {
    try {
      const { data: attendees } = await supabase
        .from('attendees')
        .select(`
          id,
          first_name,
          last_name,
          email,
          phone,
          order_id,
          ticket_type,
          meal_plan,
          activated_at,
          waiver_signed,
          created_at,
          rfid_tags!inner(uid, status, activated_at)
        `);

      if (attendees) {
        const formattedData = attendees.map(attendee => ({
          ...attendee,
          rfid_uid: attendee.rfid_tags?.[0]?.uid,
          rfid_status: attendee.rfid_tags?.[0]?.status,
          formatted_meal_plan: attendee.meal_plan || 'No Plan'
        }));

        exportToCsv(formattedData as any, 'daily-report');
      }
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              onClick={() => navigate("/")}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Dashboard
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-primary flex items-center gap-2">
                <BarChart3 className="h-6 w-6" />
                Admin Reports
              </h1>
              <p className="text-muted-foreground text-sm">
                Real-time data • {formatTimePeriod(selectedPeriod)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Select value={selectedPeriod} onValueChange={(value) => setSelectedPeriod(value as TimePeriod)}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="yesterday">Yesterday</SelectItem>
                    <SelectItem value="this_event">This Event</SelectItem>
                    <SelectItem value="all_time">All Time</SelectItem>
                  </SelectContent>
                </Select>
              </TooltipTrigger>
              <TooltipContent>
                <p>Select time period for report data</p>
                <p className="text-xs text-muted-foreground mt-1">All times in Eastern Time (event timezone)</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  className="flex items-center gap-2"
                >
                  <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Manually refresh all report data</p>
                <p className="text-xs text-muted-foreground mt-1">Reports auto-refresh every 30 seconds</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleExportReport}
                  className="flex items-center gap-2 bg-secondary hover:bg-secondary/90"
                >
                  <Download className="h-4 w-4" />
                  Export CSV
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Download complete attendee data as CSV</p>
                <p className="text-xs text-muted-foreground mt-1">Includes RFID assignments, check-in status, and contact info</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>

        <div className="space-y-6">
          {/* Event Check-in Overview */}
          <CheckInOverview refreshTrigger={refreshTrigger} />

          {/* Gate Access Report - 4 gate activity cards */}
          <GateAccessReport 
            selectedPeriod={selectedPeriod}
            refreshTrigger={refreshTrigger}
          />

          {/* Analytics Cards - Meal Service, Drinks, Peak Hours, etc. */}
          <AnalyticsCards 
            selectedPeriod={selectedPeriod}
            refreshTrigger={refreshTrigger}
          />

          {/* Check-in Status and Currently On-Site - Side by Side */}
          <CheckInStatusAndOnSite refreshTrigger={refreshTrigger} selectedPeriod={selectedPeriod} />

          {/* Attendee Services */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Headphones className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-semibold">Attendee Services</h2>
            </div>
            
            {/* Equipment Services */}
            <HeadphonesTracker 
              selectedPeriod={selectedPeriod}
              refreshTrigger={refreshTrigger}
            />
          </div>
        </div>

        {/* Auto-refresh indicator */}
        <div className="text-center mt-8">
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="outline" className="text-xs">
                Auto-refreshing every 30 seconds - No page flashing ✓
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p>Reports update automatically in the background</p>
              <p className="text-xs text-muted-foreground mt-1">Uses background refresh to avoid disrupting your workflow</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    </div>
    </TooltipProvider>
  );
};

export default Reports;