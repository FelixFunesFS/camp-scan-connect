import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { UserCheck, UserX, Search, Phone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatPhoneNumber } from "@/lib/phoneUtils";

interface AttendeeStatus {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  activatedAt: string | null;
  ticketType: string;
  orderInfo: string;
}

export const CheckInStatusTables = () => {
  const [recentCheckIns, setRecentCheckIns] = useState<AttendeeStatus[]>([]);
  const [pendingCheckIns, setPendingCheckIns] = useState<AttendeeStatus[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStatusData = async () => {
      try {
        // Get recent check-ins (last 50, today only)
        const { data: recentData } = await supabase
          .from('attendees')
          .select('id, first_name, last_name, phone, email, activated_at, ticket_type, order_id')
          .eq('registration_status', 'registered')
          .not('activated_at', 'is', null)
          .gte('activated_at', new Date().toISOString().split('T')[0])
          .order('activated_at', { ascending: false })
          .limit(50);

        // Get pending check-ins
        const { data: pendingData } = await supabase
          .from('attendees')
          .select('id, first_name, last_name, phone, email, activated_at, ticket_type, order_id')
          .eq('registration_status', 'registered')
          .is('activated_at', null)
          .order('created_at', { ascending: true })
          .limit(500);

        const formatAttendeeData = (data: any[]): AttendeeStatus[] => {
          return data.map(attendee => ({
            id: attendee.id,
            name: `${attendee.first_name} ${attendee.last_name}`,
            phone: attendee.phone,
            email: attendee.email,
            activatedAt: attendee.activated_at,
            ticketType: attendee.ticket_type || 'Standard',
            orderInfo: attendee.order_id || 'No Order'
          }));
        };

        setRecentCheckIns(formatAttendeeData(recentData || []));
        setPendingCheckIns(formatAttendeeData(pendingData || []));
      } catch (error) {
        console.error('Error fetching status data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStatusData();
  }, []);

  const filteredPending = pendingCheckIns.filter(attendee =>
    attendee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    attendee.phone?.includes(searchTerm) ||
    attendee.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    attendee.orderInfo.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Check-in Status
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-success">
              <UserCheck className="h-3 w-3 mr-1" />
              {recentCheckIns.length} Recent
            </Badge>
            <Badge variant="outline" className="text-warning">
              <UserX className="h-3 w-3 mr-1" />
              {pendingCheckIns.length} Pending
            </Badge>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="recent" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="recent" className="flex items-center gap-2">
              <UserCheck className="h-4 w-4" />
              Recently Checked In
            </TabsTrigger>
            <TabsTrigger value="pending" className="flex items-center gap-2">
              <UserX className="h-4 w-4" />
              Pending Check-ins
            </TabsTrigger>
          </TabsList>

          <TabsContent value="recent">
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                Last {recentCheckIns.length} check-ins today
              </div>
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Ticket Type</TableHead>
                      <TableHead>Check-in Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentCheckIns.slice(0, 10).map((attendee) => (
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
                          {attendee.activatedAt && (
                            <div className="text-sm">
                              {new Date(attendee.activatedAt).toLocaleTimeString()}
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="pending">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name, phone, email, or order..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Badge variant="outline">
                  {filteredPending.length} of {pendingCheckIns.length}
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
                    {filteredPending.map((attendee) => (
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
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};