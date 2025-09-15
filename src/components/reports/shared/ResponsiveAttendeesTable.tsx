import React from "react";
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
  ArrowDown
} from "lucide-react";
import { EnhancedAttendee, TableColumn } from "../CheckInManagementTab";

interface ResponsiveAttendeesTableProps {
  attendees: EnhancedAttendee[];
  columns: TableColumn[];
  visibleColumns: string[];
  isLoading: boolean;
  currentPage: number;
  totalPages: number;
  startIndex: number;
  endIndex: number;
  totalCount: number;
  onPageChange: (page: number) => void;
  sortField: string;
  sortDirection: 'asc' | 'desc';
  onSort: (field: any) => void;
}

export const ResponsiveAttendeesTable: React.FC<ResponsiveAttendeesTableProps> = ({
  attendees,
  columns,
  visibleColumns,
  isLoading,
  currentPage,
  totalPages,
  startIndex,
  endIndex,
  totalCount,
  onPageChange,
  sortField,
  sortDirection,
  onSort
}) => {
  const isMobile = useIsMobile();

  const getSortableFieldMap = (key: string): string | null => {
    switch (key) {
      case 'first_name':
        return 'name';
      case 'email':
      case 'phone':
      case 'regfox_id':
      case 'bar_hits':
      case 'arrival_day':
      case 'updated_at':
        return key;
      default:
        return null;
    }
  };

  const getSortIcon = (columnKey: string) => {
    const sortableField = getSortableFieldMap(columnKey);
    if (!sortableField || sortField !== sortableField) {
      return <ArrowUpDown className="h-4 w-4 opacity-50" />;
    }
    return sortDirection === 'asc' ? 
      <ArrowUp className="h-4 w-4 text-primary" /> : 
      <ArrowDown className="h-4 w-4 text-primary" />;
  };

  const getStatusColor = (status: EnhancedAttendee['overall_status']) => {
    switch (status) {
      case 'complete':
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200';
      case 'RFID Assigned':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'Checked In':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200';
      case 'pending':
        return 'bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-200';
      default:
        return 'bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-200';
    }
  };

  const getRegistrationStatusColor = (status: EnhancedAttendee['registration_status']) => {
    switch (status) {
      case 'registered':
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'pending':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      case 'refunded':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'waitlisted':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      default:
        return 'bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-200';
    }
  };

  const getRfidStatusColor = (status: EnhancedAttendee['rfid_status']) => {
    switch (status) {
      case 'active':
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200';
      case 'deactivated':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'lost':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'replaced':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'unissued':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200';
      default:
        return 'bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-200';
    }
  };

  const getWaiverStatusColor = (signed: boolean) => {
    return signed 
      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200'
      : 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200';
  };

  const renderCellContent = (attendee: EnhancedAttendee, columnKey: keyof EnhancedAttendee) => {
    switch (columnKey) {
      case 'first_name':
        return `${attendee.first_name} ${attendee.last_name}`;
      
      case 'overall_status':
        return (
          <Badge className={getStatusColor(attendee.overall_status)}>
            {attendee.overall_status === 'complete' && <CheckCircle className="h-3 w-3 mr-1" />}
            {attendee.overall_status === 'RFID Assigned' && <AlertCircle className="h-3 w-3 mr-1" />}
            {attendee.overall_status === 'Checked In' && <AlertCircle className="h-3 w-3 mr-1" />}
            {attendee.overall_status === 'pending' && <Clock className="h-3 w-3 mr-1" />}
            {attendee.overall_status}
          </Badge>
        );
      
      case 'registration_status':
        return (
          <Badge className={getRegistrationStatusColor(attendee.registration_status)}>
            {attendee.registration_status === 'registered' && <CheckCircle className="h-3 w-3 mr-1" />}
            {attendee.registration_status === 'cancelled' && <XCircle className="h-3 w-3 mr-1" />}
            {(attendee.registration_status === 'pending' || attendee.registration_status === 'waitlisted') && <Clock className="h-3 w-3 mr-1" />}
            {attendee.registration_status.charAt(0).toUpperCase() + attendee.registration_status.slice(1)}
          </Badge>
        );
      
      case 'rfid_status':
        return (
          <Badge className={getRfidStatusColor(attendee.rfid_status)}>
            {attendee.rfid_status === 'active' && <CheckCircle className="h-3 w-3 mr-1" />}
            {attendee.rfid_status === 'deactivated' && <XCircle className="h-3 w-3 mr-1" />}
            {attendee.rfid_status === 'unissued' && <AlertCircle className="h-3 w-3 mr-1" />}
            {attendee.rfid_status.charAt(0).toUpperCase() + attendee.rfid_status.slice(1)}
          </Badge>
        );
      
      case 'ticket_type':
        return (
          <Badge variant="outline">
            {attendee.ticket_type.replace(/_/g, ' ').toUpperCase()}
          </Badge>
        );
      
      case 'meal_plan':
        return (
          <Badge variant={attendee.meal_plan === 'Yes' ? 'default' : 'secondary'}>
            {attendee.meal_plan}
          </Badge>
        );
      
      case 'waiver_signed':
        return (
          <Badge className={getWaiverStatusColor(attendee.waiver_signed)}>
            {attendee.waiver_signed ? (
              <FileText className="h-3 w-3 mr-1" />
            ) : (
              <AlertCircle className="h-3 w-3 mr-1" />
            )}
            {attendee.waiver_signed ? 'Signed' : 'Unsigned'}
          </Badge>
        );
      
      case 'has_headphones':
        return (
          <Badge variant={attendee.has_headphones ? 'default' : 'secondary'}>
            <Headphones className="h-3 w-3 mr-1" />
            {attendee.has_headphones ? 'Yes' : 'No'}
          </Badge>
        );
      
      case 'bar_hits':
        return (
          <Badge variant="outline">
            {attendee.bar_hits}
          </Badge>
        );
      
      case 'updated_at':
        return (
          <div className="text-xs text-muted-foreground">
            {new Date(attendee.updated_at).toLocaleDateString()}
          </div>
        );
      
      case 'is_duplicate':
        return (
          <Badge variant={attendee.is_duplicate ? 'destructive' : 'secondary'}>
            {attendee.is_duplicate && <Users className="h-3 w-3 mr-1" />}
            {attendee.is_duplicate ? 'Duplicate' : 'Unique'}
          </Badge>
        );
      
      case 'is_phone_duplicate':
        return (
          <Badge variant={attendee.is_phone_duplicate ? 'destructive' : 'secondary'}>
            {attendee.is_phone_duplicate && <Phone className="h-3 w-3 mr-1" />}
            {attendee.is_phone_duplicate ? 'Duplicate' : 'Unique'}
          </Badge>
        );
      
      default:
        const value = attendee[columnKey];
        return value ? String(value) : '-';
    }
  };

  if (isMobile) {
    return (
      <div className="space-y-4" data-export-target>
        {/* Mobile Sort Selector */}
        <div className="flex items-center gap-2 p-4 bg-muted/50 rounded-lg">
          <span className="text-sm font-medium">Sort by:</span>
          <Select 
            value={`${sortField}-${sortDirection}`}
            onValueChange={(value) => {
              const [field, direction] = value.split('-');
              onSort(field);
              if (sortField === field && sortDirection !== direction) {
                onSort(field); // Toggle direction
              }
            }}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="updated_at-desc">Last Updated (Newest)</SelectItem>
              <SelectItem value="updated_at-asc">Last Updated (Oldest)</SelectItem>
              <SelectItem value="name-asc">Name (A-Z)</SelectItem>
              <SelectItem value="name-desc">Name (Z-A)</SelectItem>
              <SelectItem value="email-asc">Email (A-Z)</SelectItem>
              <SelectItem value="email-desc">Email (Z-A)</SelectItem>
              <SelectItem value="bar_hits-desc">Bar Hits (Most)</SelectItem>
              <SelectItem value="bar_hits-asc">Bar Hits (Least)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <>
            {[...Array(5)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-4">
                  <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                  <div className="h-3 bg-muted rounded w-1/2 mb-2" />
                  <div className="h-3 bg-muted rounded w-2/3" />
                </CardContent>
              </Card>
            ))}
          </>
        ) : (
          <>
            {attendees.map((attendee) => (
              <Card key={attendee.id} className="border-primary/20">
                <CardContent className="p-4">
                  <div className="space-y-3">
                    {/* Header with name and status */}
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold text-primary">
                          {attendee.first_name} {attendee.last_name}
                        </h3>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                          <User className="h-3 w-3" />
                          {attendee.regfox_id || 'No ID'}
                        </div>
                      </div>
                      {renderCellContent(attendee, 'overall_status')}
                    </div>

                    {/* Contact info */}
                    <div className="space-y-1">
                      {attendee.email && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Mail className="h-3 w-3" />
                          {attendee.email}
                        </div>
                      )}
                      {attendee.phone && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Phone className="h-3 w-3" />
                          {attendee.phone}
                        </div>
                      )}
                    </div>

                    {/* Key info badges */}
                    <div className="flex flex-wrap gap-2">
                      {renderCellContent(attendee, 'ticket_type')}
                      {renderCellContent(attendee, 'meal_plan')}
                      {renderCellContent(attendee, 'registration_status')}
                      {renderCellContent(attendee, 'rfid_status')}
                      {renderCellContent(attendee, 'waiver_signed')}
                      {attendee.has_headphones && renderCellContent(attendee, 'has_headphones')}
                      {attendee.bar_hits > 0 && (
                        <Badge variant="outline">
                          Bar: {attendee.bar_hits}
                        </Badge>
                      )}
                      {attendee.is_duplicate && renderCellContent(attendee, 'is_duplicate')}
                      {attendee.is_phone_duplicate && renderCellContent(attendee, 'is_phone_duplicate')}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </>
        )}

        {/* Mobile Pagination */}
        {totalPages > 1 && (
          <Card className="border-primary/20">
            <CardContent className="p-4">
              <div className="flex justify-between items-center">
                <div className="text-sm text-muted-foreground">
                  {startIndex + 1}-{Math.min(endIndex, totalCount)} of {totalCount}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  // Desktop table view
  const visibleTableColumns = columns.filter(col => 
    visibleColumns.includes(col.key) && col.desktop !== false
  );

  return (
    <Card className="border-primary/20" data-export-target>
      <CardHeader>
        <CardTitle>Attendees List</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="h-12 bg-muted animate-pulse rounded" />
            ))}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    {visibleTableColumns.map((column) => {
                      const sortableField = getSortableFieldMap(column.key);
                      const isSortable = !!sortableField;
                      
                      return (
                        <th 
                          key={column.key} 
                          className={`text-left p-3 text-primary ${column.width || 'min-w-24'} ${
                            isSortable ? 'cursor-pointer hover:bg-muted/50 select-none' : ''
                          }`}
                          onClick={() => isSortable && onSort(sortableField)}
                        >
                          <div className="flex items-center gap-1">
                            {column.label}
                            {isSortable && getSortIcon(column.key)}
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {attendees.map((attendee) => (
                    <tr key={attendee.id} className="border-b hover:bg-muted/50">
                      {visibleTableColumns.map((column) => (
                        <td key={column.key} className="p-3">
                          {renderCellContent(attendee, column.key)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Desktop Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-between items-center mt-4 pt-4 border-t">
                <div className="text-sm text-muted-foreground">
                  Showing {startIndex + 1}-{Math.min(endIndex, totalCount)} of {totalCount}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  <div className="flex items-center gap-2">
                    {[...Array(Math.min(5, totalPages))].map((_, i) => {
                      const page = i + Math.max(1, currentPage - 2);
                      if (page > totalPages) return null;
                      return (
                        <Button
                          key={page}
                          variant={currentPage === page ? "default" : "outline"}
                          size="sm"
                          onClick={() => onPageChange(page)}
                          className="w-8 h-8 p-0"
                        >
                          {page}
                        </Button>
                      );
                    })}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};