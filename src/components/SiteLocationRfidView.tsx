import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MapPin } from "lucide-react";
import { EnhancedRfidAssignmentCell } from "@/components/EnhancedRfidAssignmentCell";
import { SiteLocationBadge } from "@/components/shared/SiteLocationBadge";
import { AttendeeData } from "@/pages/RfidAssignment";
import { formatPhoneNumber } from "@/lib/phoneUtils";
import { flattenAndSortAttendees, FlatAttendeeWithSorting } from "@/utils/siteLocationGroupUtils";

interface SiteLocationRfidViewProps {
  attendees: AttendeeData[];
  onRefresh: () => void;
  onOptimisticUpdate?: (attendeeId: string, rfidUid: string | null, rfidStatus: string) => void;
  searchTerm: string;
}

export const SiteLocationRfidView: React.FC<SiteLocationRfidViewProps> = ({ 
  attendees, 
  onRefresh, 
  onOptimisticUpdate,
  searchTerm 
}) => {
  // Flatten and sort all attendees
  const flatAttendees = useMemo(() => {
    return flattenAndSortAttendees(attendees);
  }, [attendees]);

  // Helper function to determine if we should show a visual group separator
  const shouldShowGroupSeparator = (currentAttendee: FlatAttendeeWithSorting, previousAttendee: FlatAttendeeWithSorting | null) => {
    if (!previousAttendee) return false;
    return (
      currentAttendee.siteKey !== previousAttendee.siteKey || 
      currentAttendee.siteLocationFull !== previousAttendee.siteLocationFull ||
      currentAttendee.orderId !== previousAttendee.orderId
    );
  };

  if (flatAttendees.length === 0) {
    return (
      <Card>
        <CardContent className="pt-8 pb-8 text-center">
          <MapPin className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">
            {searchTerm ? 'No site locations found' : 'No site locations available'}
          </h3>
          <p className="text-muted-foreground">
            {searchTerm ? 'Try adjusting your search terms' : 'Site locations will appear here when available'}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle className="text-lg">Site Location View</CardTitle>
          <p className="text-sm text-muted-foreground">
            Attendees sorted by site location, site location details, and order ID
          </p>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Arrival</TableHead>
                <TableHead>Site Location</TableHead>
                <TableHead>Waiver</TableHead>
                <TableHead>RFID Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {flatAttendees.map((attendee, index) => {
                const previousAttendee = index > 0 ? flatAttendees[index - 1] : null;
                const showSeparator = shouldShowGroupSeparator(attendee, previousAttendee);
                
                return (
                  <React.Fragment key={attendee.id}>
                    {showSeparator && (
                      <TableRow>
                        <TableCell colSpan={6} className="h-2 bg-muted/20 border-y border-border/50 p-0">
                        </TableCell>
                      </TableRow>
                    )}
                    <TableRow className="hover:bg-muted/50">
                      <TableCell>
                        <div>
                          <span className="font-medium">
                            {attendee.first_name} {attendee.last_name}
                          </span>
                          <div className="text-xs text-muted-foreground mt-1">
                            {attendee.orderDisplayName}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {attendee.phone ? formatPhoneNumber(attendee.phone) : '-'}
                      </TableCell>
                      <TableCell className="text-sm">
                        {attendee.arrival_window || 'Standard'}
                      </TableCell>
                      <TableCell>
                        <SiteLocationBadge 
                          siteLocationAssignment={attendee.site_location_assignment}
                          maxLength={20}
                        />
                      </TableCell>
                      <TableCell>
                        {attendee.waiver_signed ? (
                          <span className="text-success">✓ Signed</span>
                        ) : (
                          <span className="text-destructive">✗ Unsigned</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <EnhancedRfidAssignmentCell
                          attendeeId={attendee.id}
                          currentRfidUid={attendee.rfid_uid}
                          currentRfidStatus={attendee.rfid_status}
                          attendeeName={`${attendee.first_name} ${attendee.last_name}`}
                          onAssignmentComplete={onRefresh}
                          onOptimisticUpdate={onOptimisticUpdate}
                        />
                      </TableCell>
                    </TableRow>
                  </React.Fragment>
                );
              })}
            </TableBody>
          </Table>
        </div>
        
        <div className="text-sm text-muted-foreground text-center mt-4">
          Showing {flatAttendees.length} total attendee{flatAttendees.length !== 1 ? 's' : ''} sorted by site location
        </div>
      </CardContent>
    </Card>
  );
};