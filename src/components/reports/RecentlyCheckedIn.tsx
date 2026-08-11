import { getCurrentEventId } from "@/lib/eventRuntime";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserCheck, Phone, Zap, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatPhoneNumber } from "@/lib/phoneUtils";
import { formatStandardDateTimeET } from "@/utils/dateTimeUtils";
import { getStandardTimeBoundaries } from "@/utils/etTimezone";
import { SiteLocationBadge } from "@/components/shared/SiteLocationBadge";

interface AttendeeStatus {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  activatedAt: string | null;
  activationMethod: string | null;
  ticketType: string;
  orderInfo: string;
  arrivalWindow: string | null;
  siteLocation: string | null;
  scheduledArrivalDay: string;
  actualCheckInDay: string;
}

interface RecentlyCheckedInProps {
  refreshTrigger?: number;
}

export const RecentlyCheckedIn = ({ refreshTrigger }: RecentlyCheckedInProps) => {
  const [recentCheckIns, setRecentCheckIns] = useState<AttendeeStatus[]>([]);
  const [timeFilter, setTimeFilter] = useState("all");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchRecentCheckIns = async () => {
      try {
        // Use ET timezone boundaries for "today" calculation
        const todayBoundaries = getStandardTimeBoundaries('today');
        
        // Get recent check-ins using a cleaner approach
        const { data: recentData } = await supabase
          .from('rfid_tags')
          .select(`
            activated_at, activation_method, uid,
            attendees!inner(id, first_name, last_name, phone, email, ticket_type, order_id, arrival_window, site_location_assignment, created_at)
          `)
        .eq('event_id', getCurrentEventId())
          .eq('attendees.registration_status', 'registered')
          .not('activated_at', 'is', null)
          .gte('activated_at', todayBoundaries.start.toISOString())
          .lt('activated_at', todayBoundaries.end.toISOString())
          .order('activated_at', { ascending: false })
          .limit(100);

        const formatAttendeeData = (data: any[]): AttendeeStatus[] => {
          return data.map(item => {
            // For recent check-ins, data comes from rfid_tags with nested attendees
            const attendee = item.attendees;
            const rfidData = { activated_at: item.activated_at, activation_method: item.activation_method };
            
            // Map arrival_window to scheduled day like in RfidAssignment.tsx
            const getScheduledArrivalDay = (arrivalWindow: string | null): string => {
              return arrivalWindow === 'early' ? 'Thursday' : 'Friday';
            };

            // Extract actual check-in day from activated_at timestamp (in ET timezone)
            const getActualCheckInDay = (activatedAt: string): string => {
              const activatedDate = new Date(activatedAt);
              // Convert to ET timezone for day calculation
              const etDate = new Date(activatedDate.toLocaleString("en-US", {timeZone: "America/New_York"}));
              const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
              return dayNames[etDate.getDay()];
            };
            
            const scheduledDay = getScheduledArrivalDay(attendee.arrival_window);
            const actualDay = getActualCheckInDay(rfidData.activated_at);
            
            return {
              id: attendee.id,
              name: `${attendee.first_name} ${attendee.last_name}`,
              phone: attendee.phone,
              email: attendee.email,
              activatedAt: rfidData.activated_at,
              activationMethod: rfidData.activation_method,
              ticketType: attendee.ticket_type || 'Standard',
              orderInfo: attendee.order_id || 'No Order',
              arrivalWindow: attendee.arrival_window,
              siteLocation: attendee.site_location_assignment,
              scheduledArrivalDay: scheduledDay,
              actualCheckInDay: actualDay
            };
          });
        };

        setRecentCheckIns(formatAttendeeData(recentData || []));
      } catch (error) {
        console.error('Error fetching recent check-ins:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRecentCheckIns();
  }, [refreshTrigger]);

  // Filter recent check-ins by time
  const filteredRecent = recentCheckIns.filter(attendee => {
    if (!attendee.activatedAt) return false;
    
    const activatedTime = new Date(attendee.activatedAt);
    const now = new Date();
    const hoursDiff = (now.getTime() - activatedTime.getTime()) / (1000 * 60 * 60);
    
    switch (timeFilter) {
      case "1hour": return hoursDiff <= 1;
      case "4hours": return hoursDiff <= 4;
      case "all": return true;
      default: return true;
    }
  });

  // Helper function to get day comparison badge variant
  const getDayComparisonVariant = (scheduled: string, actual: string) => {
    if (scheduled === actual) return "secondary";
    return "outline";
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-success" />
            Recently Checked In
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-10 bg-muted rounded"></div>
            <div className="space-y-2">
              {[1,2,3,4,5].map(i => (
                <div key={i} className="h-12 bg-muted rounded"></div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserCheck className="h-5 w-5 text-success" />
          Recently Checked In
          <Badge variant="outline" className="text-success">
            {filteredRecent.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <Select value={timeFilter} onValueChange={setTimeFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1hour">Last Hour</SelectItem>
                <SelectItem value="4hours">Last 4 Hours</SelectItem>
                <SelectItem value="all">All Today</SelectItem>
              </SelectContent>
            </Select>
            <div className="text-sm text-muted-foreground">
              {filteredRecent.length} of {recentCheckIns.length} check-ins (ET timezone)
            </div>
          </div>
          <div className="border rounded-lg max-h-[500px] overflow-y-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-background">
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Ticket Type</TableHead>
                  <TableHead>Site Location</TableHead>
                  <TableHead>Scheduled Arrival</TableHead>
                  <TableHead>Actual Check-in</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRecent.slice(0, 50).map((attendee) => (
                  <TableRow key={attendee.id}>
                    <TableCell className="font-medium">{attendee.name}</TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {attendee.phone && (
                          <div className="flex items-center gap-1 text-sm">
                            <Phone className="h-3 w-3" />
                            {formatPhoneNumber(attendee.phone)}
                          </div>
                        )}
                        {attendee.email && (
                          <div className="text-xs text-muted-foreground truncate max-w-[150px]">
                            {attendee.email}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {attendee.ticketType}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <SiteLocationBadge 
                        siteLocationAssignment={attendee.siteLocation}
                        maxLength={15}
                        className="text-xs"
                      />
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        <Calendar className="h-3 w-3 mr-1" />
                        {attendee.scheduledArrivalDay}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={getDayComparisonVariant(attendee.scheduledArrivalDay, attendee.actualCheckInDay)} 
                        className="text-xs"
                      >
                        <Calendar className="h-3 w-3 mr-1" />
                        {attendee.actualCheckInDay}
                        {attendee.scheduledArrivalDay !== attendee.actualCheckInDay && (
                          <span className="ml-1 text-orange-500">⚠</span>
                        )}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {attendee.activationMethod && (
                        <Badge variant="outline" className="text-xs">
                          {attendee.activationMethod === 'self_activated' && (
                            <>
                              <Zap className="h-3 w-3 mr-1" />
                              Self
                            </>
                          )}
                          {attendee.activationMethod === 'staff_assisted' && (
                            <>
                              <UserCheck className="h-3 w-3 mr-1" />
                              Staff
                            </>
                          )}
                          {!['self_activated', 'staff_assisted'].includes(attendee.activationMethod) && (
                            attendee.activationMethod
                          )}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {attendee.activatedAt && (
                        <div className="text-sm">
                          {formatStandardDateTimeET(attendee.activatedAt)}
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};