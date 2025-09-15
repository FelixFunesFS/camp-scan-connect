import React, { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FilterPanel } from "./shared/FilterPanel";
import type { ActiveFilter } from "./shared/FilterPanel";
import { ColumnSelector } from "./shared/ColumnSelector";
import { ExportButton } from "./shared/ExportButton";
import { ResponsiveAttendeesTable } from "./shared/ResponsiveAttendeesTable";
import { useToast } from "@/hooks/use-toast";

// Types
export interface EnhancedAttendee {
  id: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  regfox_id?: string;
  order_id?: string;
  ticket_type: string;
  registration_status: string;
  checked_in_at?: string;
  waiver_signed?: boolean;
  rfid_uid?: string;
  rfid_status: string;
  has_headphones?: boolean;
  bar_hits?: number;
  overall_status: string;
  arrival_day?: string;
  is_duplicate?: boolean;
  is_phone_duplicate?: boolean;
  meal_plan?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface TableColumn {
  key: string;
  label: string;
  mobile?: boolean;
  desktop?: boolean;
  width?: string;
  sortable?: boolean;
}

interface CheckInManagementTabProps {
  isRefreshing: boolean;
}

interface GroupedAttendee {
  orderId: string | null;
  attendees: EnhancedAttendee[];
}

// Remove unused ActiveFilter type import
type SortField = keyof EnhancedAttendee | '';
type SortDirection = 'asc' | 'desc';

export const CheckInManagementTab: React.FC<CheckInManagementTabProps> = ({ isRefreshing }) => {
  // State management
  const [attendees, setAttendees] = useState<EnhancedAttendee[]>([]);
  const [filteredAttendees, setFilteredAttendees] = useState<EnhancedAttendee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilters, setActiveFilters] = useState<ActiveFilter[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<string>('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [isGroupedView, setIsGroupedView] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState<string[]>([
    'first_name', 'last_name', 'email', 'overall_status', 'rfid_status', 'checked_in_at'
  ]);

  const { toast } = useToast();

  // Table columns configuration
  const allColumns: TableColumn[] = [
    { key: 'order_id', label: 'Order ID', desktop: true, width: 'min-w-24', sortable: true },
    { key: 'first_name', label: 'Name', mobile: true, desktop: true, width: 'min-w-32', sortable: true },
    { key: 'last_name', label: 'Last Name', desktop: true, width: 'min-w-32', sortable: true },
    { key: 'email', label: 'Email', mobile: true, desktop: true, width: 'min-w-48', sortable: true },
    { key: 'phone', label: 'Phone', desktop: true, width: 'min-w-32', sortable: true },
    { key: 'ticket_type', label: 'Ticket Type', mobile: true, desktop: true, width: 'min-w-24', sortable: true },
    { key: 'meal_plan', label: 'Meal Plan', desktop: true, width: 'min-w-20', sortable: true },
    { key: 'registration_status', label: 'Registration', mobile: true, desktop: true, width: 'min-w-24', sortable: true },
    { key: 'overall_status', label: 'Status', mobile: true, desktop: true, width: 'min-w-24', sortable: true },
    { key: 'rfid_status', label: 'RFID Status', mobile: true, desktop: true, width: 'min-w-24', sortable: true },
    { key: 'checked_in_at', label: 'Check-in Time', desktop: true, width: 'min-w-32', sortable: true },
    { key: 'waiver_signed', label: 'Waiver', desktop: true, width: 'min-w-20' },
    { key: 'has_headphones', label: 'Headphones', desktop: true, width: 'min-w-24' },
    { key: 'bar_hits', label: 'Bar Visits', desktop: true, width: 'min-w-20' },
    { key: 'arrival_day', label: 'Arrival Day', desktop: true, width: 'min-w-24', sortable: true },
    { key: 'is_duplicate', label: 'Name Duplicate', desktop: true, width: 'min-w-24' },
    { key: 'is_phone_duplicate', label: 'Phone Duplicate', desktop: true, width: 'min-w-24' },
    { key: 'regfox_id', label: 'RegFox ID', desktop: true, width: 'min-w-24' },
    { key: 'notes', label: 'Notes', desktop: true, width: 'min-w-48' }
  ];

