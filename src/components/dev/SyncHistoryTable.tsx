import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow, format } from "date-fns";
import { RefreshCw, Search, Filter, Database, Webhook, AlertCircle, CheckCircle, Clock, X } from "lucide-react";

interface SyncEvent {
  id: string;
  sync_type: string;
  status: string;
  total_records?: number;
  new_records?: number;
  updated_records?: number;
  sync_started_at: string;
  sync_completed_at?: string;
  error_message?: string;
  created_at: string;
}

interface WebhookEvent {
  id: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  ticket_type: string;
  created_at: string;
  registration_status: string;
}

type UnifiedEvent = {
  id: string;
  type: 'webhook' | 'api_sync';
  status: string;
  timestamp: string;
  duration?: number;
  records?: number;
  details: string;
  error?: string;
};

export const SyncHistoryTable = () => {
  const [events, setEvents] = useState<UnifiedEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  const fetchSyncHistory = async () => {
    try {
      // Fetch API sync events
      const { data: syncData, error: syncError } = await supabase
        .from('regfox_sync_log')
        .select('*')
        .order('sync_started_at', { ascending: false })
        .limit(100);

      if (syncError) throw syncError;

      // Fetch recent webhook events (attendee registrations)
      const { data: webhookData, error: webhookError } = await supabase
        .from('attendees')
        .select('id, first_name, last_name, email, phone, ticket_type, created_at, registration_status')
        .eq('registration_status', 'registered')
        .order('created_at', { ascending: false })
        .limit(100);

      if (webhookError) throw webhookError;

      // Transform sync events
      const syncEvents: UnifiedEvent[] = (syncData || []).map(sync => ({
        id: sync.id,
        type: 'api_sync' as const,
        status: sync.status,
        timestamp: sync.sync_started_at,
        duration: sync.sync_completed_at ? 
          Math.round((new Date(sync.sync_completed_at).getTime() - new Date(sync.sync_started_at).getTime()) / 1000) : 
          undefined,
        records: sync.total_records || 0,
        details: `${sync.sync_type} - ${sync.total_records || 0} total, ${sync.new_records || 0} new, ${sync.updated_records || 0} updated`,
        error: sync.error_message
      }));

      // Transform webhook events
      const webhookEvents: UnifiedEvent[] = (webhookData || []).map(webhook => ({
        id: webhook.id,
        type: 'webhook' as const,
        status: 'completed',
        timestamp: webhook.created_at,
        records: 1,
        details: `New registrant: ${webhook.first_name} ${webhook.last_name} (${webhook.ticket_type})`,
        error: undefined
      }));

      // Combine and sort by timestamp
      const allEvents = [...syncEvents, ...webhookEvents]
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      setEvents(allEvents);
    } catch (error) {
      console.error('Error fetching sync history:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSyncHistory();

    // Set up real-time subscription
    const channel = supabase
      .channel('sync-history')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'regfox_sync_log' },
        () => fetchSyncHistory()
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'attendees' },
        () => fetchSyncHistory()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const filteredEvents = events.filter(event => {
    const matchesSearch = searchTerm === "" || 
      event.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.id.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || event.status === statusFilter;
    const matchesType = typeFilter === "all" || event.type === typeFilter;
    
    return matchesSearch && matchesStatus && matchesType;
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'in_progress': return <Clock className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'error': return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'cancelled': return <X className="h-4 w-4 text-gray-500" />;
      default: return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      completed: "bg-green-500/10 text-green-700 border-green-500/20",
      in_progress: "bg-blue-500/10 text-blue-700 border-blue-500/20",
      error: "bg-red-500/10 text-red-700 border-red-500/20",
      cancelled: "bg-gray-500/10 text-gray-700 border-gray-500/20"
    };
    
    return (
      <Badge variant="outline" className={variants[status] || variants.cancelled}>
        {status.replace('_', ' ')}
      </Badge>
    );
  };

  const getTypeIcon = (type: string) => {
    return type === 'webhook' ? 
      <Webhook className="h-4 w-4 text-blue-500" /> : 
      <Database className="h-4 w-4 text-green-500" />;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Unified Sync History
              </CardTitle>
              <CardDescription>
                Combined view of webhook registrations and API sync operations
              </CardDescription>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={fetchSyncHistory}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search events..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="webhook">Webhook</SelectItem>
                <SelectItem value="api_sync">API Sync</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="error">Error</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <ScrollArea className="h-[500px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">Type</TableHead>
                  <TableHead className="w-[120px]">Status</TableHead>
                  <TableHead className="w-[150px]">Timestamp</TableHead>
                  <TableHead className="w-[100px]">Duration</TableHead>
                  <TableHead className="w-[100px]">Records</TableHead>
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEvents.map((event) => (
                  <TableRow key={`${event.type}-${event.id}`}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getTypeIcon(event.type)}
                        <span className="text-sm font-medium">
                          {event.type === 'webhook' ? 'Webhook' : 'API Sync'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(event.status)}
                        {getStatusBadge(event.status)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="text-sm">{format(new Date(event.timestamp), 'MMM d, HH:mm')}</div>
                        <div className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(event.timestamp), { addSuffix: true })}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {event.duration !== undefined ? `${event.duration}s` : '-'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{event.records || 0}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="text-sm">{event.details}</div>
                        {event.error && (
                          <div className="text-xs text-red-600 bg-red-50 p-1 rounded">
                            {event.error}
                          </div>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            
            {filteredEvents.length === 0 && !loading && (
              <div className="text-center py-8 text-muted-foreground">
                <Filter className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No events found matching your filters</p>
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};