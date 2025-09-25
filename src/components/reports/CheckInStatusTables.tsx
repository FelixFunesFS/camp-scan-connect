import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { UserCheck, UserX, Search, Phone, ChevronDown, Clock, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatPhoneNumber } from "@/lib/phoneUtils";
import { formatStandardDateTimeET } from "@/utils/dateTimeUtils";
import { getStandardTimeBoundaries } from "@/utils/etTimezone";

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
}

interface CheckInStatusTablesProps {
  refreshTrigger?: number;
}

export const CheckInStatusTables = ({ refreshTrigger }: CheckInStatusTablesProps) => {
  const [recentCheckIns, setRecentCheckIns] = useState<AttendeeStatus[]>([]);
  const [pendingCheckIns, setPendingCheckIns] = useState<AttendeeStatus[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [timeFilter, setTimeFilter] = useState("all");
  const [pendingSortBy, setPendingSortBy] = useState("name");
  const [isLoading, setIsLoading] = useState(true);
  const [isRecentOpen, setIsRecentOpen] = useState(true);
  const [isPendingOpen, setIsPendingOpen] = useState(true);

  useEffect(() => {
    const fetchStatusData = async () => {
      try {
        // Use ET timezone boundaries for "today" calculation
        const todayBoundaries = getStandardTimeBoundaries('today');
        
        // Get recent check-ins (last 100, today only in ET) - join with rfid_tags for activation timestamps
        const { data: recentData } = await supabase
          .from('attendees')
          .select(`
            id, first_name, last_name, phone, email, ticket_type, order_id, arrival_window,
            rfid_tags!inner(activated_at, activation_method)
          `)
          .eq('registration_status', 'registered')
          .not('rfid_tags.activated_at', 'is', null)
          .gte('rfid_tags.activated_at', todayBoundaries.start.toISOString())
          .lt('rfid_tags.activated_at', todayBoundaries.end.toISOString())
          .order('rfid_tags.activated_at', { ascending: false })
          .limit(100);

        // Get pending check-ins (attendees without RFID activation)
        const { data: pendingData } = await supabase
          .from('attendees')
          .select(`
            id, first_name, last_name, phone, email, ticket_type, order_id, arrival_window, created_at,
            rfid_tags(activated_at)
          `)
          .eq('registration_status', 'registered')
          .or('rfid_tags.activated_at.is.null,rfid_tags.id.is.null')
          .order('created_at', { ascending: true })
          .limit(500);

        const formatAttendeeData = (data: any[], isRecent: boolean = false): AttendeeStatus[] => {
          return data.map(attendee => ({
            id: attendee.id,
            name: `${attendee.first_name} ${attendee.last_name}`,
            phone: attendee.phone,
            email: attendee.email,
            activatedAt: isRecent ? attendee.rfid_tags?.activated_at : null,
            activationMethod: isRecent ? attendee.rfid_tags?.activation_method : null,
            ticketType: attendee.ticket_type || 'Standard',
            orderInfo: attendee.order_id || 'No Order',
            arrivalWindow: attendee.arrival_window
          }));
        };

        setRecentCheckIns(formatAttendeeData(recentData || [], true));
        setPendingCheckIns(formatAttendeeData(pendingData || [], false));
      } catch (error) {
        console.error('Error fetching status data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStatusData();
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

  // Filter and sort pending check-ins
  const filteredAndSortedPending = pendingCheckIns
    .filter(attendee =>
      attendee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      attendee.phone?.includes(searchTerm) ||
      attendee.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      attendee.orderInfo.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      switch (pendingSortBy) {
        case "name": return a.name.localeCompare(b.name);
        case "ticketType": return a.ticketType.localeCompare(b.ticketType);
        case "arrivalWindow": return (a.arrivalWindow || "").localeCompare(b.arrivalWindow || "");
        default: return 0;
      }
    });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Check-in Status</CardTitle>
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
    <div className="space-y-4">
      {/* Recently Checked In Section */}
      <Card>
        <Collapsible open={isRecentOpen} onOpenChange={setIsRecentOpen}>
          <CardHeader>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-between p-0 h-auto hover:bg-transparent">
                <CardTitle className="flex items-center gap-2">
                  <UserCheck className="h-5 w-5 text-success" />
                  Recently Checked In
                  <Badge variant="outline" className="text-success">
                    {filteredRecent.length}
                  </Badge>
                </CardTitle>
                <ChevronDown className={`h-4 w-4 transition-transform ${isRecentOpen ? 'rotate-180' : ''}`} />
              </Button>
            </CollapsibleTrigger>
          </CardHeader>
          <CollapsibleContent>
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
                <div className="border rounded-lg max-h-[400px] overflow-y-auto">
                  <Table>
                    <TableHeader className="sticky top-0 bg-background">
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Contact</TableHead>
                        <TableHead>Ticket Type</TableHead>
                        <TableHead>Method</TableHead>
                        <TableHead>Check-in Time</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredRecent.slice(0, 20).map((attendee) => (
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
                            <div className="space-y-1">
                              <Badge variant="outline" className="text-xs">
                                {attendee.ticketType}
                              </Badge>
                              {attendee.arrivalWindow && (
                                <div className="text-xs text-muted-foreground">
                                  {attendee.arrivalWindow}
                                </div>
                              )}
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
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* Pending Check-ins Section */}
      <Card>
        <Collapsible open={isPendingOpen} onOpenChange={setIsPendingOpen}>
          <CardHeader>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-between p-0 h-auto hover:bg-transparent">
                <CardTitle className="flex items-center gap-2">
                  <UserX className="h-5 w-5 text-warning" />
                  Pending Check-ins
                  <Badge variant="outline" className="text-warning">
                    {filteredAndSortedPending.length}
                  </Badge>
                </CardTitle>
                <ChevronDown className={`h-4 w-4 transition-transform ${isPendingOpen ? 'rotate-180' : ''}`} />
              </Button>
            </CollapsibleTrigger>
          </CardHeader>
          <CollapsibleContent>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by name, phone, email, or order..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Select value={pendingSortBy} onValueChange={setPendingSortBy}>
                    <SelectTrigger className="w-[150px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="name">Sort by Name</SelectItem>
                      <SelectItem value="ticketType">Sort by Type</SelectItem>
                      <SelectItem value="arrivalWindow">Sort by Arrival</SelectItem>
                    </SelectContent>
                  </Select>
                  <Badge variant="outline">
                    {filteredAndSortedPending.length} of {pendingCheckIns.length}
                  </Badge>
                </div>

                <div className="border rounded-lg max-h-[400px] overflow-y-auto">
                  <Table>
                    <TableHeader className="sticky top-0 bg-background">
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Contact</TableHead>
                        <TableHead>Ticket Type</TableHead>
                        <TableHead>Order ID</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAndSortedPending.map((attendee) => (
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
                            <div className="space-y-1">
                              <Badge variant="outline" className="text-xs">
                                {attendee.ticketType}
                              </Badge>
                              {attendee.arrivalWindow && (
                                <div className="text-xs text-muted-foreground">
                                  {attendee.arrivalWindow}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm text-muted-foreground">
                              {attendee.orderInfo}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>
    </div>
  );
};