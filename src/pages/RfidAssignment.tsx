import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { RfidCaptureProvider } from '@/contexts/RfidCaptureContext';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { 
  Search, 
  X,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Zap,
  Users,
  CheckCircle,
  AlertTriangle,
  Key,
  Timer,
  Wifi,
  WifiOff,
  HelpCircle
} from "lucide-react";
import { EnhancedRfidAssignmentCell } from "@/components/EnhancedRfidAssignmentCell";
import { AttendeeDetailModal } from "@/components/AttendeeDetailModal";
import { GroupRfidView } from "@/components/GroupRfidView";
import { RfidAssignmentFAQ } from "@/components/RfidAssignmentFAQ";
import { formatPhoneNumber } from "@/lib/phoneUtils";
import { useCsvExport } from "@/hooks/useCsvExport";
import { 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown,
  Download,
  Filter
} from "lucide-react";

export interface AttendeeData {
  id: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  order_id?: string;
  ticket_type: string;
  meal_plan?: string;
  arrival_window?: string;
  arrival_day?: string; // Computed from arrival_window
  formatted_meal_plan?: string; // Computed display value
  rfid_uid?: string;
  rfid_status?: string;
  registration_status?: string;
  created_at: string;
  // Additional fields for enhanced functionality
  waiver_signed?: boolean;
  activated_at?: string;
  order_companions?: AttendeeData[]; // Linked attendees
  group_assignment_progress?: { assigned: number; total: number; percentage: number };
}

const ROWS_PER_PAGE = 50;

