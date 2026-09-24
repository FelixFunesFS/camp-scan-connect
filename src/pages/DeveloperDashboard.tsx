import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { WebhookRegistrantTimeline } from "@/components/dev/WebhookRegistrantTimeline";
import { SyncHistoryTable } from "@/components/dev/SyncHistoryTable";
import { SyncIntegrityPanel } from "@/components/dev/SyncIntegrityPanel";

import { AnalyticsDashboard } from "@/components/dev/AnalyticsDashboard";
import { DebugTools } from "@/components/dev/DebugTools";
import { ProductionReadiness } from "@/components/dev/ProductionReadiness";
import AdminRequestManager from "@/components/dev/AdminRequestManager";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Activity, Database, BarChart, Wrench, CheckSquare, Shield, AlertTriangle, ScanBarcode, Clock } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { PostProductionAnalysis } from "@/components/dev/PostProductionAnalysis";
import { SheetsSyncPanel } from "@/components/dev/SheetsSyncPanel";
import { EventYearSwitcher, ArchivedYearBanner } from "@/components/EventYearSwitcher";

const DeveloperDashboard = () => {
  const navigate = useNavigate();

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background">
      <div className="border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 flex-wrap items-center gap-3 sm:gap-4">
              <div className="min-w-0">
                <h1 className="text-xl sm:text-2xl font-bold leading-tight">Developer Dashboard</h1>
                <p className="text-sm text-muted-foreground">
                  RegFox import and delivery monitoring
                </p>
              </div>
            </div>
            <div className="flex w-full min-w-0 flex-wrap items-center gap-3 lg:w-auto">
            <EventYearSwitcher />
            <Button variant="outline" size="sm" className="gap-2" onClick={() => navigate("/scan-test")}>
              <ScanBarcode className="h-4 w-4" />
              Scan Tester
            </Button>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="outline" className="gap-1">
                  <Clock className="h-3 w-3" />
                  Hourly Safety Sync
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                 <p>RegFox webhooks update quickly when delivered; hourly reconciliation recovers missed changes.</p>
              </TooltipContent>
            </Tooltip>
            </div>
          </div>
          <div className="mt-3"><ArchivedYearBanner /></div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <Tabs defaultValue="timeline" className="space-y-6">
          <TabsList className="scroll-tabs flex justify-start sticky top-0 z-10 h-auto gap-1 p-1 xl:grid xl:w-full xl:grid-cols-7 [&>button]:min-h-11">
            <Tooltip>
              <TooltipTrigger asChild>
                <TabsTrigger value="timeline" className="gap-2">
                  <Activity className="h-4 w-4" />
                  Registrant Timeline
                </TabsTrigger>
              </TooltipTrigger>
              <TooltipContent>
                <p>Real-time timeline of attendee registrations and changes</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <TabsTrigger value="sync" className="gap-2">
                  <Database className="h-4 w-4" />
                  Sync History
                </TabsTrigger>
              </TooltipTrigger>
              <TooltipContent>
                <p>History of RegFox API synchronizations - both scheduled and manual</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <TabsTrigger value="analytics" className="gap-2">
                  <BarChart className="h-4 w-4" />
                  Analytics
                </TabsTrigger>
              </TooltipTrigger>
              <TooltipContent>
                <p>Registration metrics, sync performance, and system health indicators</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <TabsTrigger value="requests" className="gap-2">
                  <CheckSquare className="h-4 w-4" />
                  Admin Requests
                </TabsTrigger>
              </TooltipTrigger>
              <TooltipContent>
                <p>Management interface for admin tasks and maintenance operations</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <TabsTrigger value="production" className="gap-2">
                  <Shield className="h-4 w-4" />
                  Production Readiness
                </TabsTrigger>
              </TooltipTrigger>
              <TooltipContent>
                <p>Edge case testing, system health monitoring, and production deployment tools</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <TabsTrigger value="debug" className="gap-2">
                  <Wrench className="h-4 w-4" />
                  Debug Tools
                </TabsTrigger>
              </TooltipTrigger>
              <TooltipContent>
                <p>Developer tools for testing, data export, and system diagnostics</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <TabsTrigger value="postproduction" className="gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Post-Production Analysis
                </TabsTrigger>
              </TooltipTrigger>
              <TooltipContent>
                <p>Credential error analysis, edge cases, and system improvement recommendations</p>
              </TooltipContent>
            </Tooltip>
          </TabsList>

          <TabsContent value="timeline" className="space-y-6">
            <WebhookRegistrantTimeline />
          </TabsContent>

          <TabsContent value="sync" className="space-y-6">
            <SyncIntegrityPanel />
            <SyncHistoryTable />

          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <AnalyticsDashboard />
          </TabsContent>

          <TabsContent value="requests" className="space-y-6">
            <AdminRequestManager />
          </TabsContent>

          <TabsContent value="production" className="space-y-6">
            <ProductionReadiness />
          </TabsContent>

          <TabsContent value="debug" className="space-y-6">
            <SheetsSyncPanel />
            <DebugTools />
          </TabsContent>

          <TabsContent value="postproduction" className="space-y-6">
            <PostProductionAnalysis />
          </TabsContent>
        </Tabs>
      </div>
    </div>
    </TooltipProvider>
  );
};

export default DeveloperDashboard;