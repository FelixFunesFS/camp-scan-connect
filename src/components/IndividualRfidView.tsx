import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown,
  Users,
  Search
} from "lucide-react";
import { EnhancedRfidAssignmentCell } from "@/components/EnhancedRfidAssignmentCell";
import { AttendeeDetailModal } from "@/components/AttendeeDetailModal";

interface AttendeeWithRfid {
  id: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  regfox_id?: string;
  order_id?: string;
  ticket_type: string;
  registration_status: string;
  activated_at?: string;
  waiver_signed?: boolean;
  rfid_uid?: string;
  rfid_status: string;
  has_headphones?: boolean;
  headphones_status?: 'checked_out' | 'checked_in' | 'never_used';
  headphones_duration?: number;
  bar_hits?: number;
  arrival_day?: string;
  is_duplicate?: boolean;
  is_phone_duplicate?: boolean;
  meal_plan?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  group_size?: number;
  is_group_order?: boolean;
  is_veteran?: boolean;
  city?: string;
  state?: string;
  special_accommodations?: string;
}

interface IndividualViewProps {
  attendees: AttendeeWithRfid[];
  onRefresh: () => void;
  onOptimisticUpdate?: (attendeeId: string, rfidUid: string | null, rfidStatus: string) => void;
  searchTerm: string;
}

type SortField = 'name' | 'order' | 'phone' | 'registration_status' | 'status';
type SortDirection = 'asc' | 'desc';