export const RfidAssignment = () => {
  const [attendees, setAttendees] = useState<AttendeeData[]>([]);
  const [filteredAttendees, setFilteredAttendees] = useState<AttendeeData[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [mode, setMode] = useState<'pre-event' | 'day-of'>('pre-event');
  const [viewMode, setViewMode] = useState<'individual' | 'group'>('individual');
  const [autoAdvanceEnabled, setAutoAdvanceEnabled] = useState(true);
  const [showOnlyUnassigned, setShowOnlyUnassigned] = useState(false);
  const [showCancelledRegistrants, setShowCancelledRegistrants] = useState(false);
  const [currentFocusRow, setCurrentFocusRow] = useState(0);
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [lastInteraction, setLastInteraction] = useState<'data-load' | 'search' | 'filter' | 'rfid-assignment'>('data-load');
  const [activeSyncId, setActiveSyncId] = useState<string | null>(null);
  const [realtimeDisabled, setRealtimeDisabled] = useState(false);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [sortField, setSortField] = useState<'name' | 'phone' | 'order' | 'meal_plan' | 'arrival_day' | 'ticket_type' | 'status'>('arrival_day');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [mealPlanFilter, setMealPlanFilter] = useState<string>('all');
  const [arrivalDayFilter, setArrivalDayFilter] = useState<string>('all');
  const [showFAQ, setShowFAQ] = useState(false);
  const [hasRfidInputFocused, setHasRfidInputFocused] = useState(false);
  
  const { exportToCsv } = useCsvExport();

  // Progress calculations
  const totalCount = attendees.length;
  const assignedCount = attendees.filter(a => a.rfid_uid && a.rfid_status === 'assigned').length;
  const unassignedCount = totalCount - assignedCount;
  const progressPercent = totalCount > 0 ? (assignedCount / totalCount) * 100 : 0;

  // Load attendees data optimized for assignment workflow
  const loadAttendees = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('attendees')
        .select(`
          id,
          first_name,
          last_name,
          email,
          phone,
          order_id,
          ticket_type,
          meal_plan,
          arrival_window,
          registration_status,
          waiver_signed,
          activated_at,
          created_at,
          rfid_tags(uid, status, activated_at)
        `)
        .order('arrival_window', { ascending: true }) // Default: Thursday before Friday
        .order('order_id', { ascending: true }); // Secondary sort by order ID

      // Filter registration status based on toggle
      if (showCancelledRegistrants) {
        query = query.eq('registration_status', 'cancelled');
      } else {
        // Only show registered and pending - exclude cancelled and waitlisted
        query = query.in('registration_status', ['registered', 'pending']);
      }

      if (mode === 'day-of') {
        // Day-of mode: prioritize recent registrants
        query = query.order('created_at', { ascending: false });
      }

      const { data, error } = await query;
      if (error) throw error;

      const processedAttendees: AttendeeData[] = data.map(attendee => {
        const rfidTag = (attendee.rfid_tags as any)?.[0];
        
        // Map arrival window to readable day
        const arrivalDay = (attendee as any).arrival_window === 'early' ? 'Thursday' : 'Friday';
        
        // Format meal plan for display
        const formattedMealPlan = (attendee as any).meal_plan === '1' ? 'Plan 1' : 
                                 (attendee as any).meal_plan === '2' ? 'Plan 2' : 'No Plan';
        
        // Determine overall status
        const overallStatus = (attendee as any).activated_at && rfidTag?.activated_at ? 'activated' :
                             rfidTag?.uid ? 'assigned' : 'unassigned';
        
        return {
          id: attendee.id,
          first_name: attendee.first_name,
          last_name: attendee.last_name,
          email: attendee.email,
          phone: attendee.phone,
          order_id: attendee.order_id,
          ticket_type: attendee.ticket_type,
          meal_plan: (attendee as any).meal_plan,
          arrival_window: (attendee as any).arrival_window,
          arrival_day: arrivalDay,
          formatted_meal_plan: formattedMealPlan,
          waiver_signed: (attendee as any).waiver_signed,
          activated_at: (attendee as any).activated_at,
          created_at: attendee.created_at,
          registration_status: (attendee as any).registration_status,
          rfid_uid: rfidTag?.uid || null,
          rfid_status: rfidTag?.status || 'unissued',
        };
      });

      setAttendees(processedAttendees);
    } catch (error) {
      console.error('Error loading attendees:', error);
      toast.error("Failed to load attendee data");
    } finally {
      setLoading(false);
    }
  }, [mode, showCancelledRegistrants, toast]);

  // Optimistic update function to immediately update local state
  const handleOptimisticUpdate = useCallback((attendeeId: string, rfidUid: string | null, rfidStatus: string) => {
    setAttendees(prev => prev.map(attendee => 
      attendee.id === attendeeId 
        ? { ...attendee, rfid_uid: rfidUid, rfid_status: rfidStatus }
        : attendee
    ));
  }, []);

  // Debounced version of loadAttendees to prevent excessive reloads
  const debouncedLoadAttendees = useCallback(() => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    
    debounceTimeoutRef.current = setTimeout(() => {
      if (!realtimeDisabled) {
        console.log('Debounced reload triggered');
        loadAttendees();
      }
    }, 1000); // Increased debounce to 1 second
  }, [loadAttendees, realtimeDisabled]);

  // Check for active syncs to control real-time subscriptions
  const checkActiveSyncs = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('regfox_sync_log')
        .select('id, status, cancelled_at')
        .eq('status', 'in_progress')
        .is('cancelled_at', null)
        .limit(1);
      
      if (error) throw error;
      
      const activeSync = data?.[0];
      const hasActiveSync = !!activeSync;
      
      setActiveSyncId(hasActiveSync ? activeSync.id : null);
      
      // Disable real-time updates during active sync
      if (hasActiveSync && !realtimeDisabled) {
        console.log('Sync detected, disabling real-time updates');
        setRealtimeDisabled(true);
        toast.info("Sync in Progress - Real-time updates paused during sync");
      } else if (!hasActiveSync && realtimeDisabled) {
        console.log('Sync completed, re-enabling real-time updates');
        setRealtimeDisabled(false);
        // Trigger a single refresh after sync completes
        loadAttendees();
        toast.success("Sync Complete - Real-time updates resumed");
      }
    } catch (error) {
      console.error('Error checking active syncs:', error);
    }
  }, [realtimeDisabled, loadAttendees, toast]);

  // RegFox sync functionality
  const handleRegFoxSync = useCallback(async () => {
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('regfox-sync');
      
      if (error) {
        throw error;
      }

      if (data?.success === false) {
        const isError = data.code !== 'SYNC_IN_PROGRESS';
        if (isError) {
          toast.error(`Sync Warning: ${data.error || "RegFox sync completed with warnings"}`);
        } else {
          toast.warning(`Sync Warning: ${data.error || "RegFox sync completed with warnings"}`);
        }
        return;
      }

      toast.success(`RegFox Sync Complete - Updated ${data?.updatedRecords || 0} attendees, added ${data?.newRecords || 0} new registrations`);

      // Let real-time subscription handle the refresh when sync completes
      
    } catch (error) {
      console.error('RegFox sync error:', error);
      toast.error("Sync Failed - Failed to sync RegFox data. Please try again.");
    } finally {
      setSyncing(false);
    }
  }, [toast]);

  // Enhanced filtering with search, assignment status, meal plan, and arrival day
  useEffect(() => {
    let filtered = attendees;
    
    // Track that this is a filter/search operation
    setLastInteraction('search');

    // Filter registration status based on toggle
    if (showCancelledRegistrants) {
      filtered = filtered.filter(a => a.registration_status === 'cancelled');
    } else {
      // Only show registered and pending - exclude cancelled and waitlisted
      filtered = filtered.filter(a => ['registered', 'pending'].includes(a.registration_status || 'registered'));
    }

    // Filter by assignment status
    if (showOnlyUnassigned) {
      filtered = filtered.filter(a => !a.rfid_uid || a.rfid_status !== 'assigned');
    }

    // Filter by meal plan
    if (mealPlanFilter !== 'all') {
      if (mealPlanFilter === 'none') {
        filtered = filtered.filter(a => !a.meal_plan);
      } else {
        filtered = filtered.filter(a => a.meal_plan === mealPlanFilter);
      }
    }

    // Filter by arrival day
    if (arrivalDayFilter !== 'all') {
      filtered = filtered.filter(a => a.arrival_window === arrivalDayFilter);
    }

    // Enhanced search with companion inclusion
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      const matchingOrderIds = new Set<string>();
      
      // Find all attendees that directly match the search
      const directMatches = attendees.filter(attendee => {
        const matches = 
          `${attendee.first_name} ${attendee.last_name}`.toLowerCase().includes(term) ||
          (attendee.order_id && attendee.order_id.toLowerCase().includes(term)) ||
          (attendee.phone && attendee.phone.toLowerCase().includes(term)) ||
          (attendee.email && attendee.email.toLowerCase().includes(term));
        
        if (matches && attendee.order_id) {
          matchingOrderIds.add(attendee.order_id);
        }
        
        return matches;
      });
      
      // Include companions from matching order IDs
      filtered = attendees.filter(attendee => 
        directMatches.includes(attendee) || 
        (attendee.order_id && matchingOrderIds.has(attendee.order_id))
      );
      
      // Apply registration status filter to the companion-inclusive results
      if (showCancelledRegistrants) {
        filtered = filtered.filter(a => a.registration_status === 'cancelled');
      } else {
        // Only show registered and pending - exclude cancelled and waitlisted
        filtered = filtered.filter(a => ['registered', 'pending'].includes(a.registration_status || 'registered'));
      }
      if (showOnlyUnassigned) {
        filtered = filtered.filter(a => !a.rfid_uid || a.rfid_status !== 'assigned');
      }
      if (mealPlanFilter !== 'all') {
        if (mealPlanFilter === 'none') {
          filtered = filtered.filter(a => !a.meal_plan);
        } else {
          filtered = filtered.filter(a => a.meal_plan === mealPlanFilter);
        }
      }
      if (arrivalDayFilter !== 'all') {
        filtered = filtered.filter(a => a.arrival_window === arrivalDayFilter);
      }
    }

    setFilteredAttendees(filtered);
    setCurrentPage(1); // Reset to first page on filter change
  }, [attendees, searchTerm, showOnlyUnassigned, mealPlanFilter, arrivalDayFilter]);

  // Sorting and pagination
  const sortedAndPaginatedAttendees = useMemo(() => {
    // Sort attendees
    const sorted = [...filteredAttendees].sort((a, b) => {
      let aValue: string, bValue: string;
      
      switch (sortField) {
        case 'name':
          aValue = `${a.first_name} ${a.last_name}`.toLowerCase();
          bValue = `${b.first_name} ${b.last_name}`.toLowerCase();
          break;
        case 'phone':
          aValue = a.phone?.toLowerCase() || 'zzz-no-phone';
          bValue = b.phone?.toLowerCase() || 'zzz-no-phone';
          break;
        case 'order':
          aValue = a.order_id?.toLowerCase() || 'zzz-no-order';
          bValue = b.order_id?.toLowerCase() || 'zzz-no-order';
          break;
        case 'meal_plan':
          aValue = a.formatted_meal_plan?.toLowerCase() || 'zzz-no-plan';
          bValue = b.formatted_meal_plan?.toLowerCase() || 'zzz-no-plan';
          break;
        case 'arrival_day':
          // Convert to chronological values: Thursday (early) = 0, Friday (standard) = 1
          const aArrivalValue = a.arrival_day === 'Thursday' ? 0 : 1;
          const bArrivalValue = b.arrival_day === 'Thursday' ? 0 : 1;
          const result = aArrivalValue - bArrivalValue;
          
          // Secondary sort by order_id when arrival days are equal
          if (result === 0) {
            const aOrderId = a.order_id?.toLowerCase() || 'zzz-no-order';
            const bOrderId = b.order_id?.toLowerCase() || 'zzz-no-order';
            const secondaryResult = aOrderId.localeCompare(bOrderId);
            return sortDirection === 'asc' ? secondaryResult : -secondaryResult;
          }
          
          return sortDirection === 'asc' ? result : -result;
        case 'ticket_type':
          aValue = a.ticket_type.toLowerCase();
          bValue = b.ticket_type.toLowerCase();
          break;
        case 'status':
          aValue = a.rfid_uid && a.rfid_status === 'assigned' ? 'assigned' : 'unassigned';
          bValue = b.rfid_uid && b.rfid_status === 'assigned' ? 'assigned' : 'unassigned';
          break;
        default:
          return 0;
      }
      
      const result = aValue.localeCompare(bValue);
      
      // Secondary sort by order_id when primary values are equal
      if (result === 0) {
        const aOrderId = a.order_id?.toLowerCase() || 'zzz-no-order';
        const bOrderId = b.order_id?.toLowerCase() || 'zzz-no-order';
        const secondaryResult = aOrderId.localeCompare(bOrderId);
        return sortDirection === 'asc' ? secondaryResult : -secondaryResult;
      }
      
      const finalResult = sortDirection === 'asc' ? result : -result;
      return finalResult;
    });

    // Apply pagination
    const startIndex = (currentPage - 1) * ROWS_PER_PAGE;
    return sorted.slice(startIndex, startIndex + ROWS_PER_PAGE);
  }, [filteredAttendees, currentPage, sortField, sortDirection]);

  const totalPages = Math.ceil(filteredAttendees.length / ROWS_PER_PAGE);

  // RFID input focus tracking for dynamic provider control
  useEffect(() => {
    const handleFocusIn = (event: FocusEvent) => {
      const target = event.target as HTMLElement;
      if (target?.getAttribute('data-rfid-input') === 'true') {
        setHasRfidInputFocused(true);
      }
    };

    const handleFocusOut = (event: FocusEvent) => {
      const target = event.target as HTMLElement;
      if (target?.getAttribute('data-rfid-input') === 'true') {
        // Small delay to handle rapid focus changes
        setTimeout(() => {
          const currentFocus = document.activeElement as HTMLElement;
          if (!currentFocus || currentFocus.getAttribute('data-rfid-input') !== 'true') {
            setHasRfidInputFocused(false);
          }
        }, 10);
      }
    };

    document.addEventListener('focusin', handleFocusIn);
    document.addEventListener('focusout', handleFocusOut);
    
    return () => {
      document.removeEventListener('focusin', handleFocusIn);
      document.removeEventListener('focusout', handleFocusOut);
    };
  }, []);

  // Sorting handler
  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Sort icon helper
  const getSortIcon = (field: typeof sortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-4 w-4" />;
    }
    return sortDirection === 'asc' ? 
      <ArrowUp className="h-4 w-4" /> : 
      <ArrowDown className="h-4 w-4" />;
  };

  // CSV export handler
  const handleCsvExport = () => {
    const exportData = showOnlyUnassigned 
      ? filteredAttendees.filter(a => !a.rfid_uid || a.rfid_status !== 'assigned')
      : filteredAttendees;
    
    const filename = `rfid-assignment-${mode}-${showOnlyUnassigned ? 'unassigned-only' : 'all'}`;
    exportToCsv(exportData, filename);
    
    toast.success(`Export Complete - Exported ${exportData.length} attendee records to CSV`);
  };

  // Auto-focus first unassigned row
  const focusFirstUnassigned = useCallback(() => {
    setTimeout(() => {
      const firstInput = document.querySelector('input[data-rfid-input="true"]:not([value])') as HTMLInputElement;
      if (firstInput) {
        firstInput.focus();
        firstInput.select();
        // Scroll row into view
        firstInput.closest('tr')?.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center' 
        });
      }
    }, 200);
  }, []);

  // Keyboard shortcuts optimized for assignment workflow
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key.toLowerCase()) {
          case 'g':
            e.preventDefault();
            focusFirstUnassigned();
            break;
          case ' ':
            e.preventDefault();
            setAutoAdvanceEnabled(prev => !prev);
            toast.info(`Auto-advance ${autoAdvanceEnabled ? "disabled" : "enabled"}`);
            break;
          case 'r':
            e.preventDefault();
            handleRegFoxSync();
            break;
        }
      } else if (e.key === 'F1') {
        e.preventDefault();
        // Show help overlay (could be implemented later)
        toast.info("Keyboard Shortcuts: Ctrl+G: Focus first unassigned • Ctrl+Space: Toggle auto-advance • Ctrl+R: Sync RegFox");
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [focusFirstUnassigned, autoAdvanceEnabled, loadAttendees, toast]);

  // Monitor sync status to control real-time updates
  useEffect(() => {
    checkActiveSyncs();
    
    // Set up periodic check for sync status
    const syncCheckInterval = setInterval(checkActiveSyncs, 3000); // Check every 3 seconds
    
    return () => {
      clearInterval(syncCheckInterval);
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [checkActiveSyncs]);

  // Real-time subscriptions for live updates (only when not disabled)
  useEffect(() => {
    // Only subscribe to real-time updates when NOT showing cancelled registrants AND not disabled
    if (showCancelledRegistrants || realtimeDisabled) {
      setIsRealtimeConnected(false);
      return;
    }

    console.log('Setting up real-time subscriptions...');
    
    const channel = supabase
      .channel('attendee-rfid-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'attendees'
      }, (payload) => {
        console.log('Attendee change detected:', payload);
        // Use debounced reload to prevent excessive updates
        debouncedLoadAttendees();
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public', 
        table: 'rfid_tags'
      }, (payload) => {
        console.log('RFID tag change detected:', payload);
        // Use debounced reload to prevent excessive updates
        debouncedLoadAttendees();
      })
      .subscribe((status) => {
        console.log('Real-time subscription status:', status);
        setIsRealtimeConnected(status === 'SUBSCRIBED');
        
        if (status === 'SUBSCRIBED' && !realtimeDisabled) {
          toast.success("Live Updates Enabled - Assignment table will update automatically");
        } else if (status === 'CLOSED') {
          setIsRealtimeConnected(false);
          toast.error("Live Updates Disconnected - Real-time updates are not available");
        }
      });

    return () => {
      console.log('Cleaning up real-time subscriptions');
      supabase.removeChannel(channel);
      setIsRealtimeConnected(false);
    };
  }, [debouncedLoadAttendees, toast, showCancelledRegistrants, realtimeDisabled]);

  // Load data on mount and when mode changes
  useEffect(() => {
    setLastInteraction('data-load');
    loadAttendees();
  }, [loadAttendees]);

  // Safe auto-focus: only on data load, not during search/filter operations
  useEffect(() => {
    if (sortedAndPaginatedAttendees.length > 0 && !loading && !isSearching && lastInteraction === 'data-load') {
      focusFirstUnassigned();
    }
  }, [sortedAndPaginatedAttendees, loading, focusFirstUnassigned, isSearching, lastInteraction]);

  const handleAssignmentComplete = useCallback(() => {
    setLastInteraction('rfid-assignment');
    debouncedLoadAttendees(); // Use debounced refresh after assignment
  }, [debouncedLoadAttendees]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto p-6">
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <RfidCaptureProvider enabled={hasRfidInputFocused}>
      <div className="min-h-screen bg-background">
        {/* FAQ Panel */}
        <RfidAssignmentFAQ isOpen={showFAQ} onClose={() => setShowFAQ(false)} />
        
        <div className="container mx-auto p-6 max-w-7xl">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFAQ(true)}
                className="flex items-center gap-2"
              >
                <HelpCircle className="h-4 w-4" />
                Help
              </Button>
              <div>
                <h1 className="text-3xl font-bold text-foreground">RFID Assignment Station</h1>
                <p className="text-muted-foreground mt-1">
                  Assign RFID tags to attendees using USB scanner
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Select value={mode} onValueChange={(value) => setMode(value as 'pre-event' | 'day-of')}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pre-event">Pre-Event</SelectItem>
                  <SelectItem value="day-of">Day-Of</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex items-center gap-2">
                {!showCancelledRegistrants && (
                  <>
                    {isRealtimeConnected ? (
                      <Badge variant="secondary" className="text-xs">
                        <Wifi className="h-3 w-3 mr-1" />
                        Live
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs">
                        <WifiOff className="h-3 w-3 mr-1" />
                        Offline
                      </Badge>
                    )}
                  </>
                )}
                <Button 
                  variant="outline" 
                  onClick={handleRegFoxSync}
                  disabled={syncing}
                  className="flex items-center gap-2"
                  title="Sync latest registrations from RegFox"
                >
                  <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
                  {syncing ? 'Syncing...' : 'Sync RegFox Data'}
                </Button>
              </div>
            </div>
          </div>

          {/* Progress Overview */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-foreground">{totalCount}</div>
                <p className="text-xs text-muted-foreground">Total Attendees</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-warning">{unassignedCount}</div>
                <p className="text-xs text-muted-foreground">Unassigned</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-success">{assignedCount}</div>
                <p className="text-xs text-muted-foreground">Assigned</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-primary">{Math.round(progressPercent)}%</div>
                <p className="text-xs text-muted-foreground">Progress</p>
                <Progress value={progressPercent} className="mt-2 h-2" />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-muted-foreground">{filteredAttendees.length}</div>
                <p className="text-xs text-muted-foreground">Filtered Results</p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-col gap-4 mb-6">
          {/* Search and View Mode */}
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search names, phones, emails, or order IDs (includes companions)"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onFocus={() => setIsSearching(true)}
                onBlur={() => setTimeout(() => setIsSearching(false), 200)}
                className={`pl-10 ${searchTerm ? 'pr-10' : ''}`}
                data-search-input="true"
                data-exclude-rfid="true"
              />
              {searchTerm && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 hover:bg-transparent"
                  onClick={() => setSearchTerm('')}
                  aria-label="Clear search"
                >
                  <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                </Button>
              )}
            </div>
            
            <div className="flex items-center gap-4">
              <Select value={viewMode} onValueChange={(value) => setViewMode(value as 'individual' | 'group')}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="individual">Individual</SelectItem>
                  <SelectItem value="group">Group</SelectItem>
                </SelectContent>
              </Select>
              
              <Button 
                variant="outline" 
                onClick={handleCsvExport}
                className="flex items-center gap-2"
                title="Export current view to CSV"
              >
                <Download className="h-4 w-4" />
                Export CSV
              </Button>
            </div>
          </div>

          {/* Filters and Toggles */}
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Filters:</span>
              </div>
              
              <Select value={mealPlanFilter} onValueChange={setMealPlanFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Meal Plan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Plans</SelectItem>
                  <SelectItem value="none">No Plan</SelectItem>
                  <SelectItem value="1">Plan 1</SelectItem>
                  <SelectItem value="2">Plan 2</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={arrivalDayFilter} onValueChange={setArrivalDayFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Arrival Day" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Days</SelectItem>
                  <SelectItem value="early">Thursday</SelectItem>
                  <SelectItem value="standard">Friday</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-6">
              <div className="flex items-center space-x-2">
                <Switch
                  id="unassigned-only"
                  checked={showOnlyUnassigned}
                  onCheckedChange={setShowOnlyUnassigned}
                />
                <Label htmlFor="unassigned-only" className="text-sm">
                  Unassigned only
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="show-cancelled"
                  checked={showCancelledRegistrants}
                  onCheckedChange={setShowCancelledRegistrants}
                />
                <Label htmlFor="show-cancelled" className="text-sm">
                  Cancelled registrations
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="auto-advance"
                  checked={autoAdvanceEnabled}
                  onCheckedChange={setAutoAdvanceEnabled}
                />
                <Label htmlFor="auto-advance" className="text-sm flex items-center gap-1">
                  <Zap className="h-3 w-3" />
                  Auto-advance
                </Label>
              </div>
            </div>
          </div>
        </div>

          {viewMode === 'individual' ? (
            <div className="space-y-6">
              {/* Assignment Table */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Key className="h-5 w-5" />
                      Assignment Table
                      {mode === 'day-of' && (
                        <Badge variant="secondary" className="ml-2">
                          <Timer className="h-3 w-3 mr-1" />
                          Day-Of Mode
                        </Badge>
                      )}
                    </CardTitle>
                    <div className="text-sm text-muted-foreground">
                      Page {currentPage} of {totalPages} • {filteredAttendees.length} filtered • {attendees.length} total
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>
                      <Button
                        variant="ghost"
                        className="h-auto p-0 font-semibold hover:bg-transparent"
                        onClick={() => handleSort('name')}
                      >
                        <div className="flex items-center gap-2">
                          Name
                          {getSortIcon('name')}
                        </div>
                      </Button>
                    </TableHead>
                    <TableHead>
                      <Button
                        variant="ghost"
                        className="h-auto p-0 font-semibold hover:bg-transparent"
                        onClick={() => handleSort('phone')}
                      >
                        <div className="flex items-center gap-2">
                          Phone
                          {getSortIcon('phone')}
                        </div>
                      </Button>
                    </TableHead>
                    <TableHead>
                      <Button
                        variant="ghost"
                        className="h-auto p-0 font-semibold hover:bg-transparent"
                        onClick={() => handleSort('order')}
                      >
                        <div className="flex items-center gap-2">
                          Order ID
                          {getSortIcon('order')}
                        </div>
                      </Button>
                    </TableHead>
                    <TableHead>
                      <Button
                        variant="ghost"
                        className="h-auto p-0 font-semibold hover:bg-transparent"
                        onClick={() => handleSort('meal_plan')}
                      >
                        <div className="flex items-center gap-2">
                          Meal Plan
                          {getSortIcon('meal_plan')}
                        </div>
                      </Button>
                    </TableHead>
                    <TableHead>
                      <Button
                        variant="ghost"
                        className="h-auto p-0 font-semibold hover:bg-transparent"
                        onClick={() => handleSort('arrival_day')}
                      >
                        <div className="flex items-center gap-2">
                          Arrival Day
                          {getSortIcon('arrival_day')}
                        </div>
                      </Button>
                    </TableHead>
                    <TableHead>
                      <Button
                        variant="ghost"
                        className="h-auto p-0 font-semibold hover:bg-transparent"
                        onClick={() => handleSort('ticket_type')}
                      >
                        <div className="flex items-center gap-2">
                          Ticket Type
                          {getSortIcon('ticket_type')}
                        </div>
                      </Button>
                    </TableHead>
                    <TableHead className="w-64">RFID Assignment</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedAndPaginatedAttendees.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-12">
                        <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                        <div className="text-lg font-semibold mb-2">
                          {searchTerm ? 'No matches found' : 'No attendees to display'}
                        </div>
                        <p className="text-muted-foreground">
                          {searchTerm 
                            ? 'Try adjusting your search terms or filters'
                            : 'Load attendee data to begin RFID assignment'
                          }
                        </p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    sortedAndPaginatedAttendees.map((attendee, index) => {
                      const globalRowIndex = (currentPage - 1) * ROWS_PER_PAGE + index;
                      const isCancelled = attendee.registration_status === 'cancelled';
                      const isAssigned = attendee.rfid_uid && attendee.rfid_status === 'assigned';
                      
                      return (
                        <TableRow 
                          key={attendee.id} 
                          className={isCancelled ? 'bg-muted/50' : isAssigned ? 'bg-success/5' : ''}
                          data-row-index={globalRowIndex}
                        >
                          <TableCell className="font-mono text-sm">
                            {globalRowIndex + 1}
                          </TableCell>
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
                            {attendee.email && (
                              <div className="text-sm text-muted-foreground">
                                {attendee.email}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-sm">
                            {attendee.phone ? formatPhoneNumber(attendee.phone) : 'N/A'}
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            <Badge variant="outline" className="font-mono text-xs">
                              {attendee.order_id || 'No Order'}
                            </Badge>
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
                            <Badge variant="outline">
                              {attendee.ticket_type}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <EnhancedRfidAssignmentCell
                              attendeeId={attendee.id}
                              currentRfidUid={attendee.rfid_uid}
                              currentRfidStatus={attendee.rfid_status}
                              attendeeName={`${attendee.first_name} ${attendee.last_name}`}
                              onAssignmentComplete={handleAssignmentComplete}
                              onOptimisticUpdate={handleOptimisticUpdate}
                            />
                          </TableCell>
                          <TableCell>
                            {isAssigned ? (
                              <div className="flex items-center gap-1 text-success">
                                <CheckCircle className="h-4 w-4" />
                                <span className="text-sm">Assigned</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1 text-warning">
                                <AlertTriangle className="h-4 w-4" />
                                <span className="text-sm">Pending</span>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-muted-foreground">
                  Showing {((currentPage - 1) * ROWS_PER_PAGE) + 1} to{' '}
                  {Math.min(currentPage * ROWS_PER_PAGE, filteredAttendees.length)} of{' '}
                  {filteredAttendees.length} results
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <div className="text-sm px-3 py-1 border rounded">
                    {currentPage} / {totalPages}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
                </CardContent>
              </Card>
            </div>
          ) : (
            <GroupRfidView 
              attendees={filteredAttendees}
              onRefresh={debouncedLoadAttendees}
              onOptimisticUpdate={handleOptimisticUpdate}
              searchTerm={searchTerm}
            />
          )}

        {/* Status Alert */}
        {autoAdvanceEnabled && sortedAndPaginatedAttendees.length > 0 && (
          <Alert className="mt-4">
            <Zap className="h-4 w-4" />
            <AlertDescription>
              Auto-advance is enabled. After scanning an RFID, focus will automatically move to the next unassigned attendee.
              <kbd className="ml-2 px-2 py-1 text-xs bg-muted rounded">Ctrl+Space</kbd> to toggle.
            </AlertDescription>
          </Alert>
        )}
        </div>
      </div>
    </RfidCaptureProvider>
  );
};