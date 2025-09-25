import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ResponsiveTable, ResponsiveTableMobile } from "@/components/ui/responsive-table";
import { MapPin, Users, Clock } from "lucide-react";
import { formatStandardDateTimeET } from "@/utils/dateTimeUtils";
import { MobileOnSiteCard } from "./MobileTableCard";

interface OnSiteAttendee {
  name: string;
  rfid_uid: string;
  entry_time: string;
  duration_minutes: number;
}

interface CurrentlyOnSiteAttendeesProps {
  attendees: OnSiteAttendee[];
  isLoading?: boolean;
}

export const CurrentlyOnSiteAttendees = ({ attendees, isLoading }: CurrentlyOnSiteAttendeesProps) => {
const formatDuration = (minutes: number): string => {
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
            <Users className="h-5 w-5" />
            Currently On-Site Attendees
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-muted rounded w-1/2"></div>
            <div className="space-y-2">
              {[1,2,3].map(i => (
                <div key={i} className="h-12 bg-muted rounded"></div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (attendees.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Currently On-Site Attendees
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <div className="text-muted-foreground">No attendees currently on-site</div>
            <div className="text-sm text-muted-foreground mt-1">Check-ins will appear here</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Currently On-Site Attendees
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Desktop Table */}
        <ResponsiveTable>
          <div className="border rounded-lg max-h-[300px] overflow-y-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-background">
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>RFID UID</TableHead>
                  <TableHead>Entry Time</TableHead>
                  <TableHead>Duration</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {attendees.map((attendee, index) => (
                  <TableRow key={`${attendee.name}-${index}`}>
                    <TableCell className="font-medium">{attendee.name}</TableCell>
                    <TableCell className="font-mono text-sm">{attendee.rfid_uid}</TableCell>
                    <TableCell>
                      {formatStandardDateTimeET(attendee.entry_time)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-success/10 text-success border-success/20">
                        {formatDuration(attendee.duration_minutes)}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </ResponsiveTable>

        {/* Mobile Cards */}
        <ResponsiveTableMobile>
          <div className="space-y-3 max-h-[300px] overflow-y-auto">
            {attendees.map((attendee, index) => (
              <MobileOnSiteCard key={`${attendee.name}-${index}`} attendee={attendee} />
            ))}
          </div>
        </ResponsiveTableMobile>
      </CardContent>
    </Card>
  );
};