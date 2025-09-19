import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { WebhookStatus } from "@/components/WebhookStatus";
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
  const [testWebhookPayload, setTestWebhookPayload] = useState(`{
  "first_name": "John",
  "last_name": "Doe",
  "email": "john.doe@example.com",
  "phone": "+1234567890",
  "ticket_type": "dry_site",
  "meal_plan": "none",
  "order_id": "TEST123"
}`);
  const [loading, setLoading] = useState(false);
  const [lastResponse, setLastResponse] = useState<any>(null);

  const testWebhookEndpoint = async () => {
    setLoading(true);
    try {
      const payload = JSON.parse(testWebhookPayload);
      
      // Send to our webhook endpoint
      const response = await fetch(`${window.location.origin}/api/webhook/regfox`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      setLastResponse({ status: response.status, data: result });
      
      if (response.ok) {
        toast.success("Test webhook sent successfully");
      } else {
        toast.error(`Webhook test failed: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Webhook test error:', error);
      toast.error("Failed to send test webhook");
      setLastResponse({ error: error instanceof Error ? error.message : 'Unknown error' });
    } finally {
      setLoading(false);
    }
  };

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

  const copyWebhookUrl = () => {
    const webhookUrl = `${window.location.origin}/api/webhook/regfox`;
    navigator.clipboard.writeText(webhookUrl);
    toast.success("Webhook URL copied to clipboard");
  };

  return (
    <div className="space-y-6">
      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Quick Test
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={testWebhookEndpoint}
              disabled={loading}
              className="w-full"
              size="sm"
            >
              {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              Test Webhook
            </Button>
          </CardContent>
        </Card>

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
              <Copy className="h-4 w-4" />
              Webhook URL
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={copyWebhookUrl}
              variant="outline"
              className="w-full"
              size="sm"
            >
              <Copy className="h-4 w-4" />
              Copy URL
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

      {/* Webhook Test Panel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Code className="h-5 w-5" />
            Webhook Payload Tester
          </CardTitle>
          <CardDescription>
            Test webhook endpoint with custom payload
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium">Test Payload (JSON)</label>
            <Textarea
              value={testWebhookPayload}
              onChange={(e) => setTestWebhookPayload(e.target.value)}
              className="mt-2 font-mono text-xs"
              rows={8}
              placeholder="Enter JSON payload..."
            />
          </div>
          
          <div className="flex gap-2">
            <Button 
              onClick={testWebhookEndpoint}
              disabled={loading}
              className="gap-2"
            >
              {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              Send Test Webhook
            </Button>
            <Button 
              variant="outline"
              onClick={() => setTestWebhookPayload(JSON.stringify(JSON.parse(testWebhookPayload), null, 2))}
            >
              Format JSON
            </Button>
          </div>

          {lastResponse && (
            <div className="mt-4">
              <div className="flex items-center gap-2 mb-2">
                <Eye className="h-4 w-4" />
                <span className="text-sm font-medium">Last Response</span>
                <Badge 
                  variant={lastResponse.status === 200 ? "default" : "destructive"}
                >
                  {lastResponse.status || "Error"}
                </Badge>
              </div>
              <ScrollArea className="h-32 w-full border rounded-md p-3">
                <pre className="text-xs font-mono">
                  {JSON.stringify(lastResponse, null, 2)}
                </pre>
              </ScrollArea>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Existing Components */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Webhook Status
            </CardTitle>
            <CardDescription>
              Monitor webhook connection and recent activity
            </CardDescription>
          </CardHeader>
          <CardContent>
            <WebhookStatus />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              API Sync Control
            </CardTitle>
            <CardDescription>
              Manual sync operations and monitoring
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RegFoxSyncPanel />
          </CardContent>
        </Card>
      </div>

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
              <div className="text-sm font-medium">Webhook Endpoint</div>
              <code className="text-xs bg-muted p-2 rounded block">
                {window.location.origin}/api/webhook/regfox
              </code>
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
