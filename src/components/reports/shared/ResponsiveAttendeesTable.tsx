import React from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useIsMobile } from "@/hooks/use-mobile";
import { 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Clock, 
  Headphones,
  FileText,
  User,
  Mail,
  Phone,
  Users,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Hash,
  ShoppingCart,
  Zap
} from "lucide-react";
import { RfidAssignmentCell } from "../../RfidAssignmentCell";
import { EnhancedRfidAssignmentCell } from "../../EnhancedRfidAssignmentCell";
import { EnhancedAttendee, TableColumn, GroupedAttendee } from "../CheckInManagementTab";
import { CollapsibleOrderGroup } from "./CollapsibleOrderGroup";
import { useGroupRfid } from "@/components/GroupRfidProvider";
import { KeyboardShortcutsHelper } from "@/components/KeyboardShortcutsHelper";

interface ResponsiveAttendeesTableProps {
  attendees: EnhancedAttendee[] | Record<string, EnhancedAttendee[]>;
  groupedAttendees?: GroupedAttendee[];
  columns: TableColumn[];
  visibleColumns: string[];
  currentPage: number;
  totalPages: number;
  totalCount: number;
  startIndex: number;
  endIndex: number;
  onPageChange: (page: number) => void;
  sortField: string;
  sortDirection: 'asc' | 'desc';
  onSort: (field: any) => void;
  isGroupedView?: boolean;
  isLoading?: boolean;
  onRefresh: () => void;
}