export const IndividualView: React.FC<IndividualViewProps> = ({ 
  attendees, 
  onRefresh, 
  onOptimisticUpdate,
  searchTerm 
}) => {
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  // Sorting logic
  const sortedAttendees = useMemo(() => {
    const sorted = [...attendees].sort((a, b) => {
      let aValue: string, bValue: string;
      
      switch (sortField) {
        case 'name':
          aValue = `${a.first_name} ${a.last_name}`.toLowerCase();
          bValue = `${b.first_name} ${b.last_name}`.toLowerCase();
          break;
        case 'order':
          aValue = a.order_id?.toLowerCase() || 'zzz-no-order';
          bValue = b.order_id?.toLowerCase() || 'zzz-no-order';
          break;
        case 'phone':
          aValue = a.phone?.toLowerCase() || 'zzz-no-phone';
          bValue = b.phone?.toLowerCase() || 'zzz-no-phone';
          break;
        case 'registration_status':
          aValue = a.registration_status.toLowerCase();
          bValue = b.registration_status.toLowerCase();
          break;
        case 'status':
          aValue = a.rfid_uid && a.rfid_status === 'assigned' ? 'assigned' : 'unassigned';
          bValue = b.rfid_uid && b.rfid_status === 'assigned' ? 'assigned' : 'unassigned';
          break;
        default:
          return 0;
      }
      
      const result = aValue.localeCompare(bValue);
      return sortDirection === 'asc' ? result : -result;
    });
    
    return sorted;
  }, [attendees, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-4 w-4" />;
    }
    return sortDirection === 'asc' ? 
      <ArrowUp className="h-4 w-4" /> : 
      <ArrowDown className="h-4 w-4" />;
  };

  const unassignedCount = attendees.filter(a => !a.rfid_uid || a.rfid_status !== 'assigned').length;
  const assignedCount = attendees.filter(a => a.rfid_uid && a.rfid_status === 'assigned').length;

  if (attendees.length === 0) {
    return (
      <Card>
        <CardContent className="pt-8 pb-8 text-center">
          <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">
            {searchTerm ? 'No matches found' : 'No attendees available'}
          </h3>
          <p className="text-muted-foreground">
            {searchTerm ? 'Try adjusting your search terms' : 'Load attendee data to begin RFID assignment'}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-lg">Individual Attendee View</CardTitle>
            <p className="text-sm text-muted-foreground">
              All attendees in sortable list format
            </p>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <Badge variant="outline" className="text-warning border-warning">
              {unassignedCount} Unassigned
            </Badge>
            <Badge variant="outline" className="text-success border-success">
              {assignedCount} Assigned
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <Button
                    variant="ghost"
                    className="h-auto p-0 font-semibold hover:bg-transparent"
                    onClick={() => handleSort('name')}
                  >
                    <div className="flex items-center gap-2">
                      Name
                      {getSortIcon('name')}
                    </div>
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    className="h-auto p-0 font-semibold hover:bg-transparent"
                    onClick={() => handleSort('order')}
                  >
                    <div className="flex items-center gap-2">
                      Order ID
                      {getSortIcon('order')}
                    </div>
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    className="h-auto p-0 font-semibold hover:bg-transparent"
                    onClick={() => handleSort('phone')}
                  >
                    <div className="flex items-center gap-2">
                      Phone
                      {getSortIcon('phone')}
                    </div>
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    className="h-auto p-0 font-semibold hover:bg-transparent"
                    onClick={() => handleSort('registration_status')}
                  >
                    <div className="flex items-center gap-2">
                      Status
                      {getSortIcon('registration_status')}
                    </div>
                  </Button>
                </TableHead>
                <TableHead>Veteran</TableHead>
                <TableHead>RFID Assignment</TableHead>
                <TableHead>Headphones</TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    className="h-auto p-0 font-semibold hover:bg-transparent"
                    onClick={() => handleSort('status')}
                  >
                    <div className="flex items-center gap-2">
                      RFID Status
                      {getSortIcon('status')}
                    </div>
                  </Button>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedAttendees.map((attendee, index) => (
                <TableRow 
                  key={attendee.id}
                  data-row-index={index}
                  className="hover:bg-muted/50"
                >
                  <TableCell className="font-medium">
                    <AttendeeDetailModal
                      attendee={attendee}
                      allAttendees={attendees}
                      trigger={
                        <Button variant="link" className="p-0 h-auto font-medium text-left hover:underline">
                          {attendee.first_name} {attendee.last_name}
                        </Button>
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-mono text-xs">
                      {attendee.order_id || 'No Order'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">
                    {attendee.phone || 'N/A'}
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant="outline"
                      className={
                        attendee.registration_status === 'registered' 
                          ? 'border-success text-success' 
                          : attendee.registration_status === 'cancelled'
                          ? 'border-destructive text-destructive'
                          : 'border-warning text-warning'
                      }
                    >
                      {attendee.registration_status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {attendee.is_veteran ? (
                      <Badge variant="default" className="text-xs bg-blue-600 text-white">
                        Veteran
                      </Badge>
                    ) : null}
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
                  <TableCell>
                    {(() => {
                      if (attendee.headphones_status === 'checked_out') {
                        const duration = attendee.headphones_duration || 0;
                        const isLong = duration > 180;
                        const formatDuration = (minutes: number) => {
                          if (minutes < 60) return `${minutes}m`;
                          const hours = Math.floor(minutes / 60);
                          const mins = minutes % 60;
                          return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
                        };
                        return (
                          <Badge 
                            variant={isLong ? "destructive" : "secondary"}
                            className="text-xs"
                          >
                            Checked Out ({formatDuration(duration)})
                          </Badge>
                        );
                      }
                      if (attendee.headphones_status === 'checked_in') {
                        return <Badge variant="outline" className="text-xs">Available</Badge>;
                      }
                      return <Badge variant="outline" className="text-xs text-muted-foreground">Never Used</Badge>;
                    })()}
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant={
                        attendee.rfid_uid && attendee.rfid_status === 'assigned' 
                          ? 'default' 
                          : 'secondary'
                      }
                      className={
                        attendee.rfid_uid && attendee.rfid_status === 'assigned'
                          ? 'bg-success text-success-foreground'
                          : 'bg-warning/20 text-warning-foreground'
                      }
                    >
                      {attendee.rfid_uid && attendee.rfid_status === 'assigned' 
                        ? 'Assigned' 
                        : 'Unassigned'}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        
        {/* Summary Info */}
        <div className="flex justify-between items-center mt-4 pt-4 border-t text-sm text-muted-foreground">
          <div>
            Showing {sortedAttendees.length} attendee{sortedAttendees.length !== 1 ? 's' : ''}
            {searchTerm && ` matching "${searchTerm}"`}
          </div>
          <div>
            {assignedCount} of {attendees.length} assigned ({Math.round((assignedCount / attendees.length) * 100) || 0}%)
          </div>
        </div>
      </CardContent>
    </Card>
  );
};