import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Package, Clock, User, Phone, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatPhoneNumber } from "@/lib/phoneUtils";
import { TimePeriod, getTimeBoundaries, formatTimePeriod } from "@/utils/etTimezone";

interface FannyPackCheckout {
  id: string;
  attendeeName: string;
  phone: string | null;
  checkoutTime: string;
  duration: string;
  rfidUid: string;
}

interface FannyPackStats {
  currentlyCheckedOut: number;
  totalCheckouts: number;
  averageUsageMinutes: number;
  longestUsageMinutes: number;
}

interface FannyPacksTrackerProps {
  selectedPeriod: TimePeriod;
}

export const FannyPacksTracker = ({ selectedPeriod }: FannyPacksTrackerProps) => {
  const [checkouts, setCheckouts] = useState<FannyPackCheckout[]>([]);
  const [stats, setStats] = useState<FannyPackStats>({
    currentlyCheckedOut: 0,
    totalCheckouts: 0,
    averageUsageMinutes: 0,
    longestUsageMinutes: 0
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchFannyPackData = async () => {
      try {
        const boundaries = getTimeBoundaries(selectedPeriod);
        
        const { data: currentCheckouts } = await supabase
          .from('station_transactions')
          .select('id, attendee_id, rfid_uid, created_at')
          .eq('station_type', 'fanny_packs' as any)
          .eq('transaction_type', 'fanny_pack_checkout' as any)
          .gte('created_at', boundaries.start.toISOString())
          .lt('created_at', boundaries.end.toISOString());

        const attendeeIds = currentCheckouts?.map(co => co.attendee_id) || [];
        let attendeesData: any[] = [];
        if (attendeeIds.length > 0) {
          const { data } = await supabase
            .from('attendees')
            .select('id, first_name, last_name, phone')
            .in('id', attendeeIds);
          attendeesData = data || [];
        }

        const attendeesMap = new Map<string, any>();
        attendeesData.forEach(a => {
          attendeesMap.set(a.id, a);
        });

        const { data: checkins } = await supabase
          .from('station_transactions')
          .select('attendee_id, created_at')
          .eq('station_type', 'fanny_packs' as any)
          .eq('transaction_type', 'fanny_pack_checkin' as any)
          .gte('created_at', boundaries.start.toISOString())
          .lt('created_at', boundaries.end.toISOString());

        const checkinAttendeeIds = new Set(checkins?.map(c => c.attendee_id) || []);
        const activeCheckouts = currentCheckouts?.filter(
          co => !checkinAttendeeIds.has(co.attendee_id)
        ) || [];

        const formattedCheckouts: FannyPackCheckout[] = activeCheckouts.map(checkout => {
          const attendee = attendeesMap.get(checkout.attendee_id);
          const checkoutTime = new Date(checkout.created_at);
          const now = new Date();
          const durationMs = now.getTime() - checkoutTime.getTime();
          const durationMinutes = Math.floor(durationMs / (1000 * 60));
          const hours = Math.floor(durationMinutes / 60);
          const minutes = durationMinutes % 60;
          
          return {
            id: checkout.id,
            attendeeName: attendee ? `${attendee.first_name} ${attendee.last_name}` : 'Unknown Attendee',
            phone: attendee?.phone || null,
            checkoutTime: checkout.created_at,
            duration: hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`,
            rfidUid: checkout.rfid_uid || 'Unknown'
          };
        });

        const { data: allCheckouts } = await supabase
          .from('station_transactions')
          .select(`
            attendee_id,
            created_at,
            transaction_type
          `)
          .eq('station_type', 'fanny_packs' as any)
          .in('transaction_type', ['fanny_pack_checkout', 'fanny_pack_checkin'] as any)
          .gte('created_at', boundaries.start.toISOString())
          .lt('created_at', boundaries.end.toISOString())
          .order('created_at', { ascending: true });

        let totalUsageMinutes = 0;
        let completedSessions = 0;
        let maxUsage = 0;

        if (allCheckouts) {
          const sessionMap = new Map<string, Date>();
          
          allCheckouts.forEach(transaction => {
            const key = transaction.attendee_id;
            const time = new Date(transaction.created_at);
            
            if (transaction.transaction_type === 'fanny_pack_checkout') {
              sessionMap.set(key, time);
            } else if (transaction.transaction_type === 'fanny_pack_checkin' && sessionMap.has(key)) {
              const checkoutTime = sessionMap.get(key)!;
              const usageMinutes = Math.floor((time.getTime() - checkoutTime.getTime()) / (1000 * 60));
              totalUsageMinutes += usageMinutes;
              maxUsage = Math.max(maxUsage, usageMinutes);
              completedSessions++;
              sessionMap.delete(key);
            }
          });
        }

        const totalCheckoutsToday = currentCheckouts?.length || 0;
        const avgUsage = completedSessions > 0 ? Math.round(totalUsageMinutes / completedSessions) : 0;

        setCheckouts(formattedCheckouts);
        setStats({
          currentlyCheckedOut: activeCheckouts.length,
          totalCheckouts: totalCheckoutsToday,
          averageUsageMinutes: avgUsage,
          longestUsageMinutes: maxUsage
        });

      } catch (error) {
        console.error('Error fetching fanny pack data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchFannyPackData();
  }, [selectedPeriod]);

  const formatUsageTime = (minutes: number): string => {
    if (minutes === 0) return '0m';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Fanny Packs Tracking
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="grid grid-cols-4 gap-4">
              {[1,2,3,4].map(i => (
                <div key={i} className="h-16 bg-muted rounded"></div>
              ))}
            </div>
            <div className="h-32 bg-muted rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Fanny Packs Tracking - {formatTimePeriod(selectedPeriod)}
          </div>
          <Badge 
            variant={stats.currentlyCheckedOut > 0 ? "default" : "outline"}
            className={stats.currentlyCheckedOut > 0 ? "bg-warning" : ""}
          >
            {stats.currentlyCheckedOut} Currently Out
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-warning/10 rounded-lg">
            <Package className="h-6 w-6 text-warning mx-auto mb-2" />
            <div className="text-2xl font-bold text-warning">{stats.currentlyCheckedOut}</div>
            <div className="text-sm text-muted-foreground">Currently Out</div>
          </div>
          
          <div className="text-center p-4 bg-info/10 rounded-lg">
            <User className="h-6 w-6 text-info mx-auto mb-2" />
            <div className="text-2xl font-bold text-info">{stats.totalCheckouts}</div>
            <div className="text-sm text-muted-foreground">Total Checkouts</div>
          </div>
          
          <div className="text-center p-4 bg-success/10 rounded-lg">
            <Clock className="h-6 w-6 text-success mx-auto mb-2" />
            <div className="text-2xl font-bold text-success">
              {formatUsageTime(stats.averageUsageMinutes)}
            </div>
            <div className="text-sm text-muted-foreground">Average Usage</div>
          </div>
          
          <div className="text-center p-4 bg-primary/10 rounded-lg">
            <AlertCircle className="h-6 w-6 text-primary mx-auto mb-2" />
            <div className="text-2xl font-bold text-primary">
              {formatUsageTime(stats.longestUsageMinutes)}
            </div>
            <div className="text-sm text-muted-foreground">Longest Session</div>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-semibold">Currently Checked Out</h4>
            {checkouts.length > 0 && (
              <Badge variant="outline" className="text-warning">
                <AlertCircle className="h-3 w-3 mr-1" />
                Action Needed
              </Badge>
            )}
          </div>
          
          {checkouts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No fanny packs currently checked out</p>
              <p className="text-sm">All equipment returned ✓</p>
            </div>
          ) : (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Attendee</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Checkout Time</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>RFID</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {checkouts.map((checkout) => {
                    const durationMinutes = parseInt(checkout.duration.replace(/[^\d]/g, ''));
                    const isLongDuration = durationMinutes > 360; // 6+ hours
                    
                    return (
                      <TableRow key={checkout.id} className={isLongDuration ? "bg-warning/5" : ""}>
                        <TableCell className="font-medium">{checkout.attendeeName}</TableCell>
                        <TableCell>
                          {checkout.phone && (
                            <div className="flex items-center gap-1 text-sm">
                              <Phone className="h-3 w-3" />
                              {formatPhoneNumber(checkout.phone)}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {new Date(checkout.checkoutTime).toLocaleTimeString()}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className={`font-medium ${isLongDuration ? 'text-warning' : ''}`}>
                            {checkout.duration}
                            {isLongDuration && (
                              <AlertCircle className="h-3 w-3 inline ml-1" />
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs font-mono">
                            {checkout.rfidUid}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};