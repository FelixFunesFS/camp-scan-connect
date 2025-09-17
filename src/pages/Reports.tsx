import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw, Download, Calendar, Users, Package, Utensils, Activity, TrendingUp, Database, CheckSquare } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { EventOverviewTab } from "@/components/reports/EventOverviewTab";
import { PackageUtilizationTab } from "@/components/reports/PackageUtilizationTab";
import { CheckInManagementTab } from "@/components/reports/CheckInManagementTab";
import { FoodBeverageTab } from "@/components/reports/FoodBeverageTab";
import { ActivitiesEquipmentTab } from "@/components/reports/ActivitiesEquipmentTab";
import { SponsorImpactTab } from "@/components/reports/SponsorImpactTab";
import { DataMigrationPanel } from "@/components/DataMigrationPanel";
import { MobileReportsNavigation } from "@/components/reports/shared/MobileReportsNavigation";

const Reports = () => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("overview");
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
                  onClick={() => navigate('/admin')}
                  variant="secondary"
                  size="sm"
                  className="gap-2"
                >
                  <CheckSquare className="h-4 w-4" />
                  Admin Hub
                </Button>
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
            <TabsList className="grid w-full grid-cols-3 lg:grid-cols-7 bg-muted/50">
              <TabsTrigger 
                value="overview" 
                className="flex items-center gap-2 text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline">Event Overview</span>
                <span className="sm:hidden">Overview</span>
              </TabsTrigger>
              <TabsTrigger 
                value="packages" 
                className="flex items-center gap-2 text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <Package className="h-4 w-4" />
                <span className="hidden sm:inline">Package Utilization</span>
                <span className="sm:hidden">Packages</span>
              </TabsTrigger>
              <TabsTrigger 
                value="checkin" 
                className="flex items-center gap-2 text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline">Check-In Mgmt</span>
                <span className="sm:hidden">Check-In</span>
              </TabsTrigger>
              <TabsTrigger 
                value="food" 
                className="flex items-center gap-2 text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <Utensils className="h-4 w-4" />
                <span className="hidden sm:inline">Food & Beverage</span>
                <span className="sm:hidden">F&B</span>
              </TabsTrigger>
              <TabsTrigger 
                value="activities" 
                className="flex items-center gap-2 text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <Activity className="h-4 w-4" />
                <span className="hidden sm:inline">Activities</span>
                <span className="sm:hidden">Activities</span>
              </TabsTrigger>
              <TabsTrigger 
                value="sponsor" 
                className="flex items-center gap-2 text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <TrendingUp className="h-4 w-4" />
                <span className="hidden sm:inline">Sponsor Impact</span>
                <span className="sm:hidden">Sponsors</span>
              </TabsTrigger>
              <TabsTrigger 
                value="migration" 
                className="flex items-center gap-2 text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <Database className="h-4 w-4" />
                <span className="hidden sm:inline">Data Migration</span>
                <span className="sm:hidden">Migration</span>
              </TabsTrigger>
            </TabsList>
          )}

          <div className="mt-6">
            <TabsContent value="overview" className="space-y-4">
              <EventOverviewTab isRefreshing={isRefreshing} />
            </TabsContent>

            <TabsContent value="packages" className="space-y-4">
              <PackageUtilizationTab isRefreshing={isRefreshing} />
            </TabsContent>

            <TabsContent value="checkin" className="space-y-4">
              <CheckInManagementTab isRefreshing={isRefreshing} />
            </TabsContent>

            <TabsContent value="food" className="space-y-4">
              <FoodBeverageTab isRefreshing={isRefreshing} />
            </TabsContent>

            <TabsContent value="activities" className="space-y-4">
              <ActivitiesEquipmentTab isRefreshing={isRefreshing} />
            </TabsContent>

            <TabsContent value="sponsor" className="space-y-4">
              <SponsorImpactTab isRefreshing={isRefreshing} />
            </TabsContent>

            <TabsContent value="migration" className="space-y-4">
              <DataMigrationPanel />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
};

export default Reports;