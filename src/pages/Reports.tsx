import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  RefreshCw, 
  Download, 
  ChevronDown, 
  ChevronRight, 
  BarChart3, 
  Users, 
  Activity, 
  Headphones, 
  Shirt, 
  MapPin, 
  TrendingUp, 
  Eye, 
  EyeOff, 
  RotateCcw,
  ArrowLeft,
  Shield,
  Caravan,
  Expand,
  Minimize
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { CheckInOverview } from "@/components/reports/CheckInOverview";
import { RecentlyCheckedIn } from "@/components/reports/RecentlyCheckedIn";
import { HeadphonesTracker } from "@/components/reports/HeadphonesTracker";
import { TShirtTracker } from "@/components/reports/TShirtTracker";
import { AnalyticsCards } from "@/components/reports/AnalyticsCards";
import { GateAccessReport } from "@/components/reports/GateAccessReport";
import { CheckInStatusAndOnSite } from "@/components/reports/CheckInStatusAndOnSite";
import { ArrivalsBreakdown } from "@/components/reports/ArrivalsBreakdown";
import { useCsvExport } from "@/hooks/useCsvExport";
import { supabase } from "@/integrations/supabase/client";
import { TimePeriod, formatTimePeriod } from "@/utils/etTimezone";
import { useIsMobile } from "@/hooks/use-mobile";
import { MobileReportsControls } from "@/components/MobileReportsControls";
import { MobileReportCard } from "@/components/MobileReportCard";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";

