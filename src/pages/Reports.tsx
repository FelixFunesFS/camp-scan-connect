import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Download, RefreshCw, BarChart3, Headphones, Package } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { CheckInOverview } from "@/components/reports/CheckInOverview";
import { CheckInStatusTables } from "@/components/reports/CheckInStatusTables";
import { HeadphonesTracker } from "@/components/reports/HeadphonesTracker";
import { GolfCartsTracker } from "@/components/reports/GolfCartsTracker";
import { WalkieTalkiesTracker } from "@/components/reports/WalkieTalkiesTracker";
import { FannyPacksTracker } from "@/components/reports/FannyPacksTracker";
import { AnalyticsCards } from "@/components/reports/AnalyticsCards";
import { useCsvExport } from "@/hooks/useCsvExport";
import { supabase } from "@/integrations/supabase/client";
import { TimePeriod, formatTimePeriod } from "@/utils/etTimezone";

const Reports = () => {
  const navigate = useNavigate();
  const { exportToCsv } = useCsvExport();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>('today');

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setLastUpdate(new Date());
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setLastUpdate(new Date());
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
                Last updated: {lastUpdate.toLocaleTimeString()} • {formatTimePeriod(selectedPeriod)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
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
            <Button
              variant="default"
              size="sm"
              onClick={handleExportReport}
              className="flex items-center gap-2 bg-secondary hover:bg-secondary/90"
            >
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </div>

        <div className="space-y-6">
          {/* Daily Check-in Overview */}
          <CheckInOverview key={lastUpdate.getTime()} />

          {/* Check-in Status Tables */}
          <CheckInStatusTables key={`status-${lastUpdate.getTime()}`} />

          {/* Attendee Services */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Headphones className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-semibold">Attendee Services</h2>
            </div>
            <HeadphonesTracker 
              key={`headphones-${lastUpdate.getTime()}-${selectedPeriod}`}
              selectedPeriod={selectedPeriod}
            />
          </div>

          {/* Staff Equipment */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Package className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-semibold">Staff Equipment</h2>
            </div>
            <GolfCartsTracker 
              key={`golf-carts-${lastUpdate.getTime()}-${selectedPeriod}`}
              selectedPeriod={selectedPeriod}
            />
            
            <WalkieTalkiesTracker 
              key={`walkie-talkies-${lastUpdate.getTime()}-${selectedPeriod}`}
              selectedPeriod={selectedPeriod}
            />
            
            <FannyPacksTracker 
              key={`fanny-packs-${lastUpdate.getTime()}-${selectedPeriod}`}
              selectedPeriod={selectedPeriod}
            />
          </div>

          {/* Analytics Cards */}
          <AnalyticsCards 
            key={`analytics-${lastUpdate.getTime()}-${selectedPeriod}`}
            selectedPeriod={selectedPeriod}
          />
        </div>

        {/* Auto-refresh indicator */}
        <div className="text-center mt-8">
          <Badge variant="outline" className="text-xs">
            Auto-refreshing every 30 seconds
          </Badge>
        </div>
      </div>
    </div>
  );
};

export default Reports;