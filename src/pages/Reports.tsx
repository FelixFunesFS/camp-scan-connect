import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw, Download, Calendar, Users, Utensils, TrendingUp, BarChart3 } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { EventAnalyticsTab } from "@/components/reports/EventAnalyticsTab";
import { AttendeeManagementTab } from "@/components/reports/AttendeeManagementTab";
import { OperationsTab } from "@/components/reports/OperationsTab";
import { ExecutiveReportsTab } from "@/components/reports/ExecutiveReportsTab";
import { ChartCustomizer } from "@/components/reports/ChartCustomizer";
import { CustomDashboard } from "@/components/reports/CustomDashboard";
import { MobileReportsNavigation } from "@/components/reports/shared/MobileReportsNavigation";
import { ScrollToTop } from "@/components/ui/scroll-to-top";

const Reports = () => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("analytics");
  const isMobile = useIsMobile();

  const handleRefresh = async () => {
    setIsRefreshing(true);
    // Trigger refresh across all tabs
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  const handleGlobalExport = () => {
    // Export current tab data
    console.log("Exporting global data");
  };

  return (
    <div className="min-h-screen bg-background p-4 space-y-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <Card className="border-primary/20">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle className="text-2xl text-primary flex items-center gap-2">
                  <Calendar className="h-6 w-6" />
                  Melanated Campout 2025 - Reports Dashboard
                </CardTitle>
                <p className="text-muted-foreground mt-1">
                  Real-time event analytics and management insights
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  className="border-primary/20"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                  {isRefreshing ? 'Refreshing...' : 'Refresh'}
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleGlobalExport}
                  className="bg-primary hover:bg-primary/90"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Mobile Navigation */}
        {isMobile && (
          <div className="mb-6">
            <MobileReportsNavigation
              activeTab={activeTab}
              onTabChange={setActiveTab}
            />
          </div>
        )}

        {/* Desktop Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          {!isMobile && (
            <TabsList className="grid w-full grid-cols-5 bg-muted/50">
                <TabsTrigger value="analytics" className="gap-2">
                  <Calendar className="h-4 w-4" />
                  {!isMobile && "Event Analytics"}
                  {isMobile && "Analytics"}
                </TabsTrigger>
                <TabsTrigger value="attendees" className="gap-2">
                  <Users className="h-4 w-4" />
                  {!isMobile && "Attendee Management"}
                  {isMobile && "Attendees"}
                </TabsTrigger>
                <TabsTrigger value="operations" className="gap-2">
                  <Utensils className="h-4 w-4" />
                  {!isMobile && "Operations"}
                  {isMobile && "Operations"}
                </TabsTrigger>
                <TabsTrigger value="executive" className="gap-2">
                  <TrendingUp className="h-4 w-4" />
                  {!isMobile && "Executive Reports"}
                  {isMobile && "Executive"}
                </TabsTrigger>
                <TabsTrigger value="custom" className="gap-2">
                  <BarChart3 className="h-4 w-4" />
                  {!isMobile && "Custom Dashboard"}
                  {isMobile && "Custom"}
                </TabsTrigger>
            </TabsList>
          )}

          <div className="mt-6">
            <TabsContent value="analytics" className="space-y-4">
              <EventAnalyticsTab isRefreshing={isRefreshing} />
            </TabsContent>

            <TabsContent value="attendees" className="space-y-4">
              <AttendeeManagementTab isRefreshing={isRefreshing} />
            </TabsContent>

            <TabsContent value="operations" className="space-y-4">
              <OperationsTab isRefreshing={isRefreshing} />
            </TabsContent>

            <TabsContent value="executive" className="space-y-4">
              <ExecutiveReportsTab isRefreshing={isRefreshing} />
            </TabsContent>

            <TabsContent value="custom" className="space-y-6">
              <CustomDashboard isRefreshing={isRefreshing} />
            </TabsContent>
          </div>
        </Tabs>
      </div>

      {/* Scroll to Top Button */}
      <ScrollToTop />
    </div>
  );
};

export default Reports;