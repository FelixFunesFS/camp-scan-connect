import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RegFoxSyncPanel } from './RegFoxSyncPanel';
import { WebhookStatus } from './WebhookStatus';
import { SystemCleanupStatus } from './SystemCleanupStatus';
import { RegFoxMissingAnalysis } from './RegFoxMissingAnalysis';
import { RegFoxIdDebugger } from './RegFoxIdDebugger';
import { DataMigrationPanel } from './DataMigrationPanel';
import { Activity, Database, Search, Settings, RotateCcw } from 'lucide-react';

export const SystemManagementGrid: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Settings className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">System Management</h1>
        <Badge variant="outline" className="ml-auto">
          Admin Dashboard
        </Badge>
      </div>

      {/* Quick Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-l-4 border-l-primary">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <RotateCcw className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">RegFox Sync</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Data synchronization status</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-secondary">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-secondary" />
              <span className="text-sm font-medium">System Health</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Monitoring & cleanup</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-accent">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-accent" />
              <span className="text-sm font-medium">Analysis Tools</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Debug & analysis</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Data Synchronization Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <RotateCcw className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Data Synchronization</h2>
          </div>
          <RegFoxSyncPanel />
        </div>

        {/* System Monitoring Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="h-5 w-5 text-secondary" />
            <h2 className="text-lg font-semibold">System Monitoring</h2>
          </div>
          <div className="space-y-4">
            <WebhookStatus />
            <SystemCleanupStatus />
          </div>
        </div>

        {/* Analysis & Debug Tools Section */}
        <div className="space-y-4 lg:col-span-2">
          <div className="flex items-center gap-2 mb-4">
            <Search className="h-5 w-5 text-accent" />
            <h2 className="text-lg font-semibold">Analysis & Debug Tools</h2>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <RegFoxMissingAnalysis />
            <RegFoxIdDebugger />
          </div>
        </div>

        {/* Data Migration Section */}
        <div className="space-y-4 lg:col-span-2">
          <div className="flex items-center gap-2 mb-4">
            <Database className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Data Migration</h2>
          </div>
          <DataMigrationPanel />
        </div>
      </div>
    </div>
  );
};