  // Data fetching
  const fetchAttendees = async () => {
    try {
      setIsLoading(true);
      
      const { data: attendeesData, error: attendeesError } = await supabase
        .from('attendees')
        .select('*')
        .order('created_at', { ascending: false });

      if (attendeesError) throw attendeesError;

      const { data: rfidData, error: rfidError } = await supabase
        .from('rfid_tags')
        .select('*');

      if (rfidError) throw rfidError;

      const { data: transactionData, error: transactionError } = await supabase
        .from('station_transactions')
        .select('*');

      if (transactionError) throw transactionError;

      const processedAttendees: EnhancedAttendee[] = attendeesData.map(attendee => {
        const rfidTag = rfidData?.find(tag => tag.attendee_id === attendee.id);
        const transactions = transactionData?.filter(t => t.attendee_id === attendee.id) || [];
        
        const has_headphones = transactions.some(t => 
          t.station_type === 'headphones' && t.transaction_type === 'activate'
        );
        
        const bar_hits = transactions.filter(t => 
          t.station_type === 'drinks' && t.transaction_type === 'drink'
        ).length;

        let overall_status = 'pending';
        if (attendee.checked_in_at && rfidTag?.status === 'active' && attendee.waiver_signed) {
          overall_status = 'complete';
        } else if (attendee.checked_in_at) {
          overall_status = 'Checked In';
        } else if (rfidTag?.status === 'active') {
          overall_status = 'RFID Assigned';
        }

        const arrival_day = attendee.arrival_window === 'early' ? 'Thursday' : 'Friday';

        const duplicateEmails = attendeesData.filter(a => 
          a.email && a.email === attendee.email && a.id !== attendee.id
        );
        const is_duplicate = duplicateEmails.length > 0;

        const duplicatePhones = attendeesData.filter(a => 
          a.phone && a.phone === attendee.phone && a.id !== attendee.id
        );
        const is_phone_duplicate = duplicatePhones.length > 0;

        return {
          ...attendee,
          rfid_uid: rfidTag?.uid || null,
          rfid_status: rfidTag?.status || 'unissued',
          has_headphones,
          bar_hits,
          overall_status,
          arrival_day,
          is_duplicate,
          is_phone_duplicate,
          waiver_signed: attendee.waiver_signed ?? false,
          checked_in_at: attendee.checked_in_at ?? null,
          meal_plan: attendee.meal_plan || 'No',
          notes: attendee.notes || '',
          email: attendee.email || '',
          phone: attendee.phone || '',
          regfox_id: attendee.regfox_id || '',
          registration_status: attendee.registration_status || 'registered'
        };
      });

      setAttendees(processedAttendees);
      setFilteredAttendees(processedAttendees);

    } catch (error) {
      console.error("Error fetching attendees:", error);
      toast({
        title: "Error",
        description: "Failed to fetch attendees data",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendees();
  }, []);

  useEffect(() => {
    if (isRefreshing) {
      fetchAttendees();
    }
  }, [isRefreshing]);

  // Set up real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel('attendees-checkin-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'attendees'
      }, () => {
        fetchAttendees();
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'rfid_tags'
      }, () => {
        fetchAttendees();
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'station_transactions'
      }, () => {
        fetchAttendees();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Filter and process attendees
  const processedAttendees = useMemo(() => {
    const filtered = filteredAttendees.filter(attendee => {
      // Search functionality
      if (searchTerm) {
        const searchFields = [
          attendee.first_name,
          attendee.last_name,
          attendee.email,
          attendee.phone,
          attendee.regfox_id,
          attendee.order_id
        ];
        
        const matchesSearch = searchFields.some(field => 
          field?.toLowerCase().includes(searchTerm.toLowerCase())
        );
        
        if (!matchesSearch) return false;
      }

      // Filter functionality
      for (const filter of activeFilters) {
        if (!filter.value) continue;
        
        const attendeeValue = attendee[filter.key as keyof EnhancedAttendee];
        
        if (filter.key === 'checked_in_at') {
          const isCheckedIn = attendeeValue ? 'yes' : 'no';
          if (isCheckedIn !== filter.value) return false;
        } else if (filter.key === 'waiver_signed') {
          const hasWaiver = attendeeValue ? 'yes' : 'no';
          if (hasWaiver !== filter.value) return false;
        } else if (filter.key === 'has_headphones') {
          const hasHeadphones = attendeeValue ? 'yes' : 'no';
          if (hasHeadphones !== filter.value) return false;
        } else if (filter.key === 'is_duplicate') {
          const isDuplicate = attendeeValue ? 'yes' : 'no';
          if (isDuplicate !== filter.value) return false;
        } else if (filter.key === 'is_phone_duplicate') {
          const isPhoneDuplicate = attendeeValue ? 'yes' : 'no';
          if (isPhoneDuplicate !== filter.value) return false;
        } else {
          if (!attendeeValue || attendeeValue.toString().toLowerCase() !== filter.value.toLowerCase()) {
            return false;
          }
        }
      }

      return true;
    });

    return filtered;
  }, [filteredAttendees, searchTerm, activeFilters]);

  // Group attendees by order_id
  const groupedAttendees: GroupedAttendee[] = useMemo(() => {
    const groups = new Map<string, EnhancedAttendee[]>();
    
    processedAttendees.forEach(attendee => {
      const key = attendee.order_id || 'no-order';
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(attendee);
    });

    return Array.from(groups.entries()).map(([orderId, attendees]) => ({
      orderId: orderId === 'no-order' ? null : orderId,
      attendees
    }));
  }, [processedAttendees]);

  // Sort functionality
  const sortedAttendees = useMemo(() => {
    if (isGroupedView) {
      // Sort groups by order_id, then sort attendees within each group
      const sortedGroups = [...groupedAttendees].sort((a, b) => {
        const aOrderId = a.orderId || '';
        const bOrderId = b.orderId || '';
        return sortDirection === 'asc' 
          ? aOrderId.localeCompare(bOrderId)
          : bOrderId.localeCompare(aOrderId);
      });

      if (!sortField) return sortedGroups;

      // Sort attendees within each group
      return sortedGroups.map(group => ({
        ...group,
        attendees: [...group.attendees].sort((a, b) => {
          let aValue, bValue;

          switch (sortField) {
            case 'first_name':
              aValue = a.first_name?.toLowerCase() || '';
              bValue = b.first_name?.toLowerCase() || '';
              break;
            case 'last_name':
              aValue = a.last_name?.toLowerCase() || '';
              bValue = b.last_name?.toLowerCase() || '';
              break;
            case 'email':
              aValue = a.email?.toLowerCase() || '';
              bValue = b.email?.toLowerCase() || '';
              break;
            case 'phone':
              aValue = a.phone || '';
              bValue = b.phone || '';
              break;
            case 'checked_in_at':
              aValue = a.checked_in_at ? new Date(a.checked_in_at).getTime() : 0;
              bValue = b.checked_in_at ? new Date(b.checked_in_at).getTime() : 0;
              break;
            case 'rfid_status':
              aValue = a.rfid_status?.toLowerCase() || '';
              bValue = b.rfid_status?.toLowerCase() || '';
              break;
            case 'overall_status':
              aValue = a.overall_status?.toLowerCase() || '';
              bValue = b.overall_status?.toLowerCase() || '';
              break;
            case 'arrival_day':
              aValue = a.arrival_day || '';
              bValue = b.arrival_day || '';
              break;
            case 'meal_plan':
              aValue = Number(a.meal_plan) || 0;
              bValue = Number(b.meal_plan) || 0;
              break;
            case 'ticket_type':
              aValue = a.ticket_type?.toLowerCase() || '';
              bValue = b.ticket_type?.toLowerCase() || '';
              break;
            case 'registration_status':
              aValue = a.registration_status?.toLowerCase() || '';
              bValue = b.registration_status?.toLowerCase() || '';
              break;
            case 'order_id':
              aValue = a.order_id || '';
              bValue = b.order_id || '';
              break;
            default:
              aValue = '';
              bValue = '';
          }

          if (typeof aValue === 'number' && typeof bValue === 'number') {
            return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
          }

          return sortDirection === 'asc' 
            ? String(aValue).localeCompare(String(bValue))
            : String(bValue).localeCompare(String(aValue));
        })
      }));
    } else {
      // Individual view - sort all attendees
      if (!sortField) return processedAttendees;

      return [...processedAttendees].sort((a, b) => {
        let aValue, bValue;

        switch (sortField) {
          case 'first_name':
            aValue = a.first_name?.toLowerCase() || '';
            bValue = b.first_name?.toLowerCase() || '';
            break;
          case 'last_name':
            aValue = a.last_name?.toLowerCase() || '';
            bValue = b.last_name?.toLowerCase() || '';
            break;
          case 'email':
            aValue = a.email?.toLowerCase() || '';
            bValue = b.email?.toLowerCase() || '';
            break;
          case 'phone':
            aValue = a.phone || '';
            bValue = b.phone || '';
            break;
          case 'checked_in_at':
            aValue = a.checked_in_at ? new Date(a.checked_in_at).getTime() : 0;
            bValue = b.checked_in_at ? new Date(b.checked_in_at).getTime() : 0;
            break;
          case 'rfid_status':
            aValue = a.rfid_status?.toLowerCase() || '';
            bValue = b.rfid_status?.toLowerCase() || '';
            break;
          case 'overall_status':
            aValue = a.overall_status?.toLowerCase() || '';
            bValue = b.overall_status?.toLowerCase() || '';
            break;
          case 'arrival_day':
            aValue = a.arrival_day || '';
            bValue = b.arrival_day || '';
            break;
          case 'meal_plan':
            aValue = Number(a.meal_plan) || 0;
            bValue = Number(b.meal_plan) || 0;
            break;
          case 'ticket_type':
            aValue = a.ticket_type?.toLowerCase() || '';
            bValue = b.ticket_type?.toLowerCase() || '';
            break;
          case 'registration_status':
            aValue = a.registration_status?.toLowerCase() || '';
            bValue = b.registration_status?.toLowerCase() || '';
            break;
          case 'order_id':
            aValue = a.order_id || '';
            bValue = b.order_id || '';
            break;
          default:
            aValue = '';
            bValue = '';
        }

        if (typeof aValue === 'number' && typeof bValue === 'number') {
          return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
        }

        return sortDirection === 'asc' 
          ? String(aValue).localeCompare(String(bValue))
          : String(bValue).localeCompare(String(aValue));
      });
    }
  }, [groupedAttendees, processedAttendees, sortField, sortDirection, isGroupedView]);

  // Pagination
  const itemsPerPage = 50;
  const totalItems = isGroupedView 
    ? (sortedAttendees as GroupedAttendee[]).reduce((sum, group) => sum + group.attendees.length, 0)
    : (sortedAttendees as EnhancedAttendee[]).length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
  
  const paginatedData = isGroupedView 
    ? (sortedAttendees as GroupedAttendee[])
    : (sortedAttendees as EnhancedAttendee[]).slice(startIndex, endIndex);

  // Sort handler
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Filter options
  const filterOptions = [
    {
      key: 'registration_status',
      label: 'Registration Status',
      type: "select" as const,
      options: [...new Set(attendees.map(a => a.registration_status).filter(Boolean))].map(status => ({
        label: status.charAt(0).toUpperCase() + status.slice(1),
        value: status
      }))
    },
    {
      key: 'ticket_type',
      label: 'Ticket Type',
      type: "select" as const,
      options: [...new Set(attendees.map(a => a.ticket_type).filter(Boolean))].map(type => ({
        label: type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
        value: type
      }))
    },
    {
      key: 'overall_status',
      label: 'Overall Status',
      type: "select" as const,
      options: [...new Set(attendees.map(a => a.overall_status).filter(Boolean))].map(status => ({
        label: status,
        value: status
      }))
    },
    {
      key: 'rfid_status',
      label: 'RFID Status',
      type: "select" as const,
      options: [...new Set(attendees.map(a => a.rfid_status).filter(Boolean))].map(status => ({
        label: status.charAt(0).toUpperCase() + status.slice(1),
        value: status
      }))
    },
    {
      key: 'checked_in_at',
      label: 'Check-in Status',
      type: "select" as const,
      options: [
        { label: 'Checked In', value: 'yes' },
        { label: 'Not Checked In', value: 'no' }
      ]
    },
    {
      key: 'waiver_signed',
      label: 'Waiver Status',
      type: "select" as const,
      options: [
        { label: 'Signed', value: 'yes' },
        { label: 'Not Signed', value: 'no' }
      ]
    },
    {
      key: 'has_headphones',
      label: 'Headphones',
      type: "select" as const,
      options: [
        { label: 'Has Headphones', value: 'yes' },
        { label: 'No Headphones', value: 'no' }
      ]
    },
    {
      key: 'is_duplicate',
      label: 'Name Duplicates',
      type: "select" as const,
      options: [
        { label: 'Has Duplicate', value: 'yes' },
        { label: 'No Duplicate', value: 'no' }
      ]
    },
    {
      key: 'is_phone_duplicate',
      label: 'Phone Duplicates',
      type: "select" as const,
      options: [
        { label: 'Has Duplicate', value: 'yes' },
        { label: 'No Duplicate', value: 'no' }
      ]
    }
  ];

  const handleFilterChange = (key: string, value: string) => {
    if (!value) {
      handleClearFilter(key);
      return;
    }
    
    const filterOption = filterOptions.find(f => f.key === key);
    const label = filterOption?.label || key;
    
    setActiveFilters(prev => {
      const filtered = prev.filter(f => f.key !== key);
      if (value) {
        return [...filtered, { key, value, label }];
      }
      return filtered;
    });
    setCurrentPage(1);
  };

  const handleClearFilter = (key: string) => {
    setActiveFilters(prev => prev.filter(f => f.key !== key));
  };

  const handleClearAllFilters = () => {
    setActiveFilters([]);
    setCurrentPage(1);
  };

  // Export data preparation
  const exportData = processedAttendees.map(attendee => ({
    'Order ID': attendee.order_id || '',
    'First Name': attendee.first_name,
    'Last Name': attendee.last_name,
    'Email': attendee.email || '',
    'Phone': attendee.phone || '',
    'Ticket Type': attendee.ticket_type,
    'Meal Plan': attendee.meal_plan || '',
    'Registration Status': attendee.registration_status,
    'Overall Status': attendee.overall_status,
    'RFID Status': attendee.rfid_status,
    'RFID UID': attendee.rfid_uid || '',
    'Checked In': attendee.checked_in_at ? 'Yes' : 'No',
    'Check-in Time': attendee.checked_in_at || '',
    'Waiver Signed': attendee.waiver_signed ? 'Yes' : 'No',
    'Has Headphones': attendee.has_headphones ? 'Yes' : 'No',
    'Bar Visits': attendee.bar_hits || 0,
    'Arrival Day': attendee.arrival_day || '',
    'Name Duplicate': attendee.is_duplicate ? 'Yes' : 'No',
    'Phone Duplicate': attendee.is_phone_duplicate ? 'Yes' : 'No',
    'RegFox ID': attendee.regfox_id || '',
    'Notes': attendee.notes || ''
  }));

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold">Check-In Management</h2>
        <p className="text-muted-foreground mt-2">
          Track attendee check-ins, RFID assignments, and overall status
        </p>
      </div>

      <div className="space-y-4">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex gap-2 items-center">
              <Input
                placeholder="Search attendees..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-sm"
              />
              
              <Button
                variant={isGroupedView ? "default" : "outline"}
                onClick={() => setIsGroupedView(!isGroupedView)}
                className="whitespace-nowrap"
              >
                {isGroupedView ? "Group View" : "Individual View"}
              </Button>
            </div>
            
            <div className="flex gap-2">
              <ColumnSelector
                columns={allColumns}
                visibleColumns={visibleColumns}
                onVisibleColumnsChange={setVisibleColumns}
              />
              <ExportButton data={exportData} filename="checkin-management-report" />
            </div>
          </div>

          <FilterPanel
            filters={filterOptions}
            activeFilters={activeFilters}
            onFilterChange={handleFilterChange}
            onClearFilter={handleClearFilter}
            onClearAll={handleClearAllFilters}
          />

          <ResponsiveAttendeesTable
            attendees={isGroupedView ? [] : (paginatedData as EnhancedAttendee[])}
            groupedAttendees={isGroupedView ? (paginatedData as GroupedAttendee[]) : []}
            isGroupedView={isGroupedView}
            columns={allColumns}
            visibleColumns={visibleColumns}
            isLoading={isLoading}
            currentPage={currentPage}
            totalPages={totalPages}
            startIndex={startIndex + 1}
            endIndex={endIndex}
            totalCount={totalItems}
            onPageChange={setCurrentPage}
            sortField={sortField}
            sortDirection={sortDirection}
            onSort={handleSort}
          />
        </div>
      </div>
    </div>
  );
};