import { getCurrentEventId } from "@/lib/eventRuntime";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserCheck, Phone, Zap, Calendar } from "lucide-react";
import { buildSiteAssignment } from '@/utils/siteLocationUtils';
import { supabase } from "@/integrations/supabase/client";
import { formatPhoneNumber } from "@/lib/phoneUtils";
import { formatStandardDateTimeET } from "@/utils/dateTimeUtils";
import { getStandardTimeBoundaries } from "@/utils/etTimezone";
import { SiteLocationBadge } from "@/components/shared/SiteLocationBadge";
import { MobileAttendeeCard } from "./MobileTableCard";
import { formatTicketType } from "@/lib/ticketTypes";

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
  embedded?: boolean;
}

export const RecentlyCheckedIn = ({ refreshTrigger, embedded = false }: RecentlyCheckedInProps) => {
  const [recentCheckIns, setRecentCheckIns] = useState<AttendeeStatus[]>([]);
  const [timeFilter, setTimeFilter] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

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
            attendees!inner(id, first_name, last_name, phone, email, ticket_type, order_id, arrival_window, site_location_assignment, site_detail, created_at)
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
              siteLocation: buildSiteAssignment(attendee.ticket_type, (attendee as any).site_detail, attendee.site_location_assignment),
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

  const totalPages = Math.max(1, Math.ceil(filteredRecent.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * PAGE_SIZE;
  const pagedRecent = filteredRecent.slice(pageStart, pageStart + PAGE_SIZE);

  const pagination = (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pt-2">
      <p className="text-xs text-muted-foreground">
        {filteredRecent.length === 0
          ? 'No check-ins in this time range.'
          : `Showing ${pageStart + 1}–${Math.min(pageStart + PAGE_SIZE, filteredRecent.length)} of ${filteredRecent.length} • Page ${currentPage} of ${totalPages}`}
      </p>
      {totalPages > 1 && (
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="min-h-11 flex-1 sm:flex-none"
            disabled={currentPage <= 1}
            onClick={() => setPage(p => Math.max(1, p - 1))}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="min-h-11 flex-1 sm:flex-none"
            disabled={currentPage >= totalPages}
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );

  // Helper function to get day comparison badge variant
  const getDayComparisonVariant = (scheduled: string, actual: string) => {
    if (scheduled === actual) return "secondary";
    return "outline";
  };

  if (isLoading) {
    const skeleton = (
      <div className="animate-pulse space-y-4">
        <div className="h-10 bg-muted rounded"></div>
        <div className="space-y-2">
          {[1,2,3,4,5].map(i => (
            <div key={i} className="h-12 bg-muted rounded"></div>
          ))}
        </div>
      </div>
    );

    if (embedded) return skeleton;

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-success" />
            Recently Checked In
          </CardTitle>
        </CardHeader>
        <CardContent>{skeleton}</CardContent>
      </Card>
    );
  }

  const body = (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
            <Select value={timeFilter} onValueChange={(v) => { setTimeFilter(v); setPage(1); }}>
              <SelectTrigger className="w-full sm:w-[180px]">
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
          {/* Phone and tablet cards — no nested scrolling, paginated 10 at a time */}
          <div className="grid gap-3 lg:hidden sm:grid-cols-2">
            {pagedRecent.map((attendee) => (
              <MobileAttendeeCard key={attendee.id} attendee={attendee} />
            ))}
            {pagination}
          </div>
          <div className="hidden overflow-x-auto rounded-lg border lg:block">
            <Table className="min-w-[920px] table-fixed">
              <TableHeader className="sticky top-0 bg-background">
                <TableRow>
                  <TableHead scope="col" className="w-[28%]">Camper &amp; Contact</TableHead>
                  <TableHead scope="col" className="w-[22%]">Registration &amp; Stay</TableHead>
                  <TableHead scope="col" className="w-[16%]">Arrival</TableHead>
                  <TableHead scope="col" className="w-[22%]">Check-in</TableHead>
                  <TableHead scope="col" className="w-[12%]">Method</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagedRecent.map((attendee) => (
                    <TableRow key={attendee.id} className="align-top">
                      <TableCell>
                        <div className="min-w-0 space-y-1">
                          <p className="font-medium leading-snug">{attendee.name}</p>
                        {attendee.phone && (
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <Phone className="h-3 w-3 shrink-0" />
                            {formatPhoneNumber(attendee.phone)}
                          </div>
                        )}
                        {attendee.email && (
                            <div className="break-all text-xs text-muted-foreground">
                            {attendee.email}
                          </div>
                        )}
                      </div>
                    </TableCell>
                      <TableCell>
                        <div className="space-y-2">
                          <Badge variant="outline" className="max-w-full text-xs">
                            {formatTicketType(attendee.ticketType)}
                          </Badge>
                          <div><SiteLocationBadge siteLocationAssignment={attendee.siteLocation} maxLength={24} className="max-w-full text-xs" /></div>
                        </div>
                    </TableCell>
                    <TableCell>
                        <div className="space-y-2 text-xs">
                          <div className="text-muted-foreground">Scheduled</div>
                          <Badge variant="outline"><Calendar className="mr-1 h-3 w-3" />{attendee.scheduledArrivalDay}</Badge>
                          <div className="text-muted-foreground">Actual</div>
                          <Badge variant={getDayComparisonVariant(attendee.scheduledArrivalDay, attendee.actualCheckInDay)}>
                            {attendee.actualCheckInDay}
                            {attendee.scheduledArrivalDay !== attendee.actualCheckInDay && <span className="ml-1" aria-label="Different from scheduled arrival">⚠</span>}
                          </Badge>
                        </div>
                    </TableCell>
                    <TableCell>
                        <div className="space-y-1 text-sm leading-snug">
                          <div className="text-xs text-muted-foreground">{attendee.actualCheckInDay}</div>
                          {attendee.activatedAt && formatStandardDateTimeET(attendee.activatedAt)}
                        </div>
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
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="hidden lg:block">{pagination}</div>
        </div>
  );

  if (embedded) return body;

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
      <CardContent>{body}</CardContent>
    </Card>
  );
};