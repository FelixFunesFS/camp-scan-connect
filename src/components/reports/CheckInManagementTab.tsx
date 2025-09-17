import React, { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, X } from "lucide-react";
import { FilterPanel } from "./shared/FilterPanel";
import type { ActiveFilter } from "./shared/FilterPanel";
import { ColumnSelector } from "./shared/ColumnSelector";
import { ExportButton } from "./shared/ExportButton";
import { ResponsiveAttendeesTable } from "./shared/ResponsiveAttendeesTable";
import { GroupRfidProvider } from "@/components/GroupRfidProvider";
import { RegFoxTotalsComparison } from "./shared/RegFoxTotalsComparison";
import { UnifiedSearchFilter, QuickFilter } from "./shared/UnifiedSearchFilter";
import { useIsMobile } from "@/hooks/use-mobile";
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

interface CheckInManagementTabProps {
  isRefreshing: boolean;
}

export interface GroupedAttendee {
  orderId: string | null;
  attendees: EnhancedAttendee[];
}

type SortField = keyof EnhancedAttendee | '';
type SortDirection = 'asc' | 'desc';

export const CheckInManagementTab: React.FC<CheckInManagementTabProps> = ({ isRefreshing }) => {
  // State management
  const [attendees, setAttendees] = useState<EnhancedAttendee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilters, setActiveFilters] = useState<ActiveFilter[]>([]);
  const [activeQuickFilter, setActiveQuickFilter] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<string>('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [isGroupedView, setIsGroupedView] = useState(false);
  const [isFullView, setIsFullView] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState<string[]>([
    'first_name', 'last_name', 'phone', 'email', 'ticket_type', 'arrival_day', 'rfid_status', 'rfid_assignment', 'activated_at', 'actions'
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

  // Data fetching - simplified for brevity
  const fetchAttendees = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase.from('attendees').select('*');
      if (error) throw error;
      
      // Process attendees data here...
      const processedData = data || [];
      setAttendees(processedData as EnhancedAttendee[]);
    } catch (error) {
      console.error("Error:", error);
      toast({ title: "Error", description: "Failed to fetch data", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchAttendees(); }, []);
  useEffect(() => { if (isRefreshing) fetchAttendees(); }, [isRefreshing]);

  // Quick filters
  const quickFilters: QuickFilter[] = [
    { id: "all", label: "All", count: attendees.length },
    { id: "activated", label: "Activated", count: attendees.filter(a => a.activated_at).length },
    { id: "unassigned", label: "Needs RFID", count: attendees.filter(a => a.rfid_status === 'unissued').length }
  ];

  // Filter processed attendees
  const processedAttendees = useMemo(() => {
    let filtered = [...attendees];
    
    // Apply quick filter
    if (activeQuickFilter && activeQuickFilter !== 'all') {
      switch (activeQuickFilter) {
        case 'activated': filtered = filtered.filter(a => a.activated_at); break;
        case 'unassigned': filtered = filtered.filter(a => a.rfid_status === 'unissued'); break;
      }
    }
    
    // Apply search
    if (searchTerm) {
      filtered = filtered.filter(a => 
        [a.first_name, a.last_name, a.email, a.phone].some(field => 
          field?.toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }
    
    return filtered;
  }, [attendees, searchTerm, activeQuickFilter]);

  const handleSort = (field: keyof EnhancedAttendee) => {
    setSortField(field);
    setSortDirection(sortField === field ? (sortDirection === 'asc' ? 'desc' : 'asc') : 'asc');
  };

  return (
    <GroupRfidProvider>
      <div className="space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-primary">Check-In Management</h2>
            <p className="text-muted-foreground">Manage attendee check-ins and RFID assignments</p>
          </div>
          <ExportButton data={processedAttendees} filename="checkin-management" />
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
          </div>
        </div>

        <ResponsiveAttendeesTable
          attendees={processedAttendees}
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
          isFullView={isFullView}
        />
      </div>
    </GroupRfidProvider>
  );
};