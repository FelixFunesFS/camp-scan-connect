import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle, 
  Users, 
  Calendar,
  Database,
  ExternalLink
} from "lucide-react";
import type { DatabaseTotals, TotalsComparison } from "@/services/regfoxService";

interface RegFoxTotalsComparisonProps {
  onRefresh?: () => void;
}

export const RegFoxTotalsComparison: React.FC<RegFoxTotalsComparisonProps> = ({ onRefresh }) => {
  const [totals, setTotals] = useState<DatabaseTotals | null>(null);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { toast } = useToast();

  const fetchDatabaseTotals = async () => {
    try {
      // Get attendee counts and breakdown
      const { data: attendeesData, error: attendeesError } = await supabase
        .from('attendees')
        .select('ticket_type, order_id, activated_at, id');

      if (attendeesError) throw attendeesError;

      // Get RFID counts
      const { data: rfidData, error: rfidError } = await supabase
        .from('rfid_tags')
        .select('attendee_id, status')
        .eq('status', 'active');

      if (rfidError) throw rfidError;

      // Get last sync info
      const { data: syncData, error: syncError } = await supabase
        .from('regfox_sync_log')
        .select('sync_completed_at, status')
        .eq('status', 'completed')
        .order('sync_completed_at', { ascending: false })
        .limit(1);

      if (syncError) throw syncError;

      // Calculate totals
      const ticketBreakdown = {
        dry_site: attendeesData.filter(a => a.ticket_type === 'dry_site').length,
        glamping: attendeesData.filter(a => a.ticket_type === 'glamping').length,
        cabin: attendeesData.filter(a => a.ticket_type === 'cabin').length,
        rv_site: attendeesData.filter(a => a.ticket_type === 'rv_site').length,
      };

      const uniqueOrderIds = new Set(
        attendeesData
          .map(a => a.order_id)
          .filter(id => id && id.trim())
      );

      const dbTotals: DatabaseTotals = {
        total_attendees: attendeesData.length,
        unique_orders: uniqueOrderIds.size,
        with_order_ids: attendeesData.filter(a => a.order_id && a.order_id.trim()).length,
        ticket_breakdown: ticketBreakdown,
        activated_count: attendeesData.filter(a => a.activated_at).length,
        with_rfid: rfidData.length,
        last_sync: syncData?.[0]?.sync_completed_at || null
      };

      setTotals(dbTotals);
      setLastSync(syncData?.[0]?.sync_completed_at || null);
    } catch (error) {
      console.error('Error fetching database totals:', error);
      toast({
        title: "Error",
        description: "Failed to fetch database totals",
        variant: "destructive"
      });
    }
  };

  const handleManualSync = async () => {
    setIsRefreshing(true);
    try {
      const { data, error } = await supabase.functions.invoke('regfox-manual-sync');
      
      if (error) throw error;
      
      toast({
        title: "Sync Started",
        description: "RegFox sync has been initiated. This may take a few minutes.",
      });
      
      // Refresh data after a short delay
      setTimeout(() => {
        fetchDatabaseTotals();
        onRefresh?.();
      }, 2000);
    } catch (error) {
      console.error('Error starting sync:', error);
      toast({
        title: "Sync Failed",
        description: "Failed to start RegFox sync. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await fetchDatabaseTotals();
      setIsLoading(false);
    };
    
    loadData();
  }, []);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <RefreshCw className="h-4 w-4 animate-spin mr-2" />
            <span>Loading totals...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!totals) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            Failed to load database totals
          </div>
        </CardContent>
      </Card>
    );
  }

  const getSyncStatus = () => {
    if (!lastSync) {
      return (
        <Badge variant="destructive">
          <AlertTriangle className="h-3 w-3 mr-1" />
          No Sync
        </Badge>
      );
    }

    const syncDate = new Date(lastSync);
    const hoursAgo = (Date.now() - syncDate.getTime()) / (1000 * 60 * 60);
    
    if (hoursAgo < 2) {
      return (
        <Badge variant="default">
          <CheckCircle className="h-3 w-3 mr-1" />
          Recent
        </Badge>
      );
    } else if (hoursAgo < 24) {
      return (
        <Badge variant="secondary">
          <Calendar className="h-3 w-3 mr-1" />
          {Math.round(hoursAgo)}h ago
        </Badge>
      );
    } else {
      return (
        <Badge variant="outline">
          <Calendar className="h-3 w-3 mr-1" />
          {Math.round(hoursAgo / 24)}d ago
        </Badge>
      );
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Database className="h-5 w-5" />
            Database Totals
          </CardTitle>
          <div className="flex items-center gap-2">
            {getSyncStatus()}
            <Button
              variant="outline"
              size="sm"
              onClick={handleManualSync}
              disabled={isRefreshing}
            >
              {isRefreshing ? (
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Sync RegFox
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <div className="text-2xl font-bold text-primary">{totals.total_attendees}</div>
            <div className="text-sm text-muted-foreground">Total Attendees</div>
          </div>
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{totals.unique_orders}</div>
            <div className="text-sm text-muted-foreground">Unique Orders</div>
          </div>
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">{totals.activated_count}</div>
            <div className="text-sm text-muted-foreground">Activated</div>
          </div>
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <div className="text-2xl font-bold text-purple-600">{totals.with_rfid}</div>
            <div className="text-sm text-muted-foreground">With RFID</div>
          </div>
        </div>

        <Separator />

        {/* Ticket Type Breakdown */}
        <div>
          <h3 className="font-medium mb-3 flex items-center gap-2">
            <Users className="h-4 w-4" />
            Ticket Type Breakdown
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <div className="flex justify-between items-center p-2 bg-muted/30 rounded">
              <span className="text-sm">Dry Site:</span>
              <Badge variant="outline">{totals.ticket_breakdown.dry_site}</Badge>
            </div>
            <div className="flex justify-between items-center p-2 bg-muted/30 rounded">
              <span className="text-sm">Glamping:</span>
              <Badge variant="outline">{totals.ticket_breakdown.glamping}</Badge>
            </div>
            <div className="flex justify-between items-center p-2 bg-muted/30 rounded">
              <span className="text-sm">Cabin:</span>
              <Badge variant="outline">{totals.ticket_breakdown.cabin}</Badge>
            </div>
            <div className="flex justify-between items-center p-2 bg-muted/30 rounded">
              <span className="text-sm">RV Site:</span>
              <Badge variant="outline">{totals.ticket_breakdown.rv_site}</Badge>
            </div>
          </div>
        </div>

        {/* Last Sync Info */}
        {lastSync && (
          <div className="text-xs text-muted-foreground text-center pt-2 border-t">
            Last RegFox sync: {new Date(lastSync).toLocaleString()}
          </div>
        )}
      </CardContent>
    </Card>
  );
};