export const ResponsiveAttendeesTable: React.FC<ResponsiveAttendeesTableProps> = ({
  attendees,
  columns,
  visibleColumns,
  currentPage,
  totalPages,
  startIndex,
  endIndex,
  onPageChange,
  sortField,
  sortDirection,
  onSort,
  isGroupedView = false,
  onRefresh
}) => {
  const isMobile = useIsMobile();
  const { 
    navigateToRow, 
    expandedGroups, 
    toggleGroup, 
    getGroupProgress,
    isCapturingRfid 
  } = useGroupRfid();

  const getSortableFieldMap = () => ({
    first_name: 'first_name',
    last_name: 'last_name',
    email: 'email',
    phone: 'phone',
    activated_at: 'activated_at',
    rfid_status: 'rfid_status',
    overall_status: 'overall_status',
    arrival_day: 'arrival_day',
    meal_plan: 'meal_plan',
    ticket_type: 'ticket_type',
    registration_status: 'registration_status',
    order_id: 'order_id'
  });

  const getSortIcon = (field: string) => {
    const sortableFields = getSortableFieldMap();
    const actualField = sortableFields[field as keyof typeof sortableFields];
    
    if (sortField !== actualField) {
      return <ArrowUpDown className="ml-2 h-4 w-4" />;
    }
    
    return sortDirection === 'asc' 
      ? <ArrowUp className="ml-2 h-4 w-4" />
      : <ArrowDown className="ml-2 h-4 w-4" />;
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'activated': return 'default';      // Green - fully processed
      case 'assigned': return 'secondary';     // Blue - RFID assigned, awaiting activation  
      case 'unassigned': return 'destructive'; // Red - needs RFID assignment
      default: return 'outline';
    }
  };

  const getRegistrationStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'registered': return 'default';
      case 'cancelled': return 'destructive';
      case 'waitlisted': return 'secondary';
      default: return 'outline';
    }
  };

  const getRfidStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'active': return 'default';        // Green - activated
      case 'assigned': return 'secondary';    // Blue - manually assigned
      case 'unissued': return 'destructive';  // Red - not assigned
      case 'lost': return 'destructive';
      case 'replaced': return 'outline';
      case 'deactivated': return 'destructive';
      default: return 'destructive';          // Default to red for unassigned state
    }
  };

  const getWaiverStatusColor = (signed: boolean) => {
    return signed ? 'default' : 'destructive';
  };

  const renderCellContent = (columnKey: string, attendee: EnhancedAttendee) => {
    switch (columnKey) {
      case 'first_name':
        return (
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <Link 
              to={`/attendee/${attendee.id}`}
              className="text-primary hover:underline cursor-pointer"
            >
              {attendee.first_name}
            </Link>
            {attendee.is_group_order && (
              <Badge variant="outline" className="text-xs ml-2">
                <Users className="h-3 w-3 mr-1" />
                Group of {attendee.group_size}
              </Badge>
            )}
          </div>
        );
      
      case 'last_name':
        return (
          <div className="flex items-center gap-2">
            <Link 
              to={`/attendee/${attendee.id}`}
              className="text-primary hover:underline cursor-pointer"
            >
              {attendee.last_name}
            </Link>
            {attendee.is_group_order && (
              <Badge variant="outline" className="text-xs">
                <Users className="h-3 w-3 mr-1" />
                {attendee.group_size}
              </Badge>
            )}
          </div>
        );
      
      case 'email':
        return attendee.email ? (
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <span className="truncate">{attendee.email}</span>
          </div>
        ) : '-';
      
      case 'phone':
        return attendee.phone ? (
          <div className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-muted-foreground" />
            <span>{attendee.phone}</span>
          </div>
        ) : '-';
      
      case 'order_id':
        return attendee.order_id ? (
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            <span className="font-mono text-sm">{attendee.order_id}</span>
          </div>
        ) : '-';
      
      case 'ticket_type':
        return (
          <Badge variant="outline" className="capitalize">
            {attendee.ticket_type.replace('_', ' ')}
          </Badge>
        );
      
      case 'meal_plan':
        return attendee.meal_plan || 'No';
      
      case 'registration_status':
        return (
          <Badge variant={getRegistrationStatusColor(attendee.registration_status)} className="capitalize">
            {attendee.registration_status}
          </Badge>
        );
      
      case 'overall_status':
        return (
          <Badge variant={getStatusColor(attendee.overall_status)}>
            {attendee.overall_status}
          </Badge>
        );
      
      case 'rfid_status':
        return (
          <Badge variant={getRfidStatusColor(attendee.rfid_status)} className="capitalize">
            {attendee.rfid_status}
          </Badge>
        );
      
      case 'activated_at':
        return attendee.activated_at ? (
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <span className="text-sm">
              {new Date(attendee.activated_at).toLocaleDateString()} {new Date(attendee.activated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <XCircle className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Not activated</span>
          </div>
        );
      
      case 'waiver_signed':
        return attendee.waiver_signed ? (
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <Badge variant={getWaiverStatusColor(true)}>Signed</Badge>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <XCircle className="h-4 w-4 text-red-500" />
            <Badge variant={getWaiverStatusColor(false)}>Not Signed</Badge>
          </div>
        );
      
      case 'has_headphones':
        return attendee.has_headphones ? (
          <div className="flex items-center gap-2">
            <Headphones className="h-4 w-4 text-green-500" />
            <span>Yes</span>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <XCircle className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">No</span>
          </div>
        );
      
      case 'bar_hits':
        return (
          <div className="flex items-center gap-2">
            <Hash className="h-4 w-4 text-muted-foreground" />
            <span>{attendee.bar_hits || 0}</span>
          </div>
        );
      
      case 'arrival_day':
        return (
          <Badge variant="outline">
            {attendee.arrival_day || 'Unknown'}
          </Badge>
        );
      
      case 'is_duplicate':
        return attendee.is_duplicate ? (
          <Badge variant="destructive">
            <AlertCircle className="h-3 w-3 mr-1" />
            Duplicate
          </Badge>
        ) : (
          <span className="text-muted-foreground">No</span>
        );
      
      case 'is_phone_duplicate':
        return attendee.is_phone_duplicate ? (
          <Badge variant="destructive">
            <AlertCircle className="h-3 w-3 mr-1" />
            Duplicate
          </Badge>
        ) : (
          <span className="text-muted-foreground">No</span>
        );
      
      case 'regfox_id':
        return attendee.regfox_id ? (
          <span className="font-mono text-sm">{attendee.regfox_id}</span>
        ) : '-';
      
      case 'rfid_assignment':
        return (
          <div data-attendee-id={attendee.id}>
            <EnhancedRfidAssignmentCell
              attendeeId={attendee.id}
              currentRfidUid={attendee.rfid_uid}
              currentRfidStatus={attendee.rfid_status}
              attendeeName={`${attendee.first_name} ${attendee.last_name}`}
              onAssignmentComplete={onRefresh}
              rowIndex={0}
              totalRows={1}
              onNavigateRow={navigateToRow}
              isGroupProcessing={isGroupedView}
            />
          </div>
        );
      
      case 'notes':
        return attendee.notes ? (
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <span className="truncate max-w-[200px]">{attendee.notes}</span>
          </div>
        ) : '-';
      
      default:
        return '-';
    }
  };

  if (!Array.isArray(attendees) && !isGroupedView) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="text-muted-foreground">Invalid attendees data.</div>
      </div>
    );
  }

  const currentAttendees = isGroupedView ? attendees as Record<string, EnhancedAttendee[]> : attendees as EnhancedAttendee[];
  const hasData = isGroupedView ? Object.keys(currentAttendees).length > 0 : (currentAttendees as EnhancedAttendee[]).length > 0;

  if (!hasData) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="text-muted-foreground">No attendees found.</div>
      </div>
    );
  }

  const visibleTableColumns = columns.filter(column => 
    visibleColumns.includes(column.key) && column.desktop !== false
  );

  const getSortableFields = () => {
    const sortableFieldMap = getSortableFieldMap();
    return columns
      .filter(col => col.sortable && visibleColumns.includes(col.key))
      .map(col => ({
        key: sortableFieldMap[col.key as keyof typeof sortableFieldMap] || col.key,
        label: col.label
      }));
  };

  if (isMobile) {
    return (
      <div className="space-y-4">
        {/* Mobile Sort Control */}
        <div className="flex items-center gap-2">
          <Select value={sortField} onValueChange={(value: string) => onSort(value)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Sort by..." />
            </SelectTrigger>
            <SelectContent>
              {getSortableFields().map((field) => (
                <SelectItem key={field.key} value={field.key}>
                  {field.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => onSort(sortField)}
          >
            {sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
          </Button>
        </div>

        {/* Mobile View */}
        <div className="space-y-4">
          {isGroupedView ? (
            // Grouped mobile view
            Object.entries(currentAttendees as Record<string, EnhancedAttendee[]>).map(([orderId, groupAttendees]) => {
              const progress = getGroupProgress(orderId);
              const isExpanded = expandedGroups.has(orderId);
              
              return (
                <CollapsibleOrderGroup
                  key={orderId || 'no-order'}
                  orderId={orderId}
                  attendees={groupAttendees}
                  columns={columns}
                  visibleColumns={visibleColumns}
                  defaultOpen={isExpanded}
                  onToggle={() => toggleGroup(orderId)}
                  groupProgress={progress}
                >
                  <div className="space-y-2 pl-4">
                    {isExpanded && groupAttendees.map((attendee, attendeeIndex) => (
                      <Card 
                        key={attendee.id} 
                        className={`shadow-sm ${isCapturingRfid ? 'bg-primary/5 border-l-2 border-l-primary' : ''}`}
                        data-row-index={attendeeIndex}
                        data-group-id={orderId}
                        data-attendee-id={attendee.id}
                      >
                        <CardContent className="p-4">
                          <div className="space-y-3">
                            {/* Primary Info */}
                            <div className="flex items-start justify-between">
                              <div>
                                <h3 className="font-medium text-base flex items-center gap-2">
                                  <Link 
                                    to={`/attendee/${attendee.id}`}
                                    className="text-primary hover:underline cursor-pointer"
                                  >
                                    {attendee.first_name} {attendee.last_name}
                                  </Link>
                                  {attendee.is_group_order && (
                                    <Badge variant="outline" className="text-xs">
                                      <Users className="h-3 w-3 mr-1" />
                                      Group of {attendee.group_size}
                                    </Badge>
                                  )}
                                </h3>
                                {attendee.email && (
                                  <p className="text-sm text-muted-foreground mt-1">
                                    {attendee.email}
                                  </p>
                                )}
                                {attendee.phone && (
                                  <p className="text-sm text-muted-foreground">
                                    <Phone className="h-3 w-3 inline mr-1" />
                                    {attendee.phone}
                                  </p>
                                )}
                              </div>
                              <Badge variant={getStatusColor(attendee.rfid_status)} className="text-xs">
                                {attendee.rfid_status}
                              </Badge>
                            </div>

                            {visibleColumns.map((columnKey) => {
                              const column = columns.find(c => c.key === columnKey);
                              if (!column || ['first_name', 'last_name', 'email', 'rfid_status'].includes(columnKey)) return null;
                              
                              return (
                                <div key={columnKey} className="flex items-center justify-between text-sm">
                                  <span className="text-muted-foreground capitalize">
                                    {column.label}:
                                  </span>
                                  <div className="max-w-[200px] truncate">
                                    {renderCellContent(columnKey, attendee)}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CollapsibleOrderGroup>
              );
            })
          ) : (
            // Individual mobile view
            (currentAttendees as EnhancedAttendee[]).map((attendee, index) => (
              <Card 
                key={attendee.id} 
                className={`shadow-sm ${isCapturingRfid ? 'bg-primary/5 border-l-2 border-l-primary' : ''}`}
                data-row-index={index}
                data-attendee-id={attendee.id}
              >
                <CardContent className="p-4">
                  <div className="space-y-3">
                    {/* Primary Info */}
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-medium text-base flex items-center gap-2">
                          <Link 
                            to={`/attendee/${attendee.id}`}
                            className="text-primary hover:underline cursor-pointer"
                          >
                            {attendee.first_name} {attendee.last_name}
                          </Link>
                          {attendee.is_group_order && (
                            <Badge variant="outline" className="text-xs">
                              <Users className="h-3 w-3 mr-1" />
                              Group of {attendee.group_size}
                            </Badge>
                          )}
                        </h3>
                        {attendee.email && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {attendee.email}
                          </p>
                        )}
                        {attendee.phone && (
                          <p className="text-sm text-muted-foreground">
                            <Phone className="h-3 w-3 inline mr-1" />
                            {attendee.phone}
                          </p>
                        )}
                      </div>
                      <Badge variant={getStatusColor(attendee.rfid_status)} className="text-xs">
                        {attendee.rfid_status}
                      </Badge>
                    </div>

                    {visibleColumns.map((columnKey) => {
                      const column = columns.find(c => c.key === columnKey);
                      if (!column || ['first_name', 'last_name', 'email', 'rfid_status'].includes(columnKey)) return null;
                      
                      return (
                        <div key={columnKey} className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground capitalize">
                            {column.label}:
                          </span>
                          <div className="max-w-[200px] truncate">
                            {renderCellContent(columnKey, attendee)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Mobile Pagination */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {currentPage} of {totalPages}
          </p>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage <= 1}
            >
              Previous
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage >= totalPages}
            >
              Next
            </Button>
          </div>
        </div>

        <KeyboardShortcutsHelper isGroupedView={isGroupedView} />
      </div>
    );
  }

  // Desktop View
  return (
    <div className="space-y-4">
      <div className="border rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-border">
          <thead className="bg-muted/30">
            <tr>
              {visibleTableColumns.map((column) => (
                <th key={column.key} className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {column.sortable ? (
                    <Button
                      variant="ghost"
                      className="h-auto p-0 font-medium hover:bg-transparent text-xs uppercase tracking-wider"
                      onClick={() => onSort(column.key)}
                    >
                      {column.label}
                      {getSortIcon(column.key)}
                    </Button>
                  ) : (
                    column.label
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isGroupedView ? (
              // Grouped desktop view
              Object.entries(currentAttendees as Record<string, EnhancedAttendee[]>).map(([orderId, groupAttendees]) => {
                const progress = getGroupProgress(orderId);
                const isExpanded = expandedGroups.has(orderId);
                
                return (
                  <CollapsibleOrderGroup
                    key={orderId || 'no-order'}
                    orderId={orderId}
                    attendees={groupAttendees}
                    columns={columns}
                    visibleColumns={visibleColumns}
                    defaultOpen={isExpanded}
                    onToggle={() => toggleGroup(orderId)}
                    groupProgress={progress}
                  >
                    {isExpanded && groupAttendees.map((attendee, attendeeIndex) => (
                      <tr 
                        key={attendee.id} 
                        className={`border-b hover:bg-muted/50 transition-colors ${
                          isCapturingRfid ? 'bg-primary/5 border-l-2 border-l-primary' : ''
                        }`}
                        data-row-index={attendeeIndex}
                        data-group-id={orderId}
                        data-attendee-id={attendee.id}
                      >
                        {visibleTableColumns.map((column) => (
                          <td key={column.key} className="p-3 text-sm">
                            {renderCellContent(column.key, attendee)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </CollapsibleOrderGroup>
                );
              })
            ) : (
              // Individual desktop view  
              (currentAttendees as EnhancedAttendee[]).map((attendee, index) => (
                <tr 
                  key={attendee.id} 
                  className={`border-b hover:bg-muted/50 transition-colors ${
                    isCapturingRfid ? 'bg-primary/5 border-l-2 border-l-primary' : ''
                  }`}
                  data-row-index={index}
                  data-attendee-id={attendee.id}
                >
                  {visibleTableColumns.map((column) => (
                    <td key={column.key} className="p-3">
                      {renderCellContent(column.key, attendee)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Desktop Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Showing {startIndex} to {endIndex} attendees
        </p>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage <= 1}
          >
            Previous
          </Button>
          
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            const pageNum = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
            return (
              <Button
                key={pageNum}
                variant={currentPage === pageNum ? "default" : "outline"}
                size="sm"
                onClick={() => onPageChange(pageNum)}
              >
                {pageNum}
              </Button>
            );
          })}
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage >= totalPages}
          >
            Next
          </Button>
        </div>
      </div>

      <KeyboardShortcutsHelper isGroupedView={isGroupedView} />
    </div>
  );
};