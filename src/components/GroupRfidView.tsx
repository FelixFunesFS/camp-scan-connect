import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { 
  ChevronDown,
  ChevronRight,
  Users,
  CheckCircle,
  AlertTriangle,
  ArrowUpDown,
  ArrowUp,
  ArrowDown
} from "lucide-react";
import { EnhancedRfidAssignmentCell } from "@/components/EnhancedRfidAssignmentCell";
import { AttendeeDetailModal } from "@/components/AttendeeDetailModal";
import { SiteLocationBadge } from "@/components/shared/SiteLocationBadge";
import { AttendeeData } from "@/pages/RfidAssignment";
import { formatPhoneNumber } from "@/lib/phoneUtils";
import { getOrderGroupBackgroundColor, groupAttendeesByOrder } from "@/utils/orderGroupUtils";

interface GroupRfidViewProps {
  attendees: AttendeeData[];
  onRefresh: () => void;
  onOptimisticUpdate?: (attendeeId: string, rfidUid: string | null, rfidStatus: string) => void;
  searchTerm: string;
}

type SortField = 'order_size' | 'order_id' | 'progress' | 'status';
type SortDirection = 'asc' | 'desc';

export const GroupRfidView: React.FC<GroupRfidViewProps> = ({ 
  attendees, 
  onRefresh, 
  onOptimisticUpdate,
  searchTerm 
}) => {
  const [sortField, setSortField] = useState<SortField>('order_id');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  // Group attendees by order with alternating colors after sorting
  const orderGroups = useMemo(() => {
    const groups = groupAttendeesByOrder(attendees);
    
    // Sort groups
    const sorted = groups.sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (sortField) {
        case 'order_size':
          aValue = a.groupSize;
          bValue = b.groupSize;
          break;
        case 'order_id':
          aValue = a.orderId || 'zzz-no-order';
          bValue = b.orderId || 'zzz-no-order';
          break;
        case 'progress':
          const aAssigned = a.attendees.filter(att => att.rfid_uid && att.rfid_status === 'assigned').length;
          const bAssigned = b.attendees.filter(att => att.rfid_uid && att.rfid_status === 'assigned').length;
          aValue = aAssigned / a.attendees.length;
          bValue = bAssigned / b.attendees.length;
          break;
        case 'status':
          const aComplete = a.attendees.every(att => att.rfid_uid && att.rfid_status === 'assigned');
          const bComplete = b.attendees.every(att => att.rfid_uid && att.rfid_status === 'assigned');
          aValue = aComplete ? 1 : 0;
          bValue = bComplete ? 1 : 0;
          break;
        default:
          return 0;
      }
      
      if (typeof aValue === 'string') {
        const result = aValue.localeCompare(bValue);
        return sortDirection === 'asc' ? result : -result;
      } else {
        const result = aValue - bValue;
        return sortDirection === 'asc' ? result : -result;
      }
    });
    
    // Reassign alternating colors based on final sorted position
    return sorted.map((group, index) => ({
      ...group,
      backgroundColor: getOrderGroupBackgroundColor(group.orderId, index)
    }));
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

  const toggleGroup = (orderId: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(orderId)) {
      newExpanded.delete(orderId);
    } else {
      newExpanded.add(orderId);
    }
    setExpandedGroups(newExpanded);
  };

  const expandAllGroups = () => {
    const allOrderIds = orderGroups.map(group => group.orderId || 'individual').filter(Boolean);
    setExpandedGroups(new Set(allOrderIds));
  };

  const collapseAllGroups = () => {
    setExpandedGroups(new Set());
  };

  const getGroupProgress = (group: any) => {
    const assigned = group.attendees.filter((att: AttendeeData) => att.rfid_uid && att.rfid_status === 'assigned').length;
    const total = group.attendees.length;
    const percentage = total > 0 ? (assigned / total) * 100 : 0;
    return { assigned, total, percentage };
  };

  if (orderGroups.length === 0) {
    return (
      <Card>
        <CardContent className="pt-8 pb-8 text-center">
          <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">
            {searchTerm ? 'No group orders found' : 'No group orders available'}
          </h3>
          <p className="text-muted-foreground">
            {searchTerm ? 'Try adjusting your search terms' : 'Group orders will appear here when available'}
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
            <CardTitle className="text-lg">Group Order View</CardTitle>
            <p className="text-sm text-muted-foreground">
              Attendees grouped by order for bulk assignment
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={expandAllGroups}>
              Expand All
            </Button>
            <Button variant="outline" size="sm" onClick={collapseAllGroups}>
              Collapse All
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Group Summary Table */}
        <div className="rounded-md border mb-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <Button
                    variant="ghost"
                    className="h-auto p-0 font-semibold hover:bg-transparent"
                    onClick={() => handleSort('order_id')}
                  >
                    <div className="flex items-center gap-2">
                      Order ID
                      {getSortIcon('order_id')}
                    </div>
                  </Button>
                </TableHead>
                <TableHead>Site Location</TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    className="h-auto p-0 font-semibold hover:bg-transparent"
                    onClick={() => handleSort('order_size')}
                  >
                    <div className="flex items-center gap-2">
                      Size
                      {getSortIcon('order_size')}
                    </div>
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    className="h-auto p-0 font-semibold hover:bg-transparent"
                    onClick={() => handleSort('progress')}
                  >
                    <div className="flex items-center gap-2">
                      Progress
                      {getSortIcon('progress')}
                    </div>
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    className="h-auto p-0 font-semibold hover:bg-transparent"
                    onClick={() => handleSort('status')}
                  >
                    <div className="flex items-center gap-2">
                      Status
                      {getSortIcon('status')}
                    </div>
                  </Button>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orderGroups.map((group) => {
                const orderId = group.orderId || 'individual';
                const progress = getGroupProgress(group);
                const isExpanded = expandedGroups.has(orderId);
                const isComplete = progress.assigned === progress.total;
                
                // Extract site location assignment from the first attendee with site location data
                const orderSiteLocationAssignment = group.attendees.find(att => 
                  att.site_location_assignment && att.site_location_assignment !== 'Not Assigned'
                )?.site_location_assignment || 'Not Assigned';

                return (
                  <React.Fragment key={orderId}>
                    <TableRow 
                      className="hover:bg-muted/50 cursor-pointer"
                      style={{ backgroundColor: group.backgroundColor }}
                      onClick={() => toggleGroup(orderId)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                          <span className="font-mono text-sm">
                            {group.orderId || 'Individual Attendees'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <SiteLocationBadge 
                          siteLocationAssignment={orderSiteLocationAssignment} 
                          maxLength={20}
                        />
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {group.groupSize} attendee{group.groupSize !== 1 ? 's' : ''}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress value={progress.percentage} className="h-2 w-16" />
                          <span className="text-sm text-muted-foreground">
                            {progress.assigned}/{progress.total}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {isComplete ? (
                          <div className="flex items-center gap-1">
                            <CheckCircle className="h-4 w-4 text-success" />
                            <span className="text-sm text-success">Complete</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1">
                            <AlertTriangle className="h-4 w-4 text-warning" />
                            <span className="text-sm text-warning">Pending</span>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                    
                    {isExpanded && (
                      <TableRow>
                        <TableCell colSpan={5} className="p-0">
                          <div className="p-4 bg-muted/20">
                            <Table>
                              <TableHeader>
                                 <TableRow>
                                   <TableHead>Name</TableHead>
                                   <TableHead>Phone</TableHead>
                                   <TableHead>Meal Plan</TableHead>
                                   <TableHead>Arrival</TableHead>
                                   <TableHead>RFID</TableHead>
                                   <TableHead>Status</TableHead>
                                 </TableRow>
                              </TableHeader>
                              <TableBody>
                                {group.attendees.map((attendee: AttendeeData) => (
                                  <TableRow key={attendee.id}>
                                    <TableCell>
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
                                     <TableCell className="text-sm">
                                       {attendee.phone ? formatPhoneNumber(attendee.phone) : 'N/A'}
                                     </TableCell>
                                     <TableCell>
                                       <Badge variant="outline" className="text-xs">
                                         {attendee.formatted_meal_plan}
                                       </Badge>
                                     </TableCell>
                                    <TableCell>
                                      <Badge 
                                        variant={attendee.arrival_window === 'early' ? 'default' : 'secondary'}
                                        className="text-xs"
                                      >
                                        {attendee.arrival_day}
                                      </Badge>
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
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                );
              })}
            </TableBody>
          </Table>
        </div>
        
        {/* Summary Info */}
        <div className="flex justify-between items-center text-sm text-muted-foreground">
          <div>
            Showing {orderGroups.length} order group{orderGroups.length !== 1 ? 's' : ''} 
            with {attendees.length} attendee{attendees.length !== 1 ? 's' : ''}
          </div>
          <div>
            {attendees.filter(a => a.rfid_uid && a.rfid_status === 'assigned').length} of {attendees.length} assigned
          </div>
        </div>
      </CardContent>
    </Card>
  );
};