import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow, format } from "date-fns";
import { RefreshCw, Search, Filter, Database, Webhook, AlertCircle, CheckCircle, Clock, X, HelpCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useEvent } from "@/contexts/EventContext";

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
  const { eventId, selectedEvent } = useEvent();
  const [events, setEvents] = useState<UnifiedEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  const fetchSyncHistory = async () => {
    if (!eventId) return;
    try {
      // Fetch API sync events
      const { data: syncData, error: syncError } = await supabase
        .from('regfox_sync_log')
        .select('*')
        .eq('event_id', eventId)
        .order('sync_started_at', { ascending: false })
        .limit(100);

      if (syncError) throw syncError;

      // Fetch actual webhook deliveries, not attendee inserts.
      const { data: webhookData, error: webhookError } = await supabase
        .from('regfox_webhook_deliveries')
        .select('id,event_type,status,received_at,regfox_registration_id,error_message')
        .eq('regfox_form_id', selectedEvent?.regfox_form_id ?? '')
        .order('received_at', { ascending: false })
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
        status: webhook.status === 'processed' ? 'success' : webhook.status,
        timestamp: webhook.received_at,
        records: 1,
        details: `${webhook.event_type ?? 'Registration change'} · registration ${webhook.regfox_registration_id ?? 'not supplied'}`,
        error: webhook.error_message ?? undefined
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
  }, [eventId, selectedEvent?.regfox_form_id]);

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
      case 'success': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'partial': return <AlertCircle className="h-4 w-4 text-amber-500" />;
      case 'in_progress': return <Clock className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'error': return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'cancelled': return <X className="h-4 w-4 text-gray-500" />;
      default: return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      completed: "bg-green-500/10 text-green-700 border-green-500/20",
      success: "bg-green-500/10 text-green-700 border-green-500/20",
      partial: "bg-amber-500/10 text-amber-700 border-amber-500/20",
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
                Actual RegFox webhook deliveries and API sync operations for this event
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
                <SelectItem value="success">Success</SelectItem>
                <SelectItem value="partial">Partial</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="error">Error</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <TooltipProvider>
            <div className="grid gap-3 lg:hidden sm:grid-cols-2">
              {filteredEvents.map((event) => (
                <article key={`card-${event.type}-${event.id}`} className="space-y-3 rounded-md border p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {getTypeIcon(event.type)}
                      <span className="font-medium">{event.type === 'webhook' ? 'Webhook' : 'API Sync'}</span>
                    </div>
                    {getStatusBadge(event.status)}
                  </div>
                  <dl className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <dt className="text-xs text-muted-foreground">Time</dt>
                      <dd>{format(new Date(event.timestamp), 'MMM d, HH:mm')}</dd>
                      <dd className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(event.timestamp), { addSuffix: true })}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">Processed</dt>
                      <dd>{event.records || 0} record{event.records === 1 ? '' : 's'}</dd>
                      <dd className="text-xs text-muted-foreground">{event.duration !== undefined ? `${event.duration}s` : 'No duration'}</dd>
                    </div>
                  </dl>
                  <p className="break-words text-sm">{event.details}</p>
                  {event.error && <p className="rounded bg-destructive/10 p-2 text-xs text-destructive">{event.error}</p>}
                </article>
              ))}
            </div>
            <div className="hidden overflow-x-auto rounded-md border lg:block">
              <Table className="min-w-[820px] table-fixed">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[14%]">Type</TableHead>
                    <TableHead className="w-[16%]">Status</TableHead>
                    <TableHead className="w-[18%]">Timestamp</TableHead>
                    <TableHead className="w-[10%]">Duration</TableHead>
                    <TableHead className="w-[10%]">
                      <div className="flex items-center gap-1">
                        Records
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <HelpCircle className="h-3 w-3 text-muted-foreground cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="text-xs max-w-[200px]">
                              Number of records processed. API syncs process in batches of 50 for performance. 
                              Webhook events process 1 record each.
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    </TableHead>
                    <TableHead className="w-[32%]">Details</TableHead>
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
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Badge variant="secondary" className="cursor-help">
                              {event.records || 0}
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="text-xs max-w-[200px]">
                              {event.type === 'api_sync' && event.records === 50 
                                ? "This sync processed 50 records in a batch. Large datasets are processed incrementally for better performance."
                                : event.type === 'webhook' 
                                  ? "Webhook events process one registration record at a time."
                                  : `This sync processed ${event.records} record(s).`
                              }
                            </p>
                          </TooltipContent>
                        </Tooltip>
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
            </div>
            {filteredEvents.length === 0 && !loading && (
              <div className="text-center py-8 text-muted-foreground">
                <Filter className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No events found matching your filters</p>
              </div>
            )}
          </TooltipProvider>
        </CardContent>
      </Card>
    </div>
  );
};