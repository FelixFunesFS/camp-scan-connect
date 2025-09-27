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
import { Skeleton } from "@/components/ui/skeleton";
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
import { SiteLocationRfidView } from "@/components/SiteLocationRfidView";
import { RfidAssignmentFAQ } from "@/components/RfidAssignmentFAQ";
import { formatPhoneNumber } from "@/lib/phoneUtils";
import { flattenAndSortAttendees } from "@/utils/siteLocationGroupUtils";
import { useCsvExport } from "@/hooks/useCsvExport";
import { usePaginatedData } from "@/hooks/usePaginatedData";
import { useDataCache } from "@/hooks/useDataCache";
import { useOptimizedRefresh } from "@/hooks/useOptimizedRefresh";
import { getBulkOptimizedStatuses, getCheckInStatus, invalidateStatusCache } from "@/utils/optimizedStatusUtils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown,
  Download,
  Filter
} from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { MobileRfidControls } from "@/components/MobileRfidControls";
import { MobileAttendeeList } from "@/components/MobileAttendeeList";

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
  site_location_assignment?: string; // Extracted from custom_fields
  rfid_uid?: string;
  rfid_status?: string;
  registration_status?: string;
  created_at: string;
  // Location and RegFox fields
  regfox_id?: string;
  city?: string;
  state?: string;
  // Additional fields for enhanced functionality
  waiver_signed?: boolean;
  activated_at?: string;
  is_veteran?: boolean;
  veteran_thanked_at?: string;
  order_companions?: AttendeeData[]; // Linked attendees
  group_assignment_progress?: { assigned: number; total: number; percentage: number };
}

const ROWS_PER_PAGE = 50;

