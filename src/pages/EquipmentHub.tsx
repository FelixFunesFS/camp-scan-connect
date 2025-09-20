import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import { 
  Car, 
  Radio, 
  Package, 
  ArrowLeft, 
  Activity,
  Timer,
  AlertCircle,
  RefreshCw 
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import EquipmentTracker from "@/components/reports/EquipmentTracker";
import { useEnhancedBackgroundRefresh } from "@/hooks/useEnhancedBackgroundRefresh";
import { formatStandardDateTime } from "@/utils/dateTimeUtils";

interface EquipmentStats {
  type: string;
  name: string;
  icon: React.ReactNode;
  currentlyOut: number;
  totalToday: number;
  averageUsage: string;
  stationPath: string;
  color: string;
}

export default function EquipmentHub() {
  const navigate = useNavigate();
  const [equipmentStats, setEquipmentStats] = useState<EquipmentStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const fetchEquipmentStats = useCallback(async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Fetch all equipment transactions for today
      const { data: transactions } = await supabase
        .from('station_transactions')
        .select('station_type, transaction_type, created_at, attendee_id')
        .in('station_type', ['golf_carts', 'walkie_talkies', 'fanny_packs'] as any)
        .gte('created_at', today);

      // Process stats for each equipment type
      const equipmentTypes = [
        {
          type: 'golf_carts',
          name: 'Golf Carts',
          icon: <Car className="h-6 w-6" />,
          checkoutType: 'golf_cart_checkout',
          checkinType: 'golf_cart_checkin',
          stationPath: '/golf-carts-station',
          color: 'text-primary'
        },
        {
          type: 'walkie_talkies',
          name: 'Walkie Talkies',
          icon: <Radio className="h-6 w-6" />,
          checkoutType: 'walkie_talkie_checkout',
          checkinType: 'walkie_talkie_checkin',
          stationPath: '/walkie-talkies-station',
          color: 'text-warning'
        },
        {
          type: 'fanny_packs',
          name: 'Fanny Packs',
          icon: <Package className="h-6 w-6" />,
          checkoutType: 'fanny_pack_checkout',
          checkinType: 'fanny_pack_checkin',
          stationPath: '/fanny-packs-station',
          color: 'text-secondary'
        }
      ];

      const stats: EquipmentStats[] = equipmentTypes.map(equipment => {
        const equipmentTransactions = transactions?.filter(
          t => t.station_type === equipment.type
        ) || [];

        const checkouts = equipmentTransactions.filter(
          t => t.transaction_type === equipment.checkoutType
        );

        const checkins = equipmentTransactions.filter(
          t => t.transaction_type === equipment.checkinType
        );

        const checkinAttendeeIds = new Set(checkins.map(c => c.attendee_id));
        const currentlyOut = checkouts.filter(
          c => !checkinAttendeeIds.has(c.attendee_id)
        ).length;

        // Calculate average usage for completed sessions
        let totalUsageMinutes = 0;
        let completedSessions = 0;
        const sessionMap = new Map<string, Date>();

        equipmentTransactions
          .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
          .forEach(transaction => {
            const attendeeId = transaction.attendee_id;
            const time = new Date(transaction.created_at);
            
            if (transaction.transaction_type === equipment.checkoutType) {
              sessionMap.set(attendeeId, time);
            } else if (transaction.transaction_type === equipment.checkinType && sessionMap.has(attendeeId)) {
              const checkoutTime = sessionMap.get(attendeeId)!;
              const usageMinutes = Math.floor((time.getTime() - checkoutTime.getTime()) / (1000 * 60));
              totalUsageMinutes += usageMinutes;
              completedSessions++;
              sessionMap.delete(attendeeId);
            }
          });

        const avgUsageMinutes = completedSessions > 0 ? Math.round(totalUsageMinutes / completedSessions) : 0;
        const avgUsageFormatted = avgUsageMinutes > 60 
          ? `${Math.floor(avgUsageMinutes / 60)}h ${avgUsageMinutes % 60}m`
          : `${avgUsageMinutes}m`;

        return {
          type: equipment.type,
          name: equipment.name,
          icon: equipment.icon,
          currentlyOut,
          totalToday: checkouts.length,
          averageUsage: avgUsageFormatted,
          stationPath: equipment.stationPath,
          color: equipment.color
        };
      });

      setEquipmentStats(stats);
      setRefreshTrigger(prev => prev + 1);
    } catch (error) {
      console.error('Error fetching equipment stats:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Enhanced background refresh with better UX
  const { isRefreshing, lastUpdated, manualRefresh } = useEnhancedBackgroundRefresh({
    onRefresh: fetchEquipmentStats,
    interval: 30000,
    onSuccess: () => {
      // Subtle success indication could be added here
    },
    onError: (error) => {
      console.error('Background refresh failed:', error);
      // Don't show toast for background refresh failures to avoid spam
    }
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 p-4">
        <div className="max-w-6xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-20 bg-muted rounded-lg"></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[1,2,3].map(i => (
                <div key={i} className="h-64 bg-muted rounded-lg"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const totalCurrentlyOut = equipmentStats.reduce((sum, stat) => sum + stat.currentlyOut, 0);
  const totalCheckoutsToday = equipmentStats.reduce((sum, stat) => sum + stat.totalToday, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate('/')}
                  className="flex items-center gap-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to Dashboard
                </Button>
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-6 w-6" />
                    Staff Equipment Hub
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Staff equipment checkout and management system
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <Badge variant="outline" className="text-lg px-4 py-2">
                  <Timer className="h-4 w-4 mr-2" />
                  {totalCurrentlyOut} Currently Out
                </Badge>
                <Badge variant="outline" className="text-lg px-4 py-2">
                  <Activity className="h-4 w-4 mr-2" />
                  {totalCheckoutsToday} Today
                </Badge>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  {isRefreshing && (
                    <div className="h-3 w-3 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent"></div>
                  )}
                  <span>
                    {lastUpdated ? `Updated ${formatStandardDateTime(lastUpdated, { compact: true })}` : 'Loading...'}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={manualRefresh}
                    disabled={isRefreshing}
                    className="h-6 px-2 text-xs hover:bg-muted/50"
                  >
                    <RefreshCw className={`h-3 w-3 ${isRefreshing ? 'animate-spin' : ''}`} />
                  </Button>
                </div>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Equipment Sections */}
        <div className="space-y-6">
          {equipmentStats.map((equipment) => (
            <Card key={equipment.type}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-3 bg-muted rounded-lg ${equipment.color}`}>
                      {equipment.icon}
                    </div>
                    <div>
                      <CardTitle className="text-xl">{equipment.name}</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        Equipment management and tracking
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {equipment.currentlyOut > 0 && (
                      <Badge variant="outline" className="text-warning">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        {equipment.currentlyOut} Active
                      </Badge>
                    )}
                    <Link to={equipment.stationPath}>
                      <Button variant="outline">
                        Open Station
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Summary Stats */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-warning/10 rounded-lg">
                    <div className="text-2xl font-bold text-warning">{equipment.currentlyOut}</div>
                    <div className="text-sm text-muted-foreground">Currently Out</div>
                  </div>
                  <div className="text-center p-4 bg-info/10 rounded-lg">
                    <div className="text-2xl font-bold text-info">{equipment.totalToday}</div>
                    <div className="text-sm text-muted-foreground">Total Today</div>
                  </div>
                  <div className="text-center p-4 bg-success/10 rounded-lg">
                    <div className="text-lg font-bold text-success">{equipment.averageUsage}</div>
                    <div className="text-sm text-muted-foreground">Average Usage</div>
                  </div>
                </div>

                {/* Detailed Checkout Table - Only show if items are checked out */}
                {equipment.currentlyOut > 0 && (
                  <div className="pt-4 border-t">
                    <h4 className="text-lg font-semibold mb-3 flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-warning" />
                      Currently Checked Out
                    </h4>
                    <EquipmentTracker
                      equipmentType={equipment.type as any}
                      equipmentName={equipment.name}
                      checkoutType={
                        equipment.type === 'golf_carts' ? 'golf_cart_checkout' :
                        equipment.type === 'walkie_talkies' ? 'walkie_talkie_checkout' :
                        'fanny_pack_checkout'
                      }
                      checkinType={
                        equipment.type === 'golf_carts' ? 'golf_cart_checkin' :
                        equipment.type === 'walkie_talkies' ? 'walkie_talkie_checkin' :
                        'fanny_pack_checkin'
                      }
                      icon={equipment.icon}
                      timePeriod="today"
                      refreshTrigger={refreshTrigger}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}