import React, { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, X, Users as UsersIcon, UserCheck, AlertTriangle, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ScoreCard } from "./shared/ScoreCard";
import { ColumnSelector } from "./shared/ColumnSelector";
import { ExportButton } from "./shared/ExportButton";
import { ResponsiveAttendeesTable } from "./shared/ResponsiveAttendeesTable";
import { GroupRfidProvider } from "@/components/GroupRfidProvider";
import { RegFoxTotalsComparison } from "./shared/RegFoxTotalsComparison";
import { UnifiedSearchFilter, QuickFilter } from "./shared/UnifiedSearchFilter";
import { useIsMobile } from "@/hooks/use-mobile";
import { useToast } from "@/hooks/use-toast";

// Types - defined locally to avoid circular imports
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
  activated_at?: string;
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
  group_size?: number;
  is_group_order?: boolean;
}

export interface TableColumn {
  key: string;
  label: string;
  mobile?: boolean;
  desktop?: boolean;
  width?: string;
  sortable?: boolean;
}

export interface GroupedAttendee {
  orderId: string | null;
  attendees: EnhancedAttendee[];
}

interface AttendeeManagementTabProps {
  isRefreshing: boolean;
}

export const AttendeeManagementTab: React.FC<AttendeeManagementTabProps> = ({ isRefreshing }) => {
  // State management
  const [attendees, setAttendees] = useState<EnhancedAttendee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeQuickFilter, setActiveQuickFilter] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<string>('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [isGroupedView, setIsGroupedView] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState<string[]>([
    'first_name', 'last_name', 'phone', 'email', 'ticket_type', 'rfid_status', 'rfid_assignment', 'activated_at', 'actions'
  ]);

  const isMobile = useIsMobile();
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
    { key: 'rfid_status', label: 'RFID Status', mobile: true, desktop: true, width: 'min-w-24', sortable: true },
    { key: 'rfid_assignment', label: 'RFID Assignment', desktop: true, width: 'min-w-48', sortable: false },
    { key: 'activated_at', label: 'Activation Time', desktop: true, width: 'min-w-32', sortable: true },
    { key: 'waiver_signed', label: 'Waiver', desktop: true, width: 'min-w-20' },
    { key: 'has_headphones', label: 'Headphones', desktop: true, width: 'min-w-24' },
    { key: 'bar_hits', label: 'Bar Visits', desktop: true, width: 'min-w-20' },
    { key: 'arrival_day', label: 'Arrival Day', desktop: true, width: 'min-w-24', sortable: true },
    { key: 'is_duplicate', label: 'Name Duplicate', desktop: true, width: 'min-w-24' },
    { key: 'is_phone_duplicate', label: 'Phone Duplicate', desktop: true, width: 'min-w-24' },
    { key: 'regfox_id', label: 'RegFox ID', desktop: true, width: 'min-w-24' },
    { key: 'notes', label: 'Notes', desktop: true, width: 'min-w-48' },
    { key: 'actions', label: 'Actions', mobile: true, desktop: true, width: 'min-w-20', sortable: false }
  ];

  // Data fetching - identical to CheckInManagementTab
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

      // Calculate group sizes for order IDs
      const orderSizes = new Map<string, number>();
      attendeesData?.forEach(attendee => {
        if (attendee.order_id && attendee.order_id.trim()) {
          orderSizes.set(attendee.order_id, (orderSizes.get(attendee.order_id) || 0) + 1);
        }
      });

      const processedAttendees: EnhancedAttendee[] = (attendeesData || []).map(attendee => {
        const rfidTag = rfidData?.find(tag => tag.attendee_id === attendee.id);
        const transactions = transactionData?.filter(t => t.attendee_id === attendee.id) || [];
        
        const has_headphones = transactions.some(t => 
          t.station_type === 'headphones' && t.transaction_type === 'activate'
        );
        
        const bar_hits = transactions.filter(t => 
          t.station_type === 'drinks' && t.transaction_type === 'drink'
        ).length;

        const rfid_status = rfidTag?.status || 'unissued';
        let overall_status = 'unassigned';
        if (attendee.activated_at) {
          overall_status = 'activated';
        } else if (rfidTag?.status === 'assigned' || rfidTag?.status === 'active') {
          overall_status = 'assigned';
        }

        const arrival_day = attendee.arrival_window === 'early' ? 'Thursday' : 'Friday';

        const duplicateEmails = attendeesData?.filter(a => 
          a.email && a.email === attendee.email && a.id !== attendee.id
        ) || [];
        const is_duplicate = duplicateEmails.length > 0;

        const duplicatePhones = attendeesData?.filter(a => 
          a.phone && a.phone === attendee.phone && a.id !== attendee.id
        ) || [];
        const is_phone_duplicate = duplicatePhones.length > 0;

        const group_size = attendee.order_id ? orderSizes.get(attendee.order_id) || 1 : 1;
        const is_group_order = group_size > 1;

        return {
          ...attendee,
          rfid_uid: rfidTag?.uid || undefined,
          rfid_status,
          has_headphones,
          bar_hits,
          overall_status,
          arrival_day,
          is_duplicate,
          is_phone_duplicate,
          waiver_signed: attendee.waiver_signed ?? false,
          activated_at: attendee.activated_at ?? undefined,
          meal_plan: attendee.meal_plan || undefined,
          notes: attendee.notes || undefined,
          email: attendee.email || undefined,
          phone: attendee.phone || undefined,
          regfox_id: attendee.regfox_id || undefined,
          registration_status: attendee.registration_status || 'registered',
          group_size,
          is_group_order
        } as EnhancedAttendee;
      });

      setAttendees(processedAttendees);

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

  useEffect(() => { fetchAttendees(); }, []);
  useEffect(() => { if (isRefreshing) fetchAttendees(); }, [isRefreshing]);

  // Set up real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel('attendees-management-changes')
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

  // Quick filters with enhanced metrics
  const quickFilters: QuickFilter[] = useMemo(() => {
    const totalCount = attendees.length;
    const activatedCount = attendees.filter(a => a.activated_at).length;
    const assignedCount = attendees.filter(a => a.rfid_status === 'assigned' || a.rfid_status === 'active').length;
    const unassignedCount = attendees.filter(a => a.rfid_status === 'unissued').length;
    const missingWaiverCount = attendees.filter(a => !a.waiver_signed).length;
    const hasHeadphonesCount = attendees.filter(a => a.has_headphones).length;
    const duplicatesCount = attendees.filter(a => a.is_duplicate || a.is_phone_duplicate).length;
    const groupOrdersCount = attendees.filter(a => a.is_group_order).length;

    return [
      { id: "all", label: "All Attendees", count: totalCount },
      { id: "activated", label: "Checked In", count: activatedCount, color: "success" as const },
      { id: "assigned", label: "RFID Assigned", count: assignedCount, color: "warning" as const },
      { id: "unassigned", label: "Needs RFID", count: unassignedCount, color: "destructive" as const },
      { id: "missing_waiver", label: "Missing Waiver", count: missingWaiverCount, color: "warning" as const },
      { id: "has_headphones", label: "Has Headphones", count: hasHeadphonesCount },
      { id: "duplicates", label: "Duplicates", count: duplicatesCount, color: "warning" as const },
      { id: "group_orders", label: "Group Orders", count: groupOrdersCount }
    ];
  }, [attendees]);

  // Filter processed attendees
  const processedAttendees = useMemo(() => {
    let filtered = [...attendees];
    
    // Apply quick filter
    if (activeQuickFilter && activeQuickFilter !== 'all') {
      switch (activeQuickFilter) {
        case 'activated': filtered = filtered.filter(a => a.activated_at); break;
        case 'assigned': filtered = filtered.filter(a => a.rfid_status === 'assigned' || a.rfid_status === 'active'); break;
        case 'unassigned': filtered = filtered.filter(a => a.rfid_status === 'unissued'); break;
        case 'missing_waiver': filtered = filtered.filter(a => !a.waiver_signed); break;
        case 'has_headphones': filtered = filtered.filter(a => a.has_headphones); break;
        case 'duplicates': filtered = filtered.filter(a => a.is_duplicate || a.is_phone_duplicate); break;
        case 'group_orders': filtered = filtered.filter(a => a.is_group_order); break;
      }
    }
    
    // Apply search
    if (searchTerm) {
      filtered = filtered.filter(a => 
        [a.first_name, a.last_name, a.email, a.phone, a.regfox_id, a.order_id].some(field => 
          field?.toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }
    
    return filtered;
  }, [attendees, searchTerm, activeQuickFilter]);

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

  const handleSort = (field: keyof EnhancedAttendee) => {
    setSortField(field);
    setSortDirection(sortField === field ? (sortDirection === 'asc' ? 'desc' : 'asc') : 'asc');
  };

  // Summary metrics
  const totalRegistered = attendees.length;
  const totalActivated = attendees.filter(a => a.activated_at).length;
  const activationRate = totalRegistered > 0 ? Math.round((totalActivated / totalRegistered) * 100) : 0;
  const totalAssigned = attendees.filter(a => a.rfid_status === 'assigned' || a.rfid_status === 'active').length;
  const totalPendingWaivers = attendees.filter(a => !a.waiver_signed).length;

  return (
    <TooltipProvider>
      <GroupRfidProvider
        groupedAttendees={isGroupedView ? groupedAttendees : processedAttendees}
        isGroupedView={isGroupedView}
        onRefresh={fetchAttendees}
      >
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-primary">👥 Attendee Management</h2>
              <p className="text-muted-foreground">Complete attendee check-in and RFID management</p>
            </div>
            <ExportButton data={processedAttendees} filename="attendee-management" />
          </div>

          {/* Summary Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <Tooltip>
              <TooltipTrigger asChild>
                <div>
                  <ScoreCard
                    title="Total Registered"
                    value={totalRegistered}
                    icon={UsersIcon}
                    isLoading={isLoading}
                    variant="default"
                  />
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>All attendees registered for the event</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <div>
                  <ScoreCard
                    title="Checked In"
                    value={totalActivated}
                    subtitle={`${activationRate}% completion`}
                    icon={UserCheck}
                    isLoading={isLoading}
                    variant={activationRate > 70 ? "success" : activationRate > 40 ? "warning" : "error"}
                  />
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>Attendees who have completed the check-in process</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <div>
                  <ScoreCard
                    title="RFID Assigned"
                    value={totalAssigned}
                    subtitle="ready for services"
                    icon={UserCheck}
                    isLoading={isLoading}
                    variant={totalAssigned > totalActivated * 0.9 ? "success" : "warning"}
                  />
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>Attendees with RFID tags assigned or active</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <div>
                  <ScoreCard
                    title="Pending Waivers"
                    value={totalPendingWaivers}
                    subtitle="need attention"
                    icon={AlertTriangle}
                    isLoading={isLoading}
                    variant={totalPendingWaivers === 0 ? "success" : "warning"}
                  />
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>Attendees who haven't signed required waivers</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <div>
                  <ScoreCard
                    title="Group Orders"
                    value={attendees.filter(a => a.is_group_order).length}
                    subtitle="multi-person"
                    icon={UsersIcon}
                    isLoading={isLoading}
                    variant="default"
                  />
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>Attendees part of group bookings</p>
              </TooltipContent>
            </Tooltip>
          </div>

          <RegFoxTotalsComparison />

          <UnifiedSearchFilter
            searchValue={searchTerm}
            onSearchChange={setSearchTerm}
            quickFilters={quickFilters}
            activeQuickFilter={activeQuickFilter}
            onQuickFilterChange={setActiveQuickFilter}
            placeholder="Search by name, email, phone, or order ID..."
          />

          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex items-center gap-2">
              <Button
                variant={isGroupedView ? "default" : "outline"}
                size="sm"
                onClick={() => setIsGroupedView(!isGroupedView)}
              >
                {isGroupedView ? "Grouped View" : "Individual View"}
              </Button>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-4 w-4 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Toggle between individual attendees and grouped by order</p>
                </TooltipContent>
              </Tooltip>
            </div>
            
            {!isMobile && (
              <ColumnSelector
                columns={allColumns}
                visibleColumns={visibleColumns}
                onVisibleColumnsChange={setVisibleColumns}
              />
            )}
          </div>

          <ResponsiveAttendeesTable
            attendees={isGroupedView ? groupedAttendees : processedAttendees}
            columns={allColumns}
            visibleColumns={visibleColumns}
            currentPage={currentPage}
            totalPages={Math.ceil(processedAttendees.length / 50)}
            totalAttendees={processedAttendees.length}
            sortField={sortField}
            sortDirection={sortDirection}
            onSort={handleSort}
            onPageChange={setCurrentPage}
            onRefresh={fetchAttendees}
            isGroupedView={isGroupedView}
            isFullView={false}
          />
        </div>
      </GroupRfidProvider>
    </TooltipProvider>
  );
};