export const RfidAssignment = () => {
  // Consolidated state for better performance
  const [uiState, setUiState] = useState({
    searchTerm: '',
    currentPage: 1,
    mode: 'day-of' as 'pre-event' | 'day-of',
    viewMode: 'individual' as 'individual' | 'group' | 'site-location',
    showOnlyUnassigned: false,
    showCancelledRegistrants: false,
    showFAQ: false,
    isSearching: false,
    hasRfidInputFocused: false,
    sortField: 'arrival_day' as 'name' | 'phone' | 'order' | 'meal_plan' | 'arrival_day' | 'ticket_type' | 'waiver' | 'status' | 'check_in_status',
    sortDirection: 'asc' as 'asc' | 'desc',
    mealPlanFilter: 'all',
    arrivalDayFilter: 'all',
    checkInStatusFilter: 'all'
  });

  const [operationState, setOperationState] = useState({
    loading: true,
    syncing: false,
    isActivating: false,
    realtimeDisabled: false,
    isRealtimeConnected: false,
    activeSyncId: null as string | null
  });

  const [attendees, setAttendees] = useState<AttendeeData[]>([]);
  const [enhancedStatuses, setEnhancedStatuses] = useState<Record<string, any>>({});
  
  // Memoized progress calculations
  const progressData = useMemo(() => {
    if (!attendees.length) {
      return { checkedInCount: 0, assignedCount: 0, unassignedCount: 0, totalCount: 0, progressPercent: 0 };
    }

    let checkedInCount = 0;
    let assignedCount = 0;
    let unassignedCount = 0;

    attendees.forEach(attendee => {
      const enhancedStatus = enhancedStatuses[attendee.id];
      const status = enhancedStatus?.status || getCheckInStatus(attendee.rfid_uid, attendee.activated_at).status;
      
      if (status === 'checked_in') {
        checkedInCount++;
      } else if (status === 'assigned') {
        assignedCount++;
      } else {
        unassignedCount++;
      }
    });

    const totalAssignedCount = assignedCount + checkedInCount;
    const progressPercent = attendees.length > 0 ? (totalAssignedCount / attendees.length) * 100 : 0;

    return { checkedInCount, assignedCount, unassignedCount, totalCount: attendees.length, progressPercent };
  }, [attendees, enhancedStatuses]);

  // Hooks
  const { exportToCsv } = useCsvExport();
  const isMobile = useIsMobile();
  const dataCache = useDataCache<any>({ ttl: 300000, maxSize: 50 }); // 5 minute cache
  
  // Optimized data loading with caching
  const loadAttendees = useCallback(async () => {
    const cacheKey = `attendees-${uiState.mode}-${uiState.showCancelledRegistrants}`;
    const cached = dataCache.get(cacheKey);
    
    if (cached) {
      setAttendees(cached.attendees);
      setEnhancedStatuses(cached.statuses);
      setOperationState(prev => ({ ...prev, loading: false }));
      return;
    }

    setOperationState(prev => ({ ...prev, loading: true }));
    
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
          is_veteran,
          veteran_thanked_at,
          created_at,
          regfox_id,
          city,
          state,
          custom_fields,
          site_location_assignment,
          rfid_tags(uid, status, activated_at)
        `)
        .order('arrival_window', { ascending: true })
        .order('order_id', { ascending: true });

      // Apply registration status filter
      if (uiState.showCancelledRegistrants) {
        query = query.eq('registration_status', 'cancelled');
      } else {
        query = query.in('registration_status', ['registered', 'pending']);
      }

      if (uiState.mode === 'day-of') {
        query = query.order('created_at', { ascending: false });
      }

      const { data, error } = await query;
      if (error) throw error;

      const processedAttendees: AttendeeData[] = (data || []).map(attendee => {
        const rfidTags = (attendee as any).rfid_tags;
        const rfidTag = Array.isArray(rfidTags) ? rfidTags[0] : rfidTags;
        
        const arrivalDay = (attendee as any).arrival_window === 'early' ? 'Thursday' : 'Friday';
        const formattedMealPlan = (attendee as any).meal_plan === '1' ? 'Plan 1' : 
                                 (attendee as any).meal_plan === '2' ? 'Plan 2' : 'No Plan';
        const siteLocationAssignment = (attendee as any).site_location_assignment || 'Not Assigned';
        
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
          site_location_assignment: siteLocationAssignment,
          waiver_signed: (attendee as any).waiver_signed,
          activated_at: (attendee as any).activated_at,
          is_veteran: (attendee as any).is_veteran,
          veteran_thanked_at: (attendee as any).veteran_thanked_at,
          created_at: attendee.created_at,
          registration_status: (attendee as any).registration_status,
          regfox_id: (attendee as any).regfox_id,
          city: (attendee as any).city,
          state: (attendee as any).state,
          rfid_uid: rfidTag?.uid || null,
          rfid_status: rfidTag?.status || 'unissued',
        };
      });

      // Bulk load enhanced statuses with new optimized function
      const attendeeIds = processedAttendees.map(a => a.id);
      const bulkStatuses = await getBulkOptimizedStatuses(attendeeIds);
      
      // Cache the results
      dataCache.set(cacheKey, { attendees: processedAttendees, statuses: bulkStatuses });
      
      setAttendees(processedAttendees);
      setEnhancedStatuses(bulkStatuses);
    } catch (error) {
      console.error('Error loading attendees:', error);
      toast.error("Failed to load attendee data");
    } finally {
      setOperationState(prev => ({ ...prev, loading: false }));
    }
  }, [uiState.mode, uiState.showCancelledRegistrants, dataCache]);

  // Optimistic update function
  const handleOptimisticUpdate = useCallback((attendeeId: string, rfidUid: string | null, rfidStatus: string) => {
    setAttendees(prev => prev.map(attendee => 
      attendee.id === attendeeId 
        ? { ...attendee, rfid_uid: rfidUid, rfid_status: rfidStatus }
        : attendee
    ));
    // Invalidate cache for this attendee
    invalidateStatusCache([attendeeId]);
  }, []);

  // Optimized refresh with adaptive intervals
  const { isRefreshing, manualRefresh } = useOptimizedRefresh({
    onRefresh: loadAttendees,
    interval: 10000, // 10 seconds instead of 3
    enabled: !operationState.realtimeDisabled,
    adaptiveInterval: true,
    onError: (error) => console.error('Background refresh error:', error)
  });

  // Check for active syncs (optimized)
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
      
      setOperationState(prev => ({
        ...prev,
        activeSyncId: hasActiveSync ? activeSync.id : null,
        realtimeDisabled: hasActiveSync
      }));
      
      if (hasActiveSync && !operationState.realtimeDisabled) {
        toast.info("Sync in Progress - Real-time updates paused");
      } else if (!hasActiveSync && operationState.realtimeDisabled) {
        toast.success("Sync Complete - Real-time updates resumed");
        // Invalidate cache and reload
        dataCache.clear();
        loadAttendees();
      }
    } catch (error) {
      console.error('Error checking active syncs:', error);
    }
  }, [operationState.realtimeDisabled, loadAttendees, dataCache]);

  // RegFox sync
  const handleRegFoxSync = useCallback(async () => {
    setOperationState(prev => ({ ...prev, syncing: true }));
    try {
      const { data, error } = await supabase.functions.invoke('regfox-sync');
      
      if (error) throw error;

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
    } catch (error) {
      console.error('RegFox sync error:', error);
      toast.error("Sync Failed - Failed to sync RegFox data. Please try again.");
    } finally {
      setOperationState(prev => ({ ...prev, syncing: false }));
    }
  }, []);

  // Memoized filtering with enhanced performance
  const filteredAttendees = useMemo(() => {
    let filtered = attendees;

    // Registration status filter
    if (uiState.showCancelledRegistrants) {
      filtered = filtered.filter(a => a.registration_status === 'cancelled');
    } else {
      filtered = filtered.filter(a => ['registered', 'pending'].includes(a.registration_status || 'registered'));
    }

    // Assignment status filter
    if (uiState.showOnlyUnassigned) {
      filtered = filtered.filter(a => !a.rfid_uid || a.rfid_status !== 'assigned');
    }

    // Meal plan filter
    if (uiState.mealPlanFilter !== 'all') {
      if (uiState.mealPlanFilter === 'none') {
        filtered = filtered.filter(a => !a.meal_plan);
      } else {
        filtered = filtered.filter(a => a.meal_plan === uiState.mealPlanFilter);
      }
    }

    // Arrival day filter
    if (uiState.arrivalDayFilter !== 'all') {
      filtered = filtered.filter(a => a.arrival_window === uiState.arrivalDayFilter);
    }

    // Check-in status filter
    if (uiState.checkInStatusFilter !== 'all') {
      filtered = filtered.filter(a => {
        const enhancedStatus = enhancedStatuses[a.id];
        const checkInStatus = enhancedStatus || getCheckInStatus(a.rfid_uid, a.activated_at);
        return checkInStatus.status === uiState.checkInStatusFilter;
      });
    }

    // Search filter with companion inclusion
    if (uiState.searchTerm.trim()) {
      const term = uiState.searchTerm.toLowerCase().trim();
      const matchingOrderIds = new Set<string>();
      
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
      
      filtered = attendees.filter(attendee => 
        directMatches.includes(attendee) || 
        (attendee.order_id && matchingOrderIds.has(attendee.order_id))
      );
      
      // Re-apply other filters to search results
      if (uiState.showCancelledRegistrants) {
        filtered = filtered.filter(a => a.registration_status === 'cancelled');
      } else {
        filtered = filtered.filter(a => ['registered', 'pending'].includes(a.registration_status || 'registered'));
      }
      if (uiState.showOnlyUnassigned) {
        filtered = filtered.filter(a => !a.rfid_uid || a.rfid_status !== 'assigned');
      }
      if (uiState.mealPlanFilter !== 'all') {
        if (uiState.mealPlanFilter === 'none') {
          filtered = filtered.filter(a => !a.meal_plan);
        } else {
          filtered = filtered.filter(a => a.meal_plan === uiState.mealPlanFilter);
        }
      }
      if (uiState.arrivalDayFilter !== 'all') {
        filtered = filtered.filter(a => a.arrival_window === uiState.arrivalDayFilter);
      }
      if (uiState.checkInStatusFilter !== 'all') {
        filtered = filtered.filter(a => {
          const enhancedStatus = enhancedStatuses[a.id];
          const checkInStatus = enhancedStatus || getCheckInStatus(a.rfid_uid, a.activated_at);
          return checkInStatus.status === uiState.checkInStatusFilter;
        });
      }
    }

    return filtered;
  }, [attendees, enhancedStatuses, uiState.showCancelledRegistrants, uiState.showOnlyUnassigned, uiState.mealPlanFilter, uiState.arrivalDayFilter, uiState.checkInStatusFilter, uiState.searchTerm]);

  // Memoized sorting and pagination
  const { sortedAndPaginatedAttendees, totalPages } = useMemo(() => {
    const sorted = [...filteredAttendees].sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (uiState.sortField) {
        case 'name':
          aValue = `${a.first_name} ${a.last_name}`.toLowerCase();
          bValue = `${b.first_name} ${b.last_name}`.toLowerCase();
          break;
        case 'phone':
          aValue = a.phone || '';
          bValue = b.phone || '';
          break;
        case 'order':
          aValue = a.order_id || '';
          bValue = b.order_id || '';
          break;
        case 'meal_plan':
          aValue = a.formatted_meal_plan || '';
          bValue = b.formatted_meal_plan || '';
          break;
        case 'arrival_day':
          aValue = a.arrival_day || '';
          bValue = b.arrival_day || '';
          break;
        case 'ticket_type':
          aValue = a.ticket_type || '';
          bValue = b.ticket_type || '';
          break;
        case 'waiver':
          aValue = a.waiver_signed ? 'signed' : 'not_signed';
          bValue = b.waiver_signed ? 'signed' : 'not_signed';
          break;
        case 'status':
          aValue = a.rfid_uid ? 'assigned' : 'unassigned';
          bValue = b.rfid_uid ? 'assigned' : 'unassigned';
          break;
        case 'check_in_status':
          const aStatus = enhancedStatuses[a.id] || getCheckInStatus(a.rfid_uid, a.activated_at);
          const bStatus = enhancedStatuses[b.id] || getCheckInStatus(b.rfid_uid, b.activated_at);
          aValue = aStatus.status;
          bValue = bStatus.status;
          break;
        default:
          aValue = '';
          bValue = '';
      }
      
      if (aValue < bValue) return uiState.sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return uiState.sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    const startIndex = (uiState.currentPage - 1) * ROWS_PER_PAGE;
    const endIndex = startIndex + ROWS_PER_PAGE;
    const paginated = sorted.slice(startIndex, endIndex);
    const pages = Math.ceil(sorted.length / ROWS_PER_PAGE);

    return { sortedAndPaginatedAttendees: paginated, totalPages: pages };
  }, [filteredAttendees, uiState.currentPage, uiState.sortField, uiState.sortDirection, enhancedStatuses]);

  // Optimized sorting functions
  const handleSort = useCallback((field: typeof uiState.sortField) => {
    setUiState(prev => ({
      ...prev,
      sortDirection: prev.sortField === field ? (prev.sortDirection === 'asc' ? 'desc' : 'asc') : 'asc',
      sortField: field
    }));
  }, []);

  const getSortIcon = useCallback((field: typeof uiState.sortField) => {
    if (uiState.sortField !== field) return <ArrowUpDown className="h-4 w-4" />;
    return uiState.sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />;
  }, [uiState.sortField, uiState.sortDirection]);
        if (mealPlanFilter === 'none') {
          filtered = filtered.filter(a => !a.meal_plan);
        } else {
          filtered = filtered.filter(a => a.meal_plan === mealPlanFilter);
        }
      }
      if (arrivalDayFilter !== 'all') {
        filtered = filtered.filter(a => a.arrival_window === arrivalDayFilter);
      }
      if (checkInStatusFilter !== 'all') {
        filtered = filtered.filter(a => {
          const enhancedStatus = enhancedStatuses[a.id];
          const checkInStatus = enhancedStatus || getCheckInStatus(a.rfid_uid, a.activated_at);
          return checkInStatus.status === checkInStatusFilter;
        });
      }
    }

    return filtered;
  }, [attendees, enhancedStatuses, uiState.showCancelledRegistrants, uiState.showOnlyUnassigned, uiState.mealPlanFilter, uiState.arrivalDayFilter, uiState.checkInStatusFilter, uiState.searchTerm]);

  // Update UI state helpers
  const updateUiState = useCallback((updates: Partial<typeof uiState>) => {
    setUiState(prev => ({ ...prev, ...updates }));
  }, []);

  // Focus management (simplified)
  const focusFirstUnassigned = useCallback(() => {
    if (uiState.showOnlyUnassigned) {
      const firstUnassigned = sortedAndPaginatedAttendees.find(a => !a.rfid_uid);
      if (firstUnassigned) {
        const element = document.querySelector(`[data-attendee-id="${firstUnassigned.id}"] input`);
        (element as HTMLInputElement)?.focus();
      }
    }
  }, [sortedAndPaginatedAttendees, uiState.showOnlyUnassigned]);

  // Effects
  useEffect(() => {
    loadAttendees();
  }, [loadAttendees]);

  useEffect(() => {
    const interval = setInterval(checkActiveSyncs, 10000); // Check every 10 seconds
    return () => clearInterval(interval);
  }, [checkActiveSyncs]);

  // Bulk activation
  const handleBulkActivation = useCallback(async () => {
    setOperationState(prev => ({ ...prev, isActivating: true }));
    try {
      const { data, error } = await supabase.rpc('bulk_activate_assigned_rfids');
      if (error) throw error;
      
      toast.success(`Activated ${data?.[0]?.total_activated || 0} RFIDs successfully`);
      // Invalidate cache and reload
      dataCache.clear();
      loadAttendees();
    } catch (error) {
      console.error('Bulk activation error:', error);
      toast.error("Failed to activate RFIDs");
    } finally {
      setOperationState(prev => ({ ...prev, isActivating: false }));
    }
  }, [dataCache, loadAttendees]);

  if (operationState.loading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }
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
        case 'waiver':
          aValue = a.waiver_signed ? 'signed' : 'unsigned';
          bValue = b.waiver_signed ? 'signed' : 'unsigned';
          break;
        case 'status':
          aValue = a.rfid_uid && a.rfid_status === 'assigned' ? 'assigned' : 'unassigned';
          bValue = b.rfid_uid && b.rfid_status === 'assigned' ? 'assigned' : 'unassigned';
          break;
        case 'check_in_status':
          // Sort by check-in status: checked_in (0), assigned (1), unassigned (2)
          const aCheckIn = getCheckInStatus(a.rfid_uid, a.activated_at);
          const bCheckIn = getCheckInStatus(b.rfid_uid, b.activated_at);
          const aStatusValue = aCheckIn.status === 'checked_in' ? 0 : aCheckIn.status === 'assigned' ? 1 : 2;
          const bStatusValue = bCheckIn.status === 'checked_in' ? 0 : bCheckIn.status === 'assigned' ? 1 : 2;
          const statusResult = aStatusValue - bStatusValue;
          
          // Secondary sort by order_id when status is equal
          if (statusResult === 0) {
            const aOrderId = a.order_id?.toLowerCase() || 'zzz-no-order';
            const bOrderId = b.order_id?.toLowerCase() || 'zzz-no-order';
            const secondaryResult = aOrderId.localeCompare(bOrderId);
            return sortDirection === 'asc' ? secondaryResult : -secondaryResult;
          }
          
          return sortDirection === 'asc' ? statusResult : -statusResult;
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

  // Enhanced status calculation is now handled in loadAttendees function for better performance

  const totalPages = Math.ceil(filteredAttendees.length / ROWS_PER_PAGE);

  // RFID input focus tracking for dynamic provider control
  useEffect(() => {
    const checkRfidFocus = () => {
      const currentFocus = document.activeElement as HTMLElement;
      
      // Debug logging
      if (process.env.NODE_ENV === 'development') {
        console.log('Focus check:', {
          element: currentFocus?.tagName,
          className: currentFocus?.className,
          dataRfidInput: currentFocus?.getAttribute('data-rfid-input'),
          dataSearchInput: currentFocus?.getAttribute('data-search-input'),
          dataExcludeRfid: currentFocus?.getAttribute('data-exclude-rfid')
        });
      }
      
      // Check if current element is an RFID input
      const isRfidInput = currentFocus?.getAttribute('data-rfid-input') === 'true';
      
      // Exclude search inputs and other non-RFID inputs
      const isSearchInput = currentFocus?.getAttribute('data-search-input') === 'true' || 
                           currentFocus?.getAttribute('data-exclude-rfid') === 'true';
      
      // Only enable RFID capture if it's specifically an RFID input and not a search input
      const shouldEnableRfidCapture = isRfidInput && !isSearchInput;
      
      if (process.env.NODE_ENV === 'development') {
        console.log('RFID Focus Decision:', {
          isRfidInput,
          isSearchInput,
          shouldEnableRfidCapture,
          previousState: hasRfidInputFocused
        });
      }
      
      setHasRfidInputFocused(shouldEnableRfidCapture);
    };

    const handleFocusChange = () => {
      // Small delay to ensure focus has fully changed
      setTimeout(checkRfidFocus, 10);
    };

    // Check initial state
    checkRfidFocus();

    // Listen for any focus changes
    document.addEventListener('focusin', handleFocusChange);
    document.addEventListener('focusout', handleFocusChange);
    
    return () => {
      document.removeEventListener('focusin', handleFocusChange);
      document.removeEventListener('focusout', handleFocusChange);
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
    
    if (viewMode === 'site-location') {
      // For site location view, use flattened data that matches the displayed table
      const flatData = flattenAndSortAttendees(exportData);
      const siteLocationCsvData = flatData.map(attendee => ({
        site_location: attendee.siteLocationFull,
        order_id: attendee.orderDisplayName,
        name: `${attendee.first_name} ${attendee.last_name}`,
        phone: attendee.phone ? formatPhoneNumber(attendee.phone) : 'N/A',
        arrival: attendee.arrival_window || 'Standard',
        waiver: attendee.waiver_signed ? 'Signed' : 'Unsigned',
        rfid_status: attendee.rfid_status || 'unissued',
        rfid_uid: attendee.rfid_uid || 'Unassigned',
        email: attendee.email || 'N/A',
        ticket_type: attendee.ticket_type,
        meal_plan: attendee.meal_plan || 'No Plan',
        created_at: new Date(attendee.created_at).toLocaleString(),
        activated_at: attendee.activated_at ? new Date(attendee.activated_at).toLocaleString() : 'Not Activated'
      }));
      
      // Create CSV content for site location view
      const headers = [
        'Site Location',
        'Order ID', 
        'Name',
        'Phone',
        'Arrival',
        'Waiver',
        'RFID Status',
        'RFID UID',
        'Email',
        'Ticket Type',
        'Meal Plan',
        'Created At',
        'Activated At'
      ];
      
      const csvContent = [
        headers.join(','),
        ...siteLocationCsvData.map(row => [
          `"${row.site_location}"`,
          `"${row.order_id}"`,
          `"${row.name}"`,
          `"${row.phone}"`,
          `"${row.arrival}"`,
          `"${row.waiver}"`,
          `"${row.rfid_status}"`,
          `"${row.rfid_uid}"`,
          `"${row.email}"`,
          `"${row.ticket_type}"`,
          `"${row.meal_plan}"`,
          `"${row.created_at}"`,
          `"${row.activated_at}"`
        ].join(','))
      ].join('\n');
      
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      const filename = `rfid-assignment-site-location-${mode}-${showOnlyUnassigned ? 'unassigned-only' : 'all'}-${new Date().toISOString().split('T')[0]}`;
      link.setAttribute('href', url);
      link.setAttribute('download', `${filename}.csv`);
      link.style.visibility = 'hidden';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success(`Export Complete - Exported ${siteLocationCsvData.length} attendee records to CSV (Site Location View)`);
    } else {
      // Use existing export for individual and group views
      const filename = `rfid-assignment-${viewMode}-${mode}-${showOnlyUnassigned ? 'unassigned-only' : 'all'}`;
      exportToCsv(exportData, filename);
      
      toast.success(`Export Complete - Exported ${exportData.length} attendee records to CSV`);
    }
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
    // Only set to 'data-load' if this is initial load or mode change, not a refresh
    if (attendees.length === 0 || lastInteraction === 'data-load') {
      setLastInteraction('data-load');
    }
    loadAttendees();
  }, [loadAttendees]);

  // Safe auto-focus: only on data load, not during search/filter operations or recent RFID assignments
  useEffect(() => {
    if (sortedAndPaginatedAttendees.length > 0 && !loading && !isSearching && lastInteraction === 'data-load' && !recentRfidAssignment) {
      focusFirstUnassigned();
    }
  }, [sortedAndPaginatedAttendees, loading, focusFirstUnassigned, isSearching, lastInteraction, recentRfidAssignment]);

  const handleAssignmentComplete = useCallback(() => {
    // Set flag to prevent auto-focus after RFID assignment
    setRecentRfidAssignment(true);
    
    // Clear flag after 1 second to allow normal auto-focus behavior to resume
    setTimeout(() => {
      setRecentRfidAssignment(false);
    }, 1000);
    
    debouncedLoadAttendees(); // Use debounced refresh after assignment
  }, [debouncedLoadAttendees]);

  const handleBulkActivation = useCallback(async () => {
    setIsActivating(true);
    
    try {
      const { data, error } = await supabase.rpc('bulk_activate_assigned_rfids');
      
      if (error) {
        console.error('Bulk activation error:', error);
        toast.error(`Activation failed: ${error.message}`);
        return;
      }
      
      if (data && data.length > 0) {
        const result = data[0];
        if (result.activation_successful) {
          toast.success(`Successfully activated ${result.total_activated} attendees${result.veterans_thanked > 0 ? ` (${result.veterans_thanked} veterans thanked)` : ''}`);
          debouncedLoadAttendees(); // Refresh data
        } else {
          toast.error('Activation failed - check logs for details');
        }
      } else {
        toast.info('No assigned RFIDs found to activate');
      }
    } catch (error) {
      console.error('Bulk activation error:', error);
      toast.error('Failed to activate assigned RFIDs');
    } finally {
      setIsActivating(false);
    }
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
        
        {isMobile ? (
          /* Mobile Layout */
          <div className="mobile-container py-4">
            {/* Mobile Header */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h1 className="mobile-title">RFID Assignment</h1>
                  <p className="mobile-subtitle">Assign tags to attendees</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowFAQ(true)}
                  className="touch-target"
                >
                  <HelpCircle className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Mobile Controls */}
            <MobileRfidControls
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              showOnlyUnassigned={showOnlyUnassigned}
              onShowOnlyUnassignedChange={setShowOnlyUnassigned}
               mealPlanFilter={mealPlanFilter}
               onMealPlanFilterChange={setMealPlanFilter}
               arrivalDayFilter={arrivalDayFilter}
               onArrivalDayFilterChange={setArrivalDayFilter}
               checkInStatusFilter={checkInStatusFilter}
               onCheckInStatusFilterChange={setCheckInStatusFilter}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              onSync={handleRegFoxSync}
              syncing={syncing}
              totalCount={progressData.totalCount}
              assignedCount={progressData.assignedCount}
              progressPercent={progressData.progressPercent}
              onBulkActivation={handleBulkActivation}
              isActivating={isActivating}
            />

            {/* Mobile Content */}
            <div className="mt-6">
              {viewMode === 'individual' ? (
                <MobileAttendeeList
                  attendees={sortedAndPaginatedAttendees}
                  loading={loading}
                  totalCount={filteredAttendees.length}
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                  onAssignmentComplete={handleAssignmentComplete}
                  onOptimisticUpdate={handleOptimisticUpdate}
                />
              ) : viewMode === 'group' ? (
                <GroupRfidView 
                  attendees={filteredAttendees}
                  onRefresh={debouncedLoadAttendees}
                  onOptimisticUpdate={handleOptimisticUpdate}
                  searchTerm={searchTerm}
                />
              ) : (
                <SiteLocationRfidView 
                  attendees={filteredAttendees}
                  onRefresh={debouncedLoadAttendees}
                  onOptimisticUpdate={handleOptimisticUpdate}
                  searchTerm={searchTerm}
                />
              )}
            </div>
          </div>
        ) : (
          /* Desktop Layout */
          <div className="container mx-auto p-6 max-w-none lg:max-w-[95vw] xl:max-w-[90vw]">
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
                    <Button 
                      variant="default" 
                      onClick={handleBulkActivation}
                      disabled={isActivating || progressData.assignedCount === 0}
                      className="flex items-center gap-2"
                      title="Activate all attendees with assigned RFIDs"
                    >
                      <Zap className={`h-4 w-4 ${isActivating ? 'animate-pulse' : ''}`} />
                      {isActivating ? 'Activating...' : `Activate ${progressData.assignedCount} Assigned`}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Progress Overview */}
              <TooltipProvider>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Card>
                        <CardContent className="pt-6">
                          <div className="text-2xl font-bold text-foreground">{progressData.totalCount}</div>
                          <p className="text-xs text-muted-foreground">Total Attendees</p>
                        </CardContent>
                      </Card>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Total number of registered attendees in the system</p>
                    </TooltipContent>
                  </Tooltip>
                  
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Card>
                        <CardContent className="pt-6">
                          <div className="text-2xl font-bold text-warning">{progressData.unassignedCount}</div>
                          <p className="text-xs text-muted-foreground">Unassigned</p>
                        </CardContent>
                      </Card>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Attendees who have not been assigned an RFID bracelet yet</p>
                    </TooltipContent>
                  </Tooltip>
                  
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Card>
                        <CardContent className="pt-6">
                          <div className="text-2xl font-bold text-secondary">{progressData.assignedCount}</div>
                          <p className="text-xs text-muted-foreground">Assigned</p>
                        </CardContent>
                      </Card>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Attendees with RFID bracelets assigned but not yet activated</p>
                    </TooltipContent>
                  </Tooltip>
                  
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Card>
                        <CardContent className="pt-6">
                          <div className="text-2xl font-bold text-primary">{progressData.checkedInCount}</div>
                          <p className="text-xs text-muted-foreground">Checked In</p>
                        </CardContent>
                      </Card>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Attendees who have activated their RFID bracelets and checked in</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                
                {/* Progress Card - Separate row for better mobile display */}
                <div className="grid grid-cols-1 md:grid-cols-1 gap-4 mb-6">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Card>
                        <CardContent className="pt-6">
                          <div className="text-2xl font-bold text-success">{Math.round(progressData.progressPercent)}%</div>
                          <p className="text-xs text-muted-foreground">Progress</p>
                          <Progress value={progressData.progressPercent} className="mt-2 h-2" />
                        </CardContent>
                      </Card>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Percentage of attendees who have RFID bracelets (assigned or checked in)</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </TooltipProvider>
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
                  <Select value={viewMode} onValueChange={(value) => setViewMode(value as 'individual' | 'group' | 'site-location')}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="individual">Individual</SelectItem>
                      <SelectItem value="group">By Order</SelectItem>
                      <SelectItem value="site-location">By Site</SelectItem>
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
                  
                  <Select value={checkInStatusFilter} onValueChange={setCheckInStatusFilter}>
                    <SelectTrigger className="w-36">
                      <SelectValue placeholder="Check-In Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="checked_in">✅ Checked In</SelectItem>
                      <SelectItem value="assigned">🟡 Assigned</SelectItem>
                      <SelectItem value="unassigned">🔴 Unassigned</SelectItem>
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
                    <div className="rounded-md border overflow-x-auto">
                      <Table className="min-w-fit">
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-16 min-w-16">#</TableHead>
                            <TableHead className="min-w-[180px]">
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
                            <TableHead className="min-w-[140px]">
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
                            <TableHead className="min-w-[120px]">
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
                            <TableHead className="min-w-[120px]">
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
                            <TableHead className="min-w-[120px]">
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
                            <TableHead className="min-w-[140px]">
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
                            <TableHead className="min-w-[100px]">
                              <Button
                                variant="ghost"
                                className="h-auto p-0 font-semibold hover:bg-transparent"
                                onClick={() => handleSort('waiver')}
                              >
                                <div className="flex items-center gap-2">
                                  Waiver
                                  {getSortIcon('waiver')}
                                </div>
                              </Button>
                            </TableHead>
                            <TableHead className="w-80 min-w-80">RFID Assignment</TableHead>
                            <TableHead className="min-w-[120px]">
                              <Button
                                variant="ghost"
                                className="h-auto p-0 font-semibold hover:bg-transparent"
                                onClick={() => handleSort('check_in_status')}
                              >
                                <div className="flex items-center gap-2">
                                  Check-In Status
                                  {getSortIcon('check_in_status')}
                                </div>
                              </Button>
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {sortedAndPaginatedAttendees.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={7} className="text-center py-12">
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
                                    <Badge 
                                      variant={attendee.waiver_signed ? "default" : "destructive"}
                                      className={
                                        attendee.waiver_signed 
                                          ? 'bg-success text-success-foreground' 
                                          : 'bg-destructive text-destructive-foreground'
                                      }
                                    >
                                      {attendee.waiver_signed ? 'Signed' : 'Unsigned'}
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
                                    {(() => {
                                      // Use enhanced status if available, fallback to basic status
                                      const enhancedStatus = enhancedStatuses[attendee.id];
                                      const checkInStatus = enhancedStatus || getCheckInStatus(attendee.rfid_uid, attendee.activated_at);
                                      return (
                                        <div className="flex items-center gap-2">
                                          <span className="text-sm">{checkInStatus.icon}</span>
                                          <Badge variant={checkInStatus.variant} className="text-xs">
                                            {checkInStatus.label}
                                          </Badge>
                                          {attendee.activated_at && (
                                            <span className="text-xs text-muted-foreground ml-1">
                                              {new Date(attendee.activated_at).toLocaleDateString()}
                                            </span>
                                          )}
                                        </div>
                                      );
                                    })()}
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
            ) : viewMode === 'group' ? (
              <GroupRfidView 
                attendees={filteredAttendees}
                onRefresh={debouncedLoadAttendees}
                onOptimisticUpdate={handleOptimisticUpdate}
                searchTerm={searchTerm}
              />
            ) : (
              <SiteLocationRfidView 
                attendees={filteredAttendees}
                onRefresh={debouncedLoadAttendees}
                onOptimisticUpdate={handleOptimisticUpdate}
                searchTerm={searchTerm}
              />
            )}
          </div>
        )}
      </div>
    </RfidCaptureProvider>
  );
};