import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

import { RegFoxSyncPanel } from "@/components/RegFoxSyncPanel";
import { 
  Play, 
  Square, 
  RefreshCw, 
  Download, 
  Code, 
  Zap, 
  Database, 
  AlertCircle, 
  CheckCircle,
  Copy,
  Eye
} from "lucide-react";

export const DebugTools = () => {
  const [loading, setLoading] = useState(false);

  const exportSyncData = async () => {
    try {
      const { data: syncData } = await supabase
        .from('regfox_sync_log')
        .select('*')
        .order('sync_started_at', { ascending: false });

      const { data: attendeeData } = await supabase
        .from('attendees')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      const exportData = {
        sync_logs: syncData,
        recent_attendees: attendeeData,
        exported_at: new Date().toISOString()
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { 
        type: 'application/json' 
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `debug-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success("Debug data exported successfully");
    } catch (error) {
      console.error('Export error:', error);
      toast.error("Failed to export debug data");
    }
  };

  const clearTestData = async () => {
    try {
      // This would typically clear test/mock data
      const { error } = await supabase
        .from('attendees')
        .delete()
        .like('first_name', 'Test%');

      if (error) throw error;
      toast.success("Test data cleared");
    } catch (error) {
      console.error('Clear test data error:', error);
      toast.error("Failed to clear test data");
    }
  };


  return (
    <div className="space-y-6">
      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Download className="h-4 w-4" />
              Export Data
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={exportSyncData}
              variant="outline"
              className="w-full"
              size="sm"
            >
              <Download className="h-4 w-4" />
              Export Debug
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Cleanup
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={clearTestData}
              variant="destructive"
              className="w-full"
              size="sm"
            >
              <Square className="h-4 w-4" />
              Clear Test Data
            </Button>
          </CardContent>
        </Card>
      </div>


      {/* RegFox Sync Panel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            RegFox Sync Control
          </CardTitle>
          <CardDescription>
            Manual sync operations and monitoring
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RegFoxSyncPanel />
        </CardContent>
      </Card>

      {/* System Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            System Status
          </CardTitle>
          <CardDescription>
            Current system health and configuration
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="text-sm font-medium">Sync Method</div>
              <Badge variant="outline">
                Scheduled API Sync Only
              </Badge>
            </div>
            
            <div className="space-y-2">
              <div className="text-sm font-medium">Environment</div>
              <Badge variant="outline">
                {window.location.hostname === 'localhost' ? 'Development' : 'Production'}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
