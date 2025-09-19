import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RegFoxSyncPanel } from '@/components/RegFoxSyncPanel';
import { WebhookStatus } from '@/components/WebhookStatus';
import { SystemCleanupStatus } from '@/components/SystemCleanupStatus';
import { DataMigrationPanel } from '@/components/DataMigrationPanel';
import { RotateCcw, Activity, Database, Settings } from 'lucide-react';

export const SystemMaintenancePanel: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Settings className="h-6 w-6 text-primary" />
        <h2 className="text-2xl font-bold">System Maintenance</h2>
        <Badge variant="outline" className="ml-auto">Admin</Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Data Synchronization */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <RotateCcw className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold">Data Synchronization</h3>
          </div>
          <RegFoxSyncPanel />
        </div>

        {/* System Monitoring */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-secondary" />
            <h3 className="text-lg font-semibold">System Monitoring</h3>
          </div>
          <div className="space-y-4">
            <WebhookStatus />
            <SystemCleanupStatus />
          </div>
        </div>

        {/* Data Migration */}
        <div className="space-y-4 lg:col-span-2">
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5 text-accent" />
            <h3 className="text-lg font-semibold">Data Migration</h3>
          </div>
          <DataMigrationPanel />
        </div>
      </div>
    </div>
  );
};