import React, { useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Clock, 
  User, 
  Phone, 
  Mail,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  UserCheck,
  Users,
  Headphones,
  Wine
} from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { EnhancedAttendee, TableColumn, GroupedAttendee } from "../CheckInManagementTab";
import { EnhancedRfidAssignmentCell } from "@/components/EnhancedRfidAssignmentCell";
import { CollapsibleOrderGroup } from "./CollapsibleOrderGroup";
import { useGroupRfid } from "@/components/GroupRfidProvider";
import { KeyboardShortcutsHelper } from "@/components/KeyboardShortcutsHelper";

interface ResponsiveAttendeesTableProps {
  attendees: GroupedAttendee[] | EnhancedAttendee[];
  columns: TableColumn[];
  visibleColumns: string[];
  currentPage: number;
  totalPages: number;
  totalAttendees: number;
  sortField: string;
  sortDirection: 'asc' | 'desc';
  onSort: (field: keyof EnhancedAttendee) => void;
  onPageChange: (page: number) => void;
  onRefresh: () => void;
  isGroupedView?: boolean;
}

export const ResponsiveAttendeesTable: React.FC<ResponsiveAttendeesTableProps> = ({
  attendees,
  columns,
  visibleColumns,
  currentPage,
  totalPages,
  totalAttendees,
  sortField,
  sortDirection,
  onSort,
  onPageChange,
  onRefresh,
  isGroupedView = false
}) => {
  const isMobile = useIsMobile();
  
  const { 
    focusFirstUnassignedRow, 
    focusLastUnassignedRow, 
    focusNextUnassigned,
    expandAllGroups,
    collapseAllGroups,
    expandedGroups,
    toggleGroup,
    getGroupProgress
  } = useGroupRfid();

  // Enhanced keyboard event handler with cross-platform support
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      
      // Only handle if we're not in an input field or if it's an RFID input
      const isRfidInput = target.hasAttribute('data-rfid-input');
      const isGeneralInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';
      
      if (isGeneralInput && !isRfidInput) return;

      // Cross-platform modifier key detection
      const modifierKey = e.ctrlKey || e.metaKey;

      switch (e.key) {
        case 'f':
        case 'F':
          if (modifierKey) {
            e.preventDefault();
            focusFirstUnassignedRow();
          }
          break;
        case 'l':
        case 'L':
          if (modifierKey) {
            e.preventDefault();
            focusLastUnassignedRow();
          }
          break;
        case 'g':
        case 'G':
          if (modifierKey) {
            e.preventDefault();
            focusNextUnassigned();
          }
          break;
        case 'e':
        case 'E':
          if (modifierKey && isGroupedView) {
            e.preventDefault();
            expandAllGroups();
          }
          break;
        case 'c':
        case 'C':
          if (modifierKey && isGroupedView) {
            e.preventDefault();
            collapseAllGroups();
          }
          break;
        case 'T':
          if (modifierKey && e.shiftKey) {
            e.preventDefault();
            // Trigger test RFID generation (handled by parent component)
            document.dispatchEvent(new CustomEvent('generate-test-rfids'));
          }
          break;
        case 'R':
          if (modifierKey && e.shiftKey) {
            e.preventDefault();
            // Trigger test cleanup (handled by parent component)
            document.dispatchEvent(new CustomEvent('cleanup-test-rfids'));
          }
          break;
      }
    };

    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => document.removeEventListener('keydown', handleGlobalKeyDown);
  }, [
    focusFirstUnassignedRow, 
    focusLastUnassignedRow, 
    focusNextUnassigned,
    expandAllGroups,
    collapseAllGroups,
    isGroupedView
  ]);

  const getSortIcon = (field: string) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-3 w-3 text-muted-foreground" />;
    }
    return sortDirection === 'asc' ? 
      <ArrowUp className="h-3 w-3" /> : 
      <ArrowDown className="h-3 w-3" />;
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'activated': return 'default';
      case 'assigned': return 'secondary';
      case 'unassigned': return 'outline';
      default: return 'outline';
    }
  };

  const getRegistrationStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'confirmed': return 'default';
      case 'registered': return 'secondary';
      case 'cancelled': return 'destructive';
      case 'refunded': return 'outline';
      default: return 'outline';
    }
  };

  const getRfidStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'active': return 'default';
      case 'assigned': return 'secondary';
      case 'unissued': return 'outline';
      case 'lost': return 'destructive';
      case 'replaced': return 'outline';
      case 'deactivated': return 'destructive';
      default: return 'outline';
    }
  };

  const getWaiverStatusColor = (signed: boolean) => {
    return signed ? 'default' : 'destructive';
  };

  const renderCellContent = (attendee: EnhancedAttendee, columnKey: string) => {
    switch (columnKey) {
      case 'first_name':
        return (
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{attendee.first_name}</span>
          </div>
        );
      case 'last_name':
        return <span className="font-medium">{attendee.last_name}</span>;
      case 'email':
        return attendee.email ? (
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <span className="font-mono text-xs truncate max-w-[200px]">{attendee.email}</span>
          </div>
        ) : (
          <span className="text-muted-foreground">-</span>
        );
      case 'phone':
        return attendee.phone ? (
          <div className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-muted-foreground" />
            <span className="font-mono text-xs">{attendee.phone}</span>
          </div>
        ) : (
          <span className="text-muted-foreground">-</span>
        );
      case 'order_id':
        return attendee.order_id ? (
          <div className="flex items-center gap-1">
            <Users className="h-3 w-3 text-muted-foreground" />
            <span className="font-mono text-xs">{attendee.order_id}</span>
            {attendee.group_size && attendee.group_size > 1 && (
              <Badge variant="outline" className="text-xs">
                {attendee.group_size}
              </Badge>
            )}
          </div>
        ) : (
          <span className="text-muted-foreground">Individual</span>
        );
      case 'ticket_type':
        return (
          <Badge variant="outline" className="text-xs">
            {attendee.ticket_type?.replace('_', ' ').toUpperCase()}
          </Badge>
        );
      case 'meal_plan':
        return attendee.meal_plan || <span className="text-muted-foreground">-</span>;
      case 'registration_status':
        return (
          <Badge variant={getRegistrationStatusColor(attendee.registration_status)} className="text-xs">
            {attendee.registration_status?.charAt(0).toUpperCase() + attendee.registration_status?.slice(1)}
          </Badge>
        );
      case 'rfid_status':
        return (
          <Badge variant={getRfidStatusColor(attendee.rfid_status)} className="text-xs">
            {attendee.rfid_status?.charAt(0).toUpperCase() + attendee.rfid_status?.slice(1)}
          </Badge>
        );
      case 'rfid_assignment':
        return (
          <EnhancedRfidAssignmentCell
            attendeeId={attendee.id}
            currentRfidUid={attendee.rfid_uid}
            currentRfidStatus={attendee.rfid_status}
            attendeeName={`${attendee.first_name} ${attendee.last_name}`}
            onAssignmentComplete={onRefresh}
          />
        );
      case 'activated_at':
        return attendee.activated_at ? (
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <span className="text-xs">
              {new Date(attendee.activated_at).toLocaleString()}
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <XCircle className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Not activated</span>
          </div>
        );
      case 'waiver_signed':
        return (
          <Badge variant={getWaiverStatusColor(attendee.waiver_signed ?? false)} className="text-xs">
            {attendee.waiver_signed ? 'Signed' : 'Pending'}
          </Badge>
        );
      case 'has_headphones':
        return attendee.has_headphones ? (
          <div className="flex items-center gap-1">
            <Headphones className="h-4 w-4 text-green-500" />
            <span className="text-xs">Yes</span>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">No</span>
        );
      case 'bar_hits':
        return (
          <div className="flex items-center gap-1">
            <Wine className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs">{attendee.bar_hits || 0}</span>
          </div>
        );
      case 'arrival_day':
        return (
          <Badge variant="outline" className="text-xs">
            {attendee.arrival_day}
          </Badge>
        );
      case 'is_duplicate':
        return attendee.is_duplicate ? (
          <Badge variant="destructive" className="text-xs">
            <AlertCircle className="h-3 w-3 mr-1" />
            Duplicate
          </Badge>
        ) : null;
      case 'is_phone_duplicate':
        return attendee.is_phone_duplicate ? (
          <Badge variant="destructive" className="text-xs">
            <AlertCircle className="h-3 w-3 mr-1" />
            Phone Dup
          </Badge>
        ) : null;
      case 'regfox_id':
        return attendee.regfox_id ? (
          <span className="font-mono text-xs">{attendee.regfox_id}</span>
        ) : (
          <span className="text-muted-foreground">-</span>
        );
      case 'notes':
        return attendee.notes ? (
          <span className="text-xs truncate max-w-[150px]" title={attendee.notes}>
            {attendee.notes}
          </span>
        ) : (
          <span className="text-muted-foreground">-</span>
        );
      default:
        const value = attendee[columnKey as keyof EnhancedAttendee];
        return value ? String(value) : <span className="text-muted-foreground">-</span>;
    }
  };

  // Type-safe data access with proper guards
  const groupedData: GroupedAttendee[] = isGroupedView && Array.isArray(attendees) 
    ? (attendees as GroupedAttendee[]) 
    : [];
  
  const individualData: EnhancedAttendee[] = !isGroupedView && Array.isArray(attendees)
    ? (attendees as EnhancedAttendee[]) 
    : [];

  // If no attendees or invalid data, show empty state
  if (!attendees || !Array.isArray(attendees) || attendees.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No attendees found matching the current filters.</p>
      </div>
    );
  }

  // Filter columns for mobile/desktop
  const visibleMobileColumns = columns.filter(col => 
    visibleColumns.includes(col.key) && col.mobile
  );
  
  const visibleDesktopColumns = columns.filter(col => 
    visibleColumns.includes(col.key) && col.desktop
  );

  return (
    <div className="space-y-4">
      <KeyboardShortcutsHelper isGroupedView={isGroupedView} />
      
      <div className="flex justify-between items-center text-sm text-muted-foreground">
        <div>
          {isGroupedView && groupedData.length > 0 ? (
            <span>
              Showing {groupedData.length} groups with {groupedData.reduce((sum, group) => sum + group.attendees.length, 0)} attendees
            </span>
          ) : individualData.length > 0 ? (
            <span>
              Showing {individualData.length} attendees
            </span>
          ) : (
            <span>No attendees to display</span>
          )}
        </div>
        
        {/* Pagination Controls */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
          
          <span className="text-xs">
            Page {currentPage} of {totalPages}
          </span>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Group Management Controls */}
      {isGroupedView && groupedData.length > 0 && (
        <div className="flex gap-2 mb-4">
          <Button
            variant="outline"
            size="sm"
            onClick={expandAllGroups}
            className="text-xs"
          >
            <ChevronDown className="h-3 w-3 mr-1" />
            Expand All ({groupedData.length} groups)
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={collapseAllGroups}
            className="text-xs"
          >
            <ChevronUp className="h-3 w-3 mr-1" />
            Collapse All
          </Button>
        </div>
      )}

      {/* Mobile Card View */}
      {isMobile && (
        <div className="space-y-3">
          {isGroupedView && groupedData.length > 0 ? (
            groupedData.map((group) => (
              <Card key={group.orderId || 'no-order'} className="overflow-hidden">
                <CardContent className="p-0">
                  <CollapsibleOrderGroup
                    orderId={group.orderId}
                    attendees={group.attendees}
                    columns={visibleMobileColumns}
                    visibleColumns={visibleMobileColumns.map(col => col.key)}
                    defaultOpen={expandedGroups.has(group.orderId || 'no-order')}
                    onToggle={() => toggleGroup(group.orderId || 'no-order')}
                    groupProgress={getGroupProgress(group.orderId || 'no-order')}
                  >
                    <div className="divide-y">
                      {group.attendees.map((attendee) => (
                        <div key={attendee.id} className="p-4 space-y-3">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">
                              {attendee.first_name} {attendee.last_name}
                            </span>
                            <Badge variant={getStatusColor(attendee.overall_status)} className="text-xs">
                              {attendee.overall_status}
                            </Badge>
                          </div>
                          
                          <div className="grid grid-cols-1 gap-2 text-sm">
                            {visibleMobileColumns.map((column) => (
                              <div key={column.key} className="flex justify-between items-center">
                                <span className="text-muted-foreground font-medium">
                                  {column.label}:
                                </span>
                                <div>{renderCellContent(attendee, column.key)}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CollapsibleOrderGroup>
                </CardContent>
              </Card>
            ))
          ) : individualData.length > 0 ? (
            individualData.map((attendee) => (
              <Card key={attendee.id} className="overflow-hidden">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">
                      {attendee.first_name} {attendee.last_name}
                    </span>
                    <Badge variant={getStatusColor(attendee.overall_status)} className="text-xs">
                      {attendee.overall_status}
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-2 text-sm">
                    {visibleMobileColumns.map((column) => (
                      <div key={column.key} className="flex justify-between items-center">
                        <span className="text-muted-foreground font-medium">
                          {column.label}:
                        </span>
                        <div>{renderCellContent(attendee, column.key)}</div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="text-center py-4 text-muted-foreground">
              No attendees to display
            </div>
          )}
        </div>
      )}

      {/* Desktop Table View */}
      {!isMobile && (
        <div className="border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-muted/50 border-b">
                  {visibleDesktopColumns.map((column) => (
                    <th
                      key={column.key}
                      className={`text-left p-3 font-medium text-sm border-r last:border-r-0 ${column.width || 'w-auto'}`}
                    >
                      <div className="flex items-center gap-2">
                        {column.label}
                        {column.sortable && (
                          <button
                            onClick={() => onSort(column.key as keyof EnhancedAttendee)}
                            className="p-1 hover:bg-accent rounded"
                          >
                            {getSortIcon(column.key)}
                          </button>
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              
              <tbody>
                {isGroupedView && groupedData.length > 0 ? (
                  groupedData.map((group) => (
                    <CollapsibleOrderGroup
                      key={group.orderId || 'no-order'}
                      orderId={group.orderId}
                      attendees={group.attendees}
                      columns={visibleDesktopColumns}
                      visibleColumns={visibleDesktopColumns.map(col => col.key)}
                      defaultOpen={expandedGroups.has(group.orderId || 'no-order')}
                      onToggle={() => toggleGroup(group.orderId || 'no-order')}
                      groupProgress={getGroupProgress(group.orderId || 'no-order')}
                    >
                      {group.attendees.map((attendee, attendeeIndex) => (
                        <tr
                          key={attendee.id}
                          className={`border-b last:border-b-0 hover:bg-accent/50 ${
                            attendeeIndex % 2 === 0 ? 'bg-background' : 'bg-muted/20'
                          }`}
                          data-row-index={attendeeIndex}
                        >
                          {visibleDesktopColumns.map((column) => (
                            <td
                              key={column.key}
                              className={`p-3 text-sm border-r last:border-r-0 align-top ${column.width || 'w-auto'}`}
                            >
                              {renderCellContent(attendee, column.key)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </CollapsibleOrderGroup>
                  ))
                ) : individualData.length > 0 ? (
                  individualData.map((attendee, index) => (
                    <tr
                      key={attendee.id}
                      className={`border-b last:border-b-0 hover:bg-accent/50 ${
                        index % 2 === 0 ? 'bg-background' : 'bg-muted/20'
                      }`}
                      data-row-index={index}
                    >
                      {visibleDesktopColumns.map((column) => (
                        <td
                          key={column.key}
                          className={`p-3 text-sm border-r last:border-r-0 align-top ${column.width || 'w-auto'}`}
                        >
                          {renderCellContent(attendee, column.key)}
                        </td>
                      ))}
                      </tr>
                    ))
                ) : (
                  <tr>
                    <td colSpan={visibleDesktopColumns.length} className="text-center py-8 text-muted-foreground">
                      No attendees to display
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination Controls (repeated at bottom) */}
      <div className="flex justify-center items-center gap-2 pt-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
        >
          <ChevronLeft className="h-4 w-4" />
          Previous
        </Button>
        
        <span className="text-sm text-muted-foreground">
          Page {currentPage} of {totalPages} • {totalAttendees} total attendees
        </span>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
        >
          Next
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};