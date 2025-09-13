import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { FilterPanel } from "./shared/FilterPanel";
import { ExportButton } from "./shared/ExportButton";
import { supabase } from "@/integrations/supabase/client";
import { 
  Search, 
  UserCheck, 
  UserX, 
  FileText, 
  AlertCircle,
  CheckCircle,
  Clock
} from "lucide-react";

interface CheckInManagementTabProps {
  isRefreshing: boolean;
}

interface Attendee {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  ticket_type: string;
  waiver_signed: boolean;
  checked_in_at: string | null;
  arrival_window: string;
  created_at: string;
}

interface ActiveFilter {
  key: string;
  value: string;
  label: string;
}

export const CheckInManagementTab: React.FC<CheckInManagementTabProps> = ({ isRefreshing }) => {
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [filteredAttendees, setFilteredAttendees] = useState<Attendee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilters, setActiveFilters] = useState<ActiveFilter[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  const fetchAttendees = async () => {
    try {
      setIsLoading(true);

      const { data, error } = await supabase
        .from('attendees')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Add default values for missing fields
      const processedAttendees = (data || []).map(attendee => ({
        ...attendee,
        waiver_signed: attendee.waiver_signed ?? false,
        checked_in_at: attendee.checked_in_at ?? null
      }));

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
        attendee.phone?.includes(searchTerm)
      );
    }

    // Apply active filters
    activeFilters.forEach(filter => {
      switch (filter.key) {
        case 'rfid_status':
          if (filter.value === 'active') {
            filtered = filtered.filter(a => a.checked_in_at !== null);
          } else if (filter.value === 'inactive') {
            filtered = filtered.filter(a => a.checked_in_at === null);
          }
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
        case 'arrival_window':
          filtered = filtered.filter(a => a.arrival_window === filter.value);
          break;
      }
    });

    setFilteredAttendees(filtered);
    setCurrentPage(1);
  }, [attendees, searchTerm, activeFilters]);

  const filterOptions = [
    {
      key: "rfid_status",
      label: "RFID Status",
      type: "select" as const,
      options: [
        { value: "active", label: "Active" },
        { value: "inactive", label: "Inactive" }
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
        { value: "day_pass", label: "Day Pass" },
        { value: "staff", label: "Staff" },
        { value: "vendor", label: "Vendor" }
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

  const getRfidStatus = (checkedInAt: string | null) => {
    return checkedInAt ? 'Active' : 'Inactive';
  };

  const getRfidStatusColor = (checkedInAt: string | null) => {
    return checkedInAt 
      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
  };

  const getWaiverStatusColor = (signed?: boolean) => {
    return signed 
      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
  };

  const exportData = filteredAttendees.map(attendee => ({
    name: `${attendee.first_name} ${attendee.last_name}`,
    email: attendee.email || '',
    phone: attendee.phone || '',
    ticketType: attendee.ticket_type,
    rfidStatus: getRfidStatus(attendee.checked_in_at),
    waiverStatus: attendee.waiver_signed === true ? 'Signed' : 'Unsigned',
    arrivalWindow: attendee.arrival_window,
    checkedInAt: attendee.checked_in_at || 'Not checked in'
  }));

  return (
    <div className="space-y-6" data-export-target>
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-primary">Check-In Management</h2>
          <p className="text-muted-foreground">
            {filteredAttendees.length.toLocaleString()} of {attendees.length.toLocaleString()} attendees
          </p>
        </div>
        <ExportButton 
          data={exportData}
          filename="checkin-management"
          title="Check-In Management Report"
        />
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
                placeholder="Search by name, email, or phone..."
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
      <Card className="border-primary/20">
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
                      <th className="text-left p-3 text-primary">Name</th>
                      <th className="text-left p-3 text-primary">Contact</th>
                      <th className="text-center p-3 text-primary">Ticket Type</th>
                      <th className="text-center p-3 text-primary">RFID Status</th>
                      <th className="text-center p-3 text-primary">Waiver</th>
                      <th className="text-center p-3 text-primary">Arrival</th>
                      <th className="text-center p-3 text-primary">Check-In Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedAttendees.map((attendee) => (
                      <tr key={attendee.id} className="border-b hover:bg-muted/50">
                        <td className="p-3">
                          <div className="font-medium">{attendee.first_name} {attendee.last_name}</div>
                        </td>
                        <td className="p-3">
                          <div className="text-xs text-muted-foreground space-y-1">
                            {attendee.email && <div>{attendee.email}</div>}
                            {attendee.phone && <div>{attendee.phone}</div>}
                          </div>
                        </td>
                        <td className="text-center p-3">
                          <Badge variant="outline">
                            {attendee.ticket_type.replace(/_/g, ' ').toUpperCase()}
                          </Badge>
                        </td>
                        <td className="text-center p-3">
                          <Badge className={getRfidStatusColor(attendee.checked_in_at)}>
                            {attendee.checked_in_at ? (
                              <CheckCircle className="h-3 w-3 mr-1" />
                            ) : (
                              <UserX className="h-3 w-3 mr-1" />
                            )}
                            {getRfidStatus(attendee.checked_in_at)}
                          </Badge>
                        </td>
                        <td className="text-center p-3">
                          <Badge className={getWaiverStatusColor(attendee.waiver_signed)}>
                            {attendee.waiver_signed === true ? (
                              <FileText className="h-3 w-3 mr-1" />
                            ) : (
                              <AlertCircle className="h-3 w-3 mr-1" />
                            )}
                            {attendee.waiver_signed === true ? 'Signed' : 'Unsigned'}
                          </Badge>
                        </td>
                        <td className="text-center p-3">
                          <Badge variant="outline">
                            {attendee.arrival_window === 'early' ? 'Early' : 'Standard'}
                          </Badge>
                        </td>
                        <td className="text-center p-3">
                          {attendee.checked_in_at ? (
                            <div className="text-xs text-muted-foreground">
                              {new Date(attendee.checked_in_at).toLocaleDateString()}<br />
                              {new Date(attendee.checked_in_at).toLocaleTimeString()}
                            </div>
                          ) : (
                            <Badge variant="secondary">
                              <Clock className="h-3 w-3 mr-1" />
                              Pending
                            </Badge>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-between items-center mt-4 pt-4 border-t">
                  <div className="text-sm text-muted-foreground">
                    Showing {startIndex + 1}-{Math.min(endIndex, filteredAttendees.length)} of {filteredAttendees.length}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
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
                            onClick={() => setCurrentPage(page)}
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
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
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
    </div>
  );
};