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
  AlertCircle 
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import EquipmentTracker from "@/components/reports/EquipmentTracker";

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

  useEffect(() => {
    const fetchEquipmentStats = async () => {
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
            color: 'text-green-600'
          },
          {
            type: 'walkie_talkies',
            name: 'Walkie Talkies',
            icon: <Radio className="h-6 w-6" />,
            checkoutType: 'walkie_talkie_checkout',
            checkinType: 'walkie_talkie_checkin',
            stationPath: '/walkie-talkies-station',
            color: 'text-orange-600'
          },
          {
            type: 'fanny_packs',
            name: 'Fanny Packs',
            icon: <Package className="h-6 w-6" />,
            checkoutType: 'fanny_pack_checkout',
            checkinType: 'fanny_pack_checkin',
            stationPath: '/fanny-packs-station',
            color: 'text-purple-600'
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
      } catch (error) {
        console.error('Error fetching equipment stats:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchEquipmentStats();
  }, []);

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
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Equipment Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {equipmentStats.map((equipment) => (
            <Card key={equipment.type} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className={`p-3 bg-muted rounded-lg ${equipment.color}`}>
                    {equipment.icon}
                  </div>
                  {equipment.currentlyOut > 0 && (
                    <Badge variant="outline" className="text-warning">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      {equipment.currentlyOut}
                    </Badge>
                  )}
                </div>
                <CardTitle className="text-lg">{equipment.name}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">

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
                />
                
                <Link to={equipment.stationPath}>
                  <Button className="w-full" variant="outline">
                    Open {equipment.name} Station
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}