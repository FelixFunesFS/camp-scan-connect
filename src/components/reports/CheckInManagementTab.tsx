import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { FilterPanel } from "./shared/FilterPanel";
import { ExportButton } from "./shared/ExportButton";
import { ResponsiveAttendeesTable } from "./shared/ResponsiveAttendeesTable";
import { ColumnSelector } from "./shared/ColumnSelector";
import { supabase } from "@/integrations/supabase/client";
import { Search } from "lucide-react";

interface CheckInManagementTabProps {
  isRefreshing: boolean;
}

type SortField = 'name' | 'email' | 'phone' | 'regfox_id' | 'updated_at' | 'bar_hits' | 'arrival_day' | 'order_id' | 'ticket_type' | 'meal_plan' | 'registration_status' | 'rfid_status' | 'overall_status';
type SortDirection = 'asc' | 'desc';

export interface EnhancedAttendee {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  regfox_id: string;
  order_id?: string | null;
  ticket_type: string;
  meal_plan: string;
  waiver_signed: boolean;
  checked_in_at: string | null;
  arrival_window: string;
  notes: string;
  created_at: string;
  updated_at: string;
  registration_status: 'registered' | 'cancelled' | 'pending' | 'refunded' | 'waitlisted';
  // RFID related
  rfid_uid: string | null;
  rfid_status: 'unissued' | 'active' | 'lost' | 'replaced' | 'deactivated';
  // Calculated fields
  has_headphones: boolean;
  bar_hits: number;
  overall_status: 'complete' | 'RFID Assigned' | 'Checked In' | 'pending';
  arrival_day: string | null;
  is_duplicate: boolean;
  is_phone_duplicate: boolean;
}

interface ActiveFilter {
  key: string;
  value: string;
  label: string;
}

export interface TableColumn {
  key: keyof EnhancedAttendee;
  label: string;
  sortable?: boolean;
  mobile?: boolean;
  desktop?: boolean;
  width?: string;
}

