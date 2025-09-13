import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertCircle, CheckCircle2, Webhook, Copy, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface WebhookStatusProps {
  className?: string;
}

export const WebhookStatus: React.FC<WebhookStatusProps> = ({ className }) => {
  const [webhookUrl, setWebhookUrl] = useState('');
  const [recentWebhooks, setRecentWebhooks] = useState<any[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Generate webhook URL
    const baseUrl = 'https://oglargpkunjeblfutekl.supabase.co/functions/v1';
    const url = `${baseUrl}/regfox-webhook`;
    setWebhookUrl(url);

    // Check recent webhook activity
    fetchRecentWebhooks();

    // Set up real-time subscription for webhook logs
    const channel = supabase
      .channel('webhook-activity')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'regfox_sync_log',
          filter: 'sync_type=eq.webhook'
        },
        () => {
          fetchRecentWebhooks();
          setIsConnected(true);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchRecentWebhooks = async () => {
    try {
      const { data, error } = await supabase
        .from('regfox_sync_log')
        .select('*')
        .eq('sync_type', 'webhook')
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;

      setRecentWebhooks(data || []);
      setIsConnected(data && data.length > 0);
    } catch (error) {
      console.error('Error fetching webhook activity:', error);
    }
  };

  const copyWebhookUrl = () => {
    navigator.clipboard.writeText(webhookUrl);
    toast.success('Webhook URL copied to clipboard!');
  };

  const testWebhook = async () => {
    try {
      // Test webhook endpoint
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          event: 'registration.created',
          data: {
            id: 'test_' + Date.now(),
            firstName: 'Test',
            lastName: 'User',
            email: 'test@example.com',
            registrationPath: 'Dry Site',
            registrationDate: new Date().toISOString(),
            status: 'confirmed'
          }
        })
      });

      if (response.ok) {
        toast.success('Webhook test successful!');
        fetchRecentWebhooks();
      } else {
        toast.error('Webhook test failed');
      }
    } catch (error) {
      toast.error('Webhook test failed: ' + error.message);
    }
  };

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Webhook className="h-5 w-5" />
            RegFox Webhook Status
          </CardTitle>
          <CardDescription>
            Real-time registration updates from RegFox
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Connection Status */}
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex items-center gap-3">
              {isConnected ? (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              ) : (
                <AlertCircle className="h-5 w-5 text-yellow-500" />
              )}
              <div>
                <p className="font-medium">
                  {isConnected ? 'Webhook Active' : 'Waiting for Connection'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {isConnected 
                    ? 'Receiving real-time updates from RegFox'
                    : 'Configure webhook in RegFox to enable real-time sync'
                  }
                </p>
              </div>
            </div>
            <Badge variant={isConnected ? 'default' : 'secondary'}>
              {isConnected ? 'Connected' : 'Pending'}
            </Badge>
          </div>

          {/* Webhook URL */}
          <div>
            <label className="text-sm font-medium mb-2 block">
              Webhook URL (Configure in RegFox)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={webhookUrl}
                readOnly
                className="flex-1 px-3 py-2 border rounded-md bg-muted text-sm font-mono"
              />
              <Button variant="outline" size="sm" onClick={copyWebhookUrl}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Test Controls */}
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={testWebhook}>
              Test Webhook
            </Button>
            <Button variant="outline" size="sm" onClick={fetchRecentWebhooks}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>

          {/* Recent Activity */}
          <div>
            <h4 className="font-medium mb-2">Recent Webhook Activity</h4>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {recentWebhooks.length > 0 ? (
                recentWebhooks.map((webhook) => (
                  <div key={webhook.id} className="flex items-center justify-between text-sm p-2 border rounded">
                    <div>
                      <span className="font-medium">Webhook received</span>
                      <p className="text-xs text-muted-foreground">
                        {new Date(webhook.created_at).toLocaleString()}
                      </p>
                    </div>
                    <Badge 
                      variant={webhook.status === 'success' ? 'default' : 'destructive'}
                      className="text-xs"
                    >
                      {webhook.status}
                    </Badge>
                  </div>
                ))
              ) : (
                <p className="text-center text-muted-foreground py-4 text-sm">
                  No webhook activity detected yet
                </p>
              )}
            </div>
          </div>

          {/* Setup Instructions */}
          <div className="bg-muted p-3 rounded-lg">
            <h4 className="font-medium mb-2 text-sm">Setup Instructions:</h4>
            <ol className="text-xs text-muted-foreground space-y-1">
              <li>1. Copy the webhook URL above</li>
              <li>2. Log into your RegFox admin panel</li>
              <li>3. Navigate to Event Settings → Webhooks</li>
              <li>4. Add the webhook URL for registration events</li>
              <li>5. Test the connection using the button above</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};