const Reports = () => {
  const navigate = useNavigate();
  const { exportToCsv } = useCsvExport();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>('today');
  const isMobile = useIsMobile();
  
  // Collapsible section states with localStorage persistence
  const [sections, setSections] = useState(() => {
    const saved = localStorage.getItem('reports-sections-state');
    return saved ? JSON.parse(saved) : {
      overview: true,     // Event Check-in Overview (default: expanded)
      arrivals: true,     // Arrivals by Ticket Type (default: expanded)
      gate: true,         // Main Gate Access (default: expanded)
      services: true,     // Attendee Services (default: expanded)
      status: true        // Check-in Status & On-Site (default: expanded)
    };
  });

  const handleRefresh = () => {
    setIsRefreshing(true);
    setRefreshTrigger(prev => prev + 1);
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  // Save section states to localStorage
  const updateSectionState = (section: keyof typeof sections, isOpen: boolean) => {
    const newSections = { ...sections, [section]: isOpen };
    setSections(newSections);
    localStorage.setItem('reports-sections-state', JSON.stringify(newSections));
  };

  // Expand/Collapse All functions
  const expandAll = () => {
    const allExpanded = { overview: true, arrivals: true, gate: true, services: true, status: true };
    setSections(allExpanded);
    localStorage.setItem('reports-sections-state', JSON.stringify(allExpanded));
  };

  const collapseAll = () => {
    const allCollapsed = { overview: false, arrivals: false, gate: false, services: false, status: false };
    setSections(allCollapsed);
    localStorage.setItem('reports-sections-state', JSON.stringify(allCollapsed));
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
          rfid_uid: (attendee as any).rfid_tags?.[0]?.uid,
          rfid_status: (attendee as any).rfid_tags?.[0]?.status,
          formatted_meal_plan: attendee.meal_plan || 'No Plan'
        }));

        exportToCsv(formattedData as any, 'daily-report');
      }
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  // Pull to refresh functionality for mobile
  const { containerRef, isRefreshing: isPullRefreshing, pullDistance, shouldShowIndicator } = usePullToRefresh({
    onRefresh: async () => {
      await new Promise(resolve => setTimeout(resolve, 100)); // Small delay for better UX
      handleRefresh();
    },
    isEnabled: isMobile
  });

  // Mobile layout
  if (isMobile) {
    return (
      <TooltipProvider>
        <div 
          ref={containerRef}
          className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5 relative"
          style={{
            transform: `translateY(${Math.min(pullDistance * 0.5, 40)}px)`,
            transition: pullDistance === 0 ? 'transform 0.2s ease-out' : 'none'
          }}
        >
          {/* Pull to refresh indicator */}
          {shouldShowIndicator && (
            <div 
              className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-full bg-background border rounded-full p-2 shadow-lg z-10"
              style={{
                opacity: Math.min(pullDistance / 60, 1)
              }}
            >
              <RotateCcw 
                className={`h-4 w-4 text-primary ${isPullRefreshing ? 'animate-spin' : ''}`}
                style={{
                  transform: `rotate(${Math.min(pullDistance * 2, 180)}deg)`
                }}
              />
            </div>
          )}

          <div className="responsive-container">
            <div className="space-y-4">
              {/* Mobile Header */}
              <div className="mobile-header">
                <Button
                  variant="outline"
                  onClick={() => navigate("/")}
                  className="flex items-center gap-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Dashboard
                </Button>
              </div>

              {/* Mobile Controls */}
              <MobileReportsControls
                selectedPeriod={selectedPeriod}
                onPeriodChange={(period) => setSelectedPeriod(period)}
                onRefresh={handleRefresh}
                onExport={handleExportReport}
                onExpandAll={expandAll}
                onCollapseAll={collapseAll}
                isRefreshing={isRefreshing || isPullRefreshing}
              />

              {/* Mobile Report Cards */}
              <div className="space-y-4">
                <MobileReportCard
                  title="Event Check-in Overview"
                  icon={<Users className="h-5 w-5 text-primary" />}
                  isOpen={sections.overview}
                  onToggle={() => updateSectionState('overview', !sections.overview)}
                >
                  <CheckInOverview refreshTrigger={refreshTrigger} />
                </MobileReportCard>

                <RecentlyCheckedIn refreshTrigger={refreshTrigger} />

                <MobileReportCard
                  title="Arrivals by Ticket Type"
                  icon={<Caravan className="h-5 w-5 text-primary" />}
                  isOpen={sections.arrivals}
                  onToggle={() => updateSectionState('arrivals', !sections.arrivals)}
                >
                  <ArrivalsBreakdown refreshTrigger={refreshTrigger} />
                </MobileReportCard>

                <MobileReportCard
                  title="Main Gate Access"
                  icon={<Shield className="h-5 w-5 text-primary" />}
                  isOpen={sections.gate}
                  onToggle={() => updateSectionState('gate', !sections.gate)}
                >
                  <GateAccessReport 
                    selectedPeriod={selectedPeriod}
                    refreshTrigger={refreshTrigger}
                  />
                </MobileReportCard>

                <MobileReportCard
                  title="Attendee Services"
                  icon={<Headphones className="h-5 w-5 text-primary" />}
                  isOpen={sections.services}
                  onToggle={() => updateSectionState('services', !sections.services)}
                >
                  <div className="space-y-4">
                    <AnalyticsCards 
                      selectedPeriod={selectedPeriod}
                      refreshTrigger={refreshTrigger}
                      section="top"
                    />
                    
                    <HeadphonesTracker 
                      selectedPeriod={selectedPeriod}
                      refreshTrigger={refreshTrigger}
                    />
                    
                    <TShirtTracker 
                      refreshTrigger={refreshTrigger}
                    />
                    
                    <AnalyticsCards 
                      selectedPeriod={selectedPeriod}
                      refreshTrigger={refreshTrigger}
                      section="bottom"
                    />
                  </div>
                </MobileReportCard>

                <MobileReportCard
                  title="Currently On-Site"
                  icon={<BarChart3 className="h-5 w-5 text-primary" />}
                  isOpen={sections.status}
                  onToggle={() => updateSectionState('status', !sections.status)}
                >
                  <CheckInStatusAndOnSite refreshTrigger={refreshTrigger} selectedPeriod={selectedPeriod} />
                </MobileReportCard>
              </div>
            </div>
          </div>
        </div>
      </TooltipProvider>
    );
  }

  // Desktop layout
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
                <Button
                  variant="outline"
                  size="sm"
                  onClick={expandAll}
                  className="flex items-center gap-1"
                >
                  <Expand className="h-3 w-3" />
                  Expand All
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Expand all report sections</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={collapseAll}
                  className="flex items-center gap-1"
                >
                  <Minimize className="h-3 w-3" />
                  Collapse All
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Collapse all report sections</p>
              </TooltipContent>
            </Tooltip>
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
          <Collapsible 
            open={sections.overview} 
            onOpenChange={(isOpen) => updateSectionState('overview', isOpen)}
          >
            <CollapsibleTrigger asChild>
              <Button 
                variant="ghost" 
                className="flex items-center justify-between w-full p-4 hover:bg-muted/50 rounded-lg border border-border/50"
              >
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  <h2 className="text-xl font-semibold">Event Check-in Overview</h2>
                </div>
                {sections.overview ? 
                  <ChevronDown className="h-4 w-4 transition-transform duration-200" /> : 
                  <ChevronRight className="h-4 w-4 transition-transform duration-200" />
                }
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4 mt-4">
              <CheckInOverview refreshTrigger={refreshTrigger} />
            </CollapsibleContent>
          </Collapsible>

          {/* Recently Checked In - Standalone Section */}
          <RecentlyCheckedIn refreshTrigger={refreshTrigger} />

          {/* Arrivals by Ticket Type */}
          <Collapsible 
            open={sections.arrivals} 
            onOpenChange={(isOpen) => updateSectionState('arrivals', isOpen)}
          >
            <CollapsibleTrigger asChild>
              <Button 
                variant="ghost" 
                className="flex items-center justify-between w-full p-4 hover:bg-muted/50 rounded-lg border border-border/50"
              >
                <div className="flex items-center gap-2">
                  <Caravan className="h-5 w-5 text-primary" />
                  <h2 className="text-xl font-semibold">Arrivals by Ticket Type</h2>
                </div>
                {sections.arrivals ? 
                  <ChevronDown className="h-4 w-4 transition-transform duration-200" /> : 
                  <ChevronRight className="h-4 w-4 transition-transform duration-200" />
                }
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4 mt-4">
              <ArrivalsBreakdown refreshTrigger={refreshTrigger} />
            </CollapsibleContent>
          </Collapsible>

          {/* Main Gate Access */}
          <Collapsible 
            open={sections.gate} 
            onOpenChange={(isOpen) => updateSectionState('gate', isOpen)}
          >
            <CollapsibleTrigger asChild>
              <Button 
                variant="ghost" 
                className="flex items-center justify-between w-full p-4 hover:bg-muted/50 rounded-lg border border-border/50"
              >
                <div className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  <h2 className="text-xl font-semibold">Main Gate Access</h2>
                </div>
                {sections.gate ? 
                  <ChevronDown className="h-4 w-4 transition-transform duration-200" /> : 
                  <ChevronRight className="h-4 w-4 transition-transform duration-200" />
                }
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4 mt-4">
              <GateAccessReport 
                selectedPeriod={selectedPeriod}
                refreshTrigger={refreshTrigger}
              />
            </CollapsibleContent>
          </Collapsible>

          {/* Attendee Services */}
          <Collapsible 
            open={sections.services} 
            onOpenChange={(isOpen) => updateSectionState('services', isOpen)}
          >
            <CollapsibleTrigger asChild>
              <Button 
                variant="ghost" 
                className="flex items-center justify-between w-full p-4 hover:bg-muted/50 rounded-lg border border-border/50"
              >
                <div className="flex items-center gap-2">
                  <Headphones className="h-5 w-5 text-primary" />
                  <h2 className="text-xl font-semibold">Attendee Services</h2>
                </div>
                {sections.services ? 
                  <ChevronDown className="h-4 w-4 transition-transform duration-200" /> : 
                  <ChevronRight className="h-4 w-4 transition-transform duration-200" />
                }
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4 mt-4">
              {/* Analytics Cards - Top Section: Meal Service, Drinks */}
              <AnalyticsCards 
                selectedPeriod={selectedPeriod}
                refreshTrigger={refreshTrigger}
                section="top"
              />
              
              {/* Equipment Services - positioned above Average Party Time and Peak Usage */}
              <HeadphonesTracker 
                selectedPeriod={selectedPeriod}
                refreshTrigger={refreshTrigger}
              />
              
              {/* T-Shirt Distribution Tracking */}
              <TShirtTracker 
                refreshTrigger={refreshTrigger}
              />
              
              {/* Analytics Cards - Bottom Section: Average Party Time, Peak Usage Hours */}
              <AnalyticsCards 
                selectedPeriod={selectedPeriod}
                refreshTrigger={refreshTrigger}
                section="bottom"
              />
            </CollapsibleContent>
          </Collapsible>

          {/* Currently On-Site */}
          <Collapsible 
            open={sections.status} 
            onOpenChange={(isOpen) => updateSectionState('status', isOpen)}
          >
            <CollapsibleTrigger asChild>
              <Button 
                variant="ghost" 
                className="flex items-center justify-between w-full p-4 hover:bg-muted/50 rounded-lg border border-border/50"
              >
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  <h2 className="text-xl font-semibold">Currently On-Site</h2>
                </div>
                {sections.status ? 
                  <ChevronDown className="h-4 w-4 transition-transform duration-200" /> : 
                  <ChevronRight className="h-4 w-4 transition-transform duration-200" />
                }
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4 mt-4">
              <CheckInStatusAndOnSite refreshTrigger={refreshTrigger} selectedPeriod={selectedPeriod} />
            </CollapsibleContent>
          </Collapsible>
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