export const CheckInManagementTab: React.FC<CheckInManagementTabProps> = ({ isRefreshing }) => {
  const [attendees, setAttendees] = useState<EnhancedAttendee[]>([]);
  const [filteredAttendees, setFilteredAttendees] = useState<EnhancedAttendee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilters, setActiveFilters] = useState<ActiveFilter[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<SortField>('updated_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [visibleColumns, setVisibleColumns] = useState<string[]>([
    'order_id', 'first_name', 'phone', 'ticket_type', 'meal_plan', 'registration_status', 'rfid_status', 'overall_status'
  ]);
  const itemsPerPage = 50;

  const allColumns: TableColumn[] = [
    { key: 'order_id', label: 'Order ID', desktop: true, width: 'min-w-24', sortable: true },
    { key: 'first_name', label: 'Name', mobile: true, desktop: true, width: 'min-w-32', sortable: true },
    { key: 'phone', label: 'Phone', desktop: true, width: 'min-w-32', sortable: true },
    { key: 'email', label: 'Email', desktop: true, width: 'min-w-48', sortable: true },
    { key: 'regfox_id', label: 'RegFox ID', desktop: true, width: 'min-w-24', sortable: true },
    { key: 'rfid_uid', label: 'RFID UID', desktop: true, width: 'min-w-24' },
    { key: 'ticket_type', label: 'Ticket Type', mobile: true, desktop: true, width: 'min-w-32', sortable: true },
    { key: 'meal_plan', label: 'Meal Plan', mobile: true, desktop: true, width: 'min-w-28', sortable: true },
    { key: 'registration_status', label: 'Registration Status', mobile: true, desktop: true, width: 'min-w-32', sortable: true },
    { key: 'rfid_status', label: 'RFID Status', mobile: true, desktop: true, width: 'min-w-28', sortable: true },
    { key: 'has_headphones', label: 'Has Headphones', desktop: true, width: 'min-w-32' },
    { key: 'bar_hits', label: 'Bar Hits', desktop: true, width: 'min-w-20', sortable: true },
    { key: 'waiver_signed', label: 'Waiver', mobile: true, desktop: true, width: 'min-w-20' },
    { key: 'arrival_day', label: 'Arrival Day', desktop: true, width: 'min-w-28', sortable: true },
    { key: 'is_duplicate', label: 'Duplicate Status', desktop: true, width: 'min-w-24' },
    { key: 'is_phone_duplicate', label: 'Phone Duplicate', desktop: true, width: 'min-w-24' },
    { key: 'notes', label: 'Notes', desktop: true, width: 'min-w-40' },
    { key: 'updated_at', label: 'Last Updated', desktop: true, width: 'min-w-32', sortable: true },
    { key: 'overall_status', label: 'Check-In Status', mobile: true, desktop: true, width: 'min-w-28', sortable: true }
  ];

  const fetchAttendees = async () => {
    try {
      setIsLoading(true);

      // Fetch attendees with RFID tags and transaction counts
      const { data: attendeesData, error: attendeesError } = await supabase
        .from('attendees')
        .select(`
          *,
          rfid_tags (
            uid,
            status
          )
        `)
        .order('updated_at', { ascending: false });

      if (attendeesError) throw attendeesError;

      // Fetch headphone transactions count for each attendee
      const { data: headphoneData, error: headphoneError } = await supabase
        .from('station_transactions')
        .select('attendee_id, transaction_type')
        .eq('station_type', 'headphones')
        .in('transaction_type', ['headphone_checkout', 'headphone_checkin']);

      if (headphoneError) throw headphoneError;

      // Fetch bar transaction counts
      const { data: barData, error: barError } = await supabase
        .from('station_transactions')
        .select('attendee_id, transaction_type')
        .eq('station_type', 'drinks');

      if (barError) throw barError;

      // Create name and phone key mappings for duplicate detection
      const nameGroups = new Map<string, number>();
      const phoneGroups = new Map<string, number>();
      
      (attendeesData || []).forEach(attendee => {
        const nameKey = `${attendee.first_name?.trim().toLowerCase()}-${attendee.last_name?.trim().toLowerCase()}`;
        nameGroups.set(nameKey, (nameGroups.get(nameKey) || 0) + 1);
        
        // Normalize phone number for comparison (remove spaces, dashes, parentheses)
        if (attendee.phone) {
          const phoneKey = attendee.phone.replace(/[\s\-\(\)]/g, '').toLowerCase();
          if (phoneKey.length > 0) {
            phoneGroups.set(phoneKey, (phoneGroups.get(phoneKey) || 0) + 1);
          }
        }
      });

      // Process the data
      const processedAttendees: EnhancedAttendee[] = (attendeesData || []).map(attendee => {
        const rfidTag = attendee.rfid_tags?.[0];
        
        // Calculate headphones status
        const headphoneTransactions = headphoneData.filter(t => t.attendee_id === attendee.id);
        const hasCheckout = headphoneTransactions.some(t => t.transaction_type === 'headphone_checkout');
        const hasCheckin = headphoneTransactions.some(t => t.transaction_type === 'headphone_checkin');
        const has_headphones = hasCheckout && !hasCheckin;

        // Calculate bar hits (drink transactions)
        const bar_hits = barData.filter(t => t.attendee_id === attendee.id && t.transaction_type === 'drink').length;

        // Determine overall status based on RFID workflow
        let overall_status: 'complete' | 'RFID Assigned' | 'Checked In' | 'pending' = 'pending';
        
        const hasRfidAssigned = rfidTag?.uid && rfidTag?.status !== 'unissued';
        const hasRfidActive = rfidTag?.status === 'active';
        const isCheckedIn = !!attendee.checked_in_at;
        
        if (hasRfidAssigned && hasRfidActive && isCheckedIn) {
          overall_status = 'complete';
        } else if (hasRfidAssigned && !hasRfidActive) {
          overall_status = 'RFID Assigned';
        } else if (isCheckedIn && !hasRfidActive) {
          overall_status = 'Checked In';
        }

        // Determine arrival day from arrival window or notes
        let arrival_day = null;
        if (attendee.arrival_window === 'early') {
          arrival_day = 'Thursday';
        } else if (attendee.arrival_window === 'standard') {
          arrival_day = 'Friday';
        }

        // Check if this attendee is a duplicate based on name
        const nameKey = `${attendee.first_name?.trim().toLowerCase()}-${attendee.last_name?.trim().toLowerCase()}`;
        const is_duplicate = (nameGroups.get(nameKey) || 0) > 1;
        
        // Check if this attendee is a duplicate based on phone
        let is_phone_duplicate = false;
        if (attendee.phone) {
          const phoneKey = attendee.phone.replace(/[\s\-\(\)]/g, '').toLowerCase();
          if (phoneKey.length > 0) {
            is_phone_duplicate = (phoneGroups.get(phoneKey) || 0) > 1;
          }
        }

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

  // Apply filters
  useEffect(() => {
    let filtered = attendees;

    // Apply search term
    if (searchTerm) {
      filtered = filtered.filter(attendee => 
        attendee.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        attendee.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        attendee.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        attendee.phone?.includes(searchTerm) ||
        attendee.regfox_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        attendee.rfid_uid?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply active filters
    activeFilters.forEach(filter => {
      switch (filter.key) {
        case 'overall_status':
          filtered = filtered.filter(a => a.overall_status === filter.value);
          break;
        case 'registration_status':
          filtered = filtered.filter(a => a.registration_status === filter.value);
          break;
        case 'rfid_status':
          filtered = filtered.filter(a => a.rfid_status === filter.value);
          break;
        case 'waiver_status':
          if (filter.value === 'signed') {
            filtered = filtered.filter(a => a.waiver_signed === true);
          } else if (filter.value === 'unsigned') {
            filtered = filtered.filter(a => a.waiver_signed !== true);
          }
          break;
        case 'ticket_type':
          filtered = filtered.filter(a => a.ticket_type === filter.value);
          break;
        case 'meal_plan':
          filtered = filtered.filter(a => a.meal_plan === filter.value);
          break;
        case 'has_headphones':
          filtered = filtered.filter(a => a.has_headphones === (filter.value === 'yes'));
          break;
        case 'arrival_window':
          filtered = filtered.filter(a => a.arrival_window === filter.value);
          break;
        case 'duplicates':
          if (filter.value === 'show_only') {
            filtered = filtered.filter(a => a.is_duplicate === true);
          } else if (filter.value === 'hide') {
            filtered = filtered.filter(a => a.is_duplicate === false);
          }
          break;
        case 'phone_duplicates':
          if (filter.value === 'show_only') {
            filtered = filtered.filter(a => a.is_phone_duplicate === true);
          } else if (filter.value === 'hide') {
            filtered = filtered.filter(a => a.is_phone_duplicate === false);
          }
          break;
      }
    });

    // Sort the filtered results
    const sortedFiltered = filtered.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortField) {
        case 'name':
          aValue = `${a.first_name} ${a.last_name}`.toLowerCase();
          bValue = `${b.first_name} ${b.last_name}`.toLowerCase();
          break;
        case 'email':
          aValue = a.email?.toLowerCase() || '';
          bValue = b.email?.toLowerCase() || '';
          break;
        case 'phone':
          aValue = a.phone || '';
          bValue = b.phone || '';
          break;
        case 'regfox_id':
          aValue = a.regfox_id || '';
          bValue = b.regfox_id || '';
          break;
        case 'updated_at':
          aValue = new Date(a.updated_at || 0).getTime();
          bValue = new Date(b.updated_at || 0).getTime();
          break;
        case 'bar_hits':
          aValue = a.bar_hits || 0;
          bValue = b.bar_hits || 0;
          break;
        case 'arrival_day':
          aValue = a.arrival_day || '';
          bValue = b.arrival_day || '';
          break;
        default:
          aValue = '';
          bValue = '';
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    setFilteredAttendees(sortedFiltered);
    setCurrentPage(1);
  }, [attendees, searchTerm, activeFilters, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const filterOptions = [
    {
      key: "overall_status",
      label: "Check-In Status",
      type: "select" as const,
      options: [
        { value: "complete", label: "Complete" },
        { value: "RFID Assigned", label: "RFID Assigned" },
        { value: "Checked In", label: "Checked In" },
        { value: "pending", label: "Pending" }
      ]
    },
    {
      key: "registration_status",
      label: "Registration Status",
      type: "select" as const,
      options: [
        { value: "registered", label: "Registered" },
        { value: "cancelled", label: "Cancelled" },
        { value: "pending", label: "Pending" },
        { value: "refunded", label: "Refunded" },
        { value: "waitlisted", label: "Waitlisted" }
      ]
    },
    {
      key: "rfid_status",
      label: "RFID Status",
      type: "select" as const,
      options: [
        { value: "active", label: "Active" },
        { value: "deactivated", label: "Deactivated" },
        { value: "lost", label: "Lost" },
        { value: "replaced", label: "Replaced" },
        { value: "unissued", label: "Unissued" }
      ]
    },
    {
      key: "waiver_status",
      label: "Waiver Status",
      type: "select" as const,
      options: [
        { value: "signed", label: "Signed" },
        { value: "unsigned", label: "Unsigned" }
      ]
    },
    {
      key: "ticket_type",
      label: "Ticket Type",
      type: "select" as const,
      options: [
        { value: "dry_site", label: "Dry Site" },
        { value: "premium_power", label: "Premium Power" },
        { value: "glamping", label: "Glamping" },
        { value: "cabin", label: "Cabin" },
        { value: "rv_site", label: "RV Site" },
        { value: "day_pass", label: "Day Pass" },
        { value: "staff", label: "Staff" },
        { value: "vendor", label: "Vendor" }
      ]
    },
    {
      key: "meal_plan",
      label: "Meal Plan",
      type: "select" as const,
      options: [
        { value: "Yes", label: "Yes" },
        { value: "No", label: "No" }
      ]
    },
    {
      key: "has_headphones",
      label: "Has Headphones",
      type: "select" as const,
      options: [
        { value: "yes", label: "Yes" },
        { value: "no", label: "No" }
      ]
    },
    {
      key: "arrival_window",
      label: "Arrival Window",
      type: "select" as const,
      options: [
        { value: "early", label: "Early Access" },
        { value: "standard", label: "Standard" }
      ]
    },
    {
      key: "duplicates",
      label: "Duplicate Names",
      type: "select" as const,
      options: [
        { value: "show_only", label: "Show Only Duplicates" },
        { value: "hide", label: "Hide Duplicates" }
      ]
    },
    {
      key: "phone_duplicates",
      label: "Duplicate Phone Numbers",
      type: "select" as const,
      options: [
        { value: "show_only", label: "Show Only Duplicates" },
        { value: "hide", label: "Hide Duplicates" }
      ]
    }
  ];

  const handleFilterChange = (key: string, value: string) => {
    if (!value) {
      handleClearFilter(key);
      return;
    }

    const label = filterOptions.find(f => f.key === key)?.options?.find(o => o.value === value)?.label || value;
    
    setActiveFilters(prev => [
      ...prev.filter(f => f.key !== key),
      { key, value, label: `${filterOptions.find(f => f.key === key)?.label}: ${label}` }
    ]);
  };

  const handleClearFilter = (key: string) => {
    setActiveFilters(prev => prev.filter(f => f.key !== key));
  };

  const handleClearAllFilters = () => {
    setActiveFilters([]);
    setSearchTerm("");
  };

  // Pagination
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedAttendees = filteredAttendees.slice(startIndex, endIndex);
  const totalPages = Math.ceil(filteredAttendees.length / itemsPerPage);

  const exportData = filteredAttendees.map(attendee => ({
    name: `${attendee.first_name} ${attendee.last_name}`,
    phone: attendee.phone,
    email: attendee.email,
    regfoxId: attendee.regfox_id,
    rfidUid: attendee.rfid_uid || '',
    status: attendee.overall_status,
    ticketType: attendee.ticket_type,
    mealPlan: attendee.meal_plan,
    hasHeadphones: attendee.has_headphones ? 'Yes' : 'No',
    barHits: attendee.bar_hits,
    waiverSigned: attendee.waiver_signed ? 'Yes' : 'No',
    arrivalDay: attendee.arrival_day || '',
    notes: attendee.notes,
    lastUpdated: new Date(attendee.updated_at).toLocaleDateString()
  }));

  return (
    <div className="space-y-6" data-export-target>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-primary">Check-In Management</h2>
          <p className="text-muted-foreground">
            {filteredAttendees.length.toLocaleString()} of {attendees.length.toLocaleString()} attendees
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <ColumnSelector
            columns={allColumns}
            visibleColumns={visibleColumns}
            onVisibleColumnsChange={setVisibleColumns}
          />
          <ExportButton 
            data={exportData}
            filename="checkin-management"
            title="Check-In Management Report"
          />
        </div>
      </div>

      {/* Search and Filters */}
      <div className="space-y-4">
        <Card className="border-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Search Attendees</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search by name, email, phone, RegFox ID, or RFID UID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        <FilterPanel
          filters={filterOptions}
          activeFilters={activeFilters}
          onFilterChange={handleFilterChange}
          onClearFilter={handleClearFilter}
          onClearAll={handleClearAllFilters}
        />
      </div>

      {/* Results Table */}
      <ResponsiveAttendeesTable
        attendees={paginatedAttendees}
        columns={allColumns}
        visibleColumns={visibleColumns}
        isLoading={isLoading}
        currentPage={currentPage}
        totalPages={totalPages}
        startIndex={startIndex}
        endIndex={endIndex}
        totalCount={filteredAttendees.length}
        onPageChange={setCurrentPage}
        sortField={sortField}
        sortDirection={sortDirection}
        onSort={handleSort}
      />
    </div>
  );
};