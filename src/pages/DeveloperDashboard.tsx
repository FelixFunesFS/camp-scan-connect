import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { WebhookRegistrantTimeline } from "@/components/dev/WebhookRegistrantTimeline";
import { SyncHistoryTable } from "@/components/dev/SyncHistoryTable";
import { AnalyticsDashboard } from "@/components/dev/AnalyticsDashboard";
import { DebugTools } from "@/components/dev/DebugTools";
import { ProductionReadiness } from "@/components/dev/ProductionReadiness";
import AdminRequestManager from "@/components/dev/AdminRequestManager";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Activity, Database, BarChart, Wrench, CheckSquare, Shield, AlertTriangle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { PostProductionAnalysis } from "@/components/dev/PostProductionAnalysis";
import { SheetsSyncPanel } from "@/components/dev/SheetsSyncPanel";

const DeveloperDashboard = () => {
  const navigate = useNavigate();

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background">
      <div className="border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/")}
                className="gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Dashboard
              </Button>
              <Separator orientation="vertical" className="h-6" />
              <div>
                <h1 className="text-2xl font-bold">Developer Dashboard</h1>
                <p className="text-sm text-muted-foreground">
                  Webhook & API Sync Monitoring
                </p>
              </div>
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="outline" className="gap-1">
                  <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                  Live
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p>Real-time data updates - No need to refresh pages</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <Tabs defaultValue="timeline" className="space-y-6">
          <TabsList className="grid w-full grid-cols-7">
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