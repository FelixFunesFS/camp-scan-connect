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
  ArrowDown,
  MapPin
} from "lucide-react";
import { EnhancedRfidAssignmentCell } from "@/components/EnhancedRfidAssignmentCell";
import { AttendeeDetailModal } from "@/components/AttendeeDetailModal";
import { SiteLocationBadge } from "@/components/shared/SiteLocationBadge";
import { AttendeeData } from "@/pages/RfidAssignment";
import { formatPhoneNumber } from "@/lib/phoneUtils";
import { groupAttendeesBySiteLocation, getSiteLocationDetailGroups, getSiteLocationOrderGroups } from "@/utils/siteLocationGroupUtils";

interface SiteLocationRfidViewProps {
  attendees: AttendeeData[];
  onRefresh: () => void;
  onOptimisticUpdate?: (attendeeId: string, rfidUid: string | null, rfidStatus: string) => void;
  searchTerm: string;
}

type SortField = 'site_number' | 'attendee_count' | 'progress' | 'status';
type SortDirection = 'asc' | 'desc';

export const SiteLocationRfidView: React.FC<SiteLocationRfidViewProps> = ({ 
  attendees, 
  onRefresh, 
  onOptimisticUpdate,
  searchTerm 
}) => {
  const [sortField, setSortField] = useState<SortField>('site_number');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [expandedSites, setExpandedSites] = useState<Set<string>>(new Set());
  const [expandedSiteLocations, setExpandedSiteLocations] = useState<Set<string>>(new Set());
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());

  // Group attendees by site location
  const siteGroups = useMemo(() => {
    const groups = groupAttendeesBySiteLocation(attendees);
    
    // Sort groups
    const sorted = groups.sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (sortField) {
        case 'site_number':
          // Extract numbers for proper numeric sorting
          const aNum = a.siteKey.match(/\d+/);
          const bNum = b.siteKey.match(/\d+/);
          if (aNum && bNum) {
            aValue = parseInt(aNum[0]);
            bValue = parseInt(bNum[0]);
          } else {
            aValue = a.siteDisplayName;
            bValue = b.siteDisplayName;
          }
          break;
        case 'attendee_count':
          aValue = a.totalAttendees;
          bValue = b.totalAttendees;
          break;
        case 'progress':
          aValue = a.percentage;
          bValue = b.percentage;
          break;
        case 'status':
          const aComplete = a.assignedAttendees === a.totalAttendees;
          const bComplete = b.assignedAttendees === b.totalAttendees;
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

  const toggleSite = (siteKey: string) => {
    const newExpanded = new Set(expandedSites);
    if (newExpanded.has(siteKey)) {
      newExpanded.delete(siteKey);
    } else {
      newExpanded.add(siteKey);
    }
    setExpandedSites(newExpanded);
  };

  const toggleSiteLocation = (locationKey: string) => {
    const newExpanded = new Set(expandedSiteLocations);
    if (newExpanded.has(locationKey)) {
      newExpanded.delete(locationKey);
    } else {
      newExpanded.add(locationKey);
    }
    setExpandedSiteLocations(newExpanded);
  };

  const toggleOrder = (orderKey: string) => {
    const newExpanded = new Set(expandedOrders);
    if (newExpanded.has(orderKey)) {
      newExpanded.delete(orderKey);
    } else {
      newExpanded.add(orderKey);
    }
    setExpandedOrders(newExpanded);
  };

  const expandAllSites = () => {
    const allSiteKeys = siteGroups.map(group => group.siteKey);
    setExpandedSites(new Set(allSiteKeys));
  };

  const collapseAllSites = () => {
    setExpandedSites(new Set());
    setExpandedSiteLocations(new Set());
    setExpandedOrders(new Set());
  };

  if (siteGroups.length === 0) {
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-lg">Site Location View</CardTitle>
            <p className="text-sm text-muted-foreground">
              Attendees grouped by site location and order for bulk assignment
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={expandAllSites}>
              Expand All
            </Button>
            <Button variant="outline" size="sm" onClick={collapseAllSites}>
              Collapse All
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Site Summary Table */}
        <div className="rounded-md border mb-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <Button
                    variant="ghost"
                    className="h-auto p-0 font-semibold hover:bg-transparent"
                    onClick={() => handleSort('site_number')}
                  >
                    <div className="flex items-center gap-2">
                      Site Location
                      {getSortIcon('site_number')}
                    </div>
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    className="h-auto p-0 font-semibold hover:bg-transparent"
                    onClick={() => handleSort('attendee_count')}
                  >
                    <div className="flex items-center gap-2">
                      Attendees
                      {getSortIcon('attendee_count')}
                    </div>
                  </Button>
                </TableHead>
                <TableHead>Locations</TableHead>
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
              {siteGroups.map((siteGroup) => {
                const isSiteExpanded = expandedSites.has(siteGroup.siteKey);
                const isComplete = siteGroup.assignedAttendees === siteGroup.totalAttendees;
                const locationGroups = getSiteLocationDetailGroups(siteGroup);
                
                return (
                  <React.Fragment key={siteGroup.siteKey}>
                    <TableRow 
                      className="hover:bg-muted/50 cursor-pointer"
                      onClick={() => toggleSite(siteGroup.siteKey)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {isSiteExpanded ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                          <span className="font-semibold">
                            {siteGroup.siteDisplayName}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {siteGroup.totalAttendees} attendee{siteGroup.totalAttendees !== 1 ? 's' : ''}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {siteGroup.locations.size} location{siteGroup.locations.size !== 1 ? 's' : ''}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress value={siteGroup.percentage} className="h-2 w-16" />
                          <span className="text-sm text-muted-foreground">
                            {siteGroup.assignedAttendees}/{siteGroup.totalAttendees}
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
                    
                    {isSiteExpanded && (
                      <TableRow>
                        <TableCell colSpan={5} className="p-0">
                          <div className="p-4 bg-muted/10 border-l-4 border-primary/20">
                            {/* Site locations within this site */}
                            <div className="space-y-3">
                              {locationGroups.map((locationGroup) => {
                                const locationKey = `${siteGroup.siteKey}-${locationGroup.siteLocationKey}`;
                                const isLocationExpanded = expandedSiteLocations.has(locationKey);
                                const locationComplete = locationGroup.assignedAttendees === locationGroup.totalAttendees;
                                const orderGroups = getSiteLocationOrderGroups(locationGroup);
                                
                                return (
                                  <div key={locationKey} className="border rounded-lg bg-background/50">
                                    <div 
                                      className="p-3 cursor-pointer hover:bg-muted/50"
                                      onClick={() => toggleSiteLocation(locationKey)}
                                    >
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                          {isLocationExpanded ? (
                                            <ChevronDown className="h-4 w-4" />
                                          ) : (
                                            <ChevronRight className="h-4 w-4" />
                                          )}
                                          <SiteLocationBadge 
                                            siteLocationAssignment={locationGroup.siteLocationFull}
                                            maxLength={40}
                                          />
                                        </div>
                                        <div className="flex items-center gap-4">
                                          <Badge variant="outline" className="text-xs">
                                            {locationGroup.totalAttendees} attendee{locationGroup.totalAttendees !== 1 ? 's' : ''}
                                          </Badge>
                                          <div className="flex items-center gap-2">
                                            <Progress value={locationGroup.percentage} className="h-2 w-12" />
                                            <span className="text-xs text-muted-foreground">
                                              {locationGroup.assignedAttendees}/{locationGroup.totalAttendees}
                                            </span>
                                          </div>
                                          {locationComplete ? (
                                            <CheckCircle className="h-4 w-4 text-success" />
                                          ) : (
                                            <AlertTriangle className="h-4 w-4 text-warning" />
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                    
                                    {isLocationExpanded && (
                                      <div className="border-t bg-muted/5">
                                        {/* Orders within this site location */}
                                        <div className="p-3 space-y-2">
                                          {orderGroups.map((orderGroup) => {
                                            const orderKey = `${locationKey}-${orderGroup.orderId}`;
                                            const isOrderExpanded = expandedOrders.has(orderKey);
                                            const orderComplete = orderGroup.assignedCount === orderGroup.totalCount;
                                            
                                            return (
                                              <div key={orderKey} className="border rounded-lg bg-background">
                                                <div 
                                                  className="p-3 cursor-pointer hover:bg-muted/50"
                                                  onClick={() => toggleOrder(orderKey)}
                                                >
                                                  <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                      {isOrderExpanded ? (
                                                        <ChevronDown className="h-4 w-4" />
                                                      ) : (
                                                        <ChevronRight className="h-4 w-4" />
                                                      )}
                                                      <span className="font-medium text-sm">
                                                        {orderGroup.orderDisplayName}
                                                      </span>
                                                    </div>
                                                    <div className="flex items-center gap-4">
                                                      <div className="flex items-center gap-2">
                                                        <Progress value={orderGroup.percentage} className="h-2 w-12" />
                                                        <span className="text-xs text-muted-foreground">
                                                          {orderGroup.assignedCount}/{orderGroup.totalCount}
                                                        </span>
                                                      </div>
                                                      {orderComplete ? (
                                                        <CheckCircle className="h-4 w-4 text-success" />
                                                      ) : (
                                                        <AlertTriangle className="h-4 w-4 text-warning" />
                                                      )}
                                                    </div>
                                                  </div>
                                                </div>
                                                
                                                {isOrderExpanded && (
                                                  <div className="border-t">
                                                    <Table>
                                                      <TableHeader>
                                                        <TableRow>
                                                          <TableHead>Name</TableHead>
                                                          <TableHead>Phone</TableHead>
                                                          <TableHead>Arrival</TableHead>
                                                          <TableHead>Site Location</TableHead>
                                                          <TableHead>Waiver</TableHead>
                                                          <TableHead>RFID</TableHead>
                                                          <TableHead>Status</TableHead>
                                                        </TableRow>
                                                      </TableHeader>
                                                      <TableBody>
                                                        {orderGroup.attendees.map((attendee: AttendeeData) => (
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
                                                              <Badge 
                                                                variant={attendee.arrival_window === 'early' ? 'default' : 'secondary'}
                                                                className="text-xs"
                                                              >
                                                                {attendee.arrival_day}
                                                              </Badge>
                                                            </TableCell>
                                                            <TableCell>
                                                              <SiteLocationBadge 
                                                                siteLocationAssignment={attendee.site_location_assignment}
                                                                maxLength={20}
                                                                className="text-xs"
                                                              />
                                                            </TableCell>
                                                            <TableCell>
                                                              <Badge 
                                                                variant={attendee.waiver_signed ? 'default' : 'destructive'}
                                                                className={
                                                                  attendee.waiver_signed
                                                                    ? 'bg-success text-success-foreground text-xs'
                                                                    : 'bg-destructive text-destructive-foreground text-xs'
                                                                }
                                                              >
                                                                {attendee.waiver_signed ? 'Signed' : 'Unsigned'}
                                                              </Badge>
                                                            </TableCell>
                                                            <TableCell>
                                                              <EnhancedRfidAssignmentCell
                                                                attendeeId={attendee.id}
                                                                attendeeName={`${attendee.first_name} ${attendee.last_name}`}
                                                                currentRfidUid={attendee.rfid_uid}
                                                                currentRfidStatus={attendee.rfid_status}
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
                                                                    ? 'bg-success text-success-foreground text-xs'
                                                                    : 'text-xs'
                                                                }
                                                              >
                                                                {attendee.rfid_uid && attendee.rfid_status === 'assigned' ? 'Assigned' : 'Pending'}
                                                              </Badge>
                                                            </TableCell>
                                                          </TableRow>
                                                        ))}
                                                      </TableBody>
                                                    </Table>
                                                  </div>
                                                )}
                                              </div>
                                            );
                                          })}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
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

        {/* Summary */}
        <div className="text-sm text-muted-foreground">
          Showing {siteGroups.length} site location{siteGroups.length !== 1 ? 's' : ''} with{' '}
          {attendees.length} attendee{attendees.length !== 1 ? 's' : ''}
        </div>
      </CardContent>
    </Card>
  );
};