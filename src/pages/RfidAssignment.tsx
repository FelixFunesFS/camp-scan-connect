import { formatMealPlan } from "@/lib/phoneUtils";
import { getCurrentEventId } from "@/lib/eventRuntime";
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
import { buildSiteAssignment, formatSiteAssignment } from '@/utils/siteLocationUtils';
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
import { MobileRfidAssignmentCard } from "@/components/MobileRfidAssignmentCard";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { OfflineQueueBadge } from "@/components/OfflineQueueBadge";
import { formatTicketType } from "@/lib/ticketTypes";
import { getStatusClassName, getStatusLabel } from "@/lib/registrationStatus";
import { TShirtService } from "@/services/tshirtService";
import { TShirtSummaryBadge } from "@/components/TShirtSummaryBadge";

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
  arrival_day?: string;
  formatted_meal_plan?: string;
  site_location_assignment?: string;
  rfid_uid?: string;
  rfid_status?: string;
  registration_status?: string;
  created_at: string;
  regfox_id?: string;
  city?: string;
  state?: string;
  waiver_signed?: boolean;
  activated_at?: string;
  is_veteran?: boolean;
  veteran_thanked_at?: string;
  order_companions?: AttendeeData[];
  group_assignment_progress?: { assigned: number; total: number; percentage: number };
  most_recent_activation_method?: string;
  most_recent_activation_at?: string;
  tshirt_orders?: Array<{
    id: string;
    productLine: string;
    style: string;
    size: string;
    quantity: number;
    isPickedUp: boolean;
    pickedUpCount?: number;
    pickupTime?: string;
  }>;
  tshirt_summary?: { hasAnyTShirt: boolean; totalOrders: number; totalPickedUp: number };
}

const ROWS_PER_PAGE = 100;

type AttendeeCategory = 'campers' | 'ops' | 'walkins';

const getAttendeeCategory = (a: { ticket_type?: string; order_id?: string; first_name?: string }): AttendeeCategory => {
  if (a.ticket_type === 'operational_worker' || (a.order_id || '').toUpperCase().startsWith('OPS-')) return 'ops';
  if ((a.order_id || '').toUpperCase().startsWith('MCAMPER') || (a.first_name || '').toUpperCase().startsWith('MCAMPER-')) return 'walkins';
  return 'campers';
};

const CATEGORY_OPTIONS: Array<{ value: AttendeeCategory | 'all'; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'campers', label: 'Campers' },
  { value: 'ops', label: 'Operations' },
  { value: 'walkins', label: 'Walk-Ins' },
];

const MOBILE_SORT_OPTIONS = [
  { value: 'name', label: 'Name' },
  { value: 'arrival_day', label: 'Arrival day' },
  { value: 'order', label: 'Order' },
  { value: 'ticket_type', label: 'Accommodation' },
  { value: 'check_in_status', label: 'Check-in status' },
  { value: 'status', label: 'Assignment status' },
  { value: 'most_recent_activation', label: 'Most recent activation' }
] as const;

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
    sortField: 'arrival_day' as 'name' | 'phone' | 'order' | 'meal_plan' | 'arrival_day' | 'ticket_type' | 'waiver' | 'status' | 'check_in_status' | 'most_recent_activation',
    sortDirection: 'asc' as 'asc' | 'desc',
    mealPlanFilter: 'all',
    arrivalDayFilter: 'all',
    checkInStatusFilter: 'all',
    categoryFilter: 'all' as AttendeeCategory | 'all'
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
  const [selectedAttendeeId, setSelectedAttendeeId] = useState<string | null>(null);
  
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
      const status = enhancedStatus?.status || getCheckInStatus(attendee.rfid_uid, attendee.activated_at, attendee.rfid_status).status;
      
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
  
  const dataCache = useDataCache<any>({ ttl: 300000, maxSize: 50 });
  
  // Optimized data loading with caching and debug logging
  const loadAttendees = useCallback(async () => {
    console.log('🔄 Starting loadAttendees...');
    const cacheKey = `attendees-${uiState.mode}-${uiState.showCancelledRegistrants}`;
    const cached = dataCache.get(cacheKey);
    
    if (cached) {
      console.log('✅ Using cached data');
      setAttendees(cached.attendees);
      setEnhancedStatuses(cached.statuses || {});
      setOperationState(prev => ({ ...prev, loading: false }));
      return;
    }

    setOperationState(prev => ({ ...prev, loading: true }));
    console.log('⏳ Loading attendees from database...');
    
    try {
      // Fetch attendees in pages so large events are never clipped at 1000 rows
      const ATTENDEE_PAGE = 1000;
      const data: any[] = [];
      for (let page = 0; ; page++) {
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
            t_shirt_size,
            site_location_assignment,
            site_detail,
            rfid_tags(uid, status, activated_at)
          `)
          .eq('event_id', getCurrentEventId())
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

        query = query.order('id', { ascending: true }).range(page * ATTENDEE_PAGE, page * ATTENDEE_PAGE + ATTENDEE_PAGE - 1);

        const { data: pageRows, error } = await query;
        if (error) throw error;
        data.push(...(pageRows || []));
        if (!pageRows || pageRows.length < ATTENDEE_PAGE) break;
      }

      console.log(`📊 Loaded ${data.length} attendees from database`);


      // Fetch activation data for all attendees
      const attendeeIds = (data || []).map((a: any) => a.id);
      // Chunked so the request URL stays short enough for large attendee lists
      const ID_CHUNK = 100;
      const idBatches: string[][] = [];
      for (let i = 0; i < attendeeIds.length; i += ID_CHUNK) {
        idBatches.push(attendeeIds.slice(i, i + ID_CHUNK));
      }
      const activationBatches = await Promise.all(
        idBatches.map(async (ids) => {
          const { data: rows, error: txError } = await supabase
            .from('station_transactions')
            .select('attendee_id, activation_method, created_at')
            .eq('event_id', getCurrentEventId())
            .in('attendee_id', ids)
            .eq('station_type', 'activation')
            .eq('transaction_type', 'activate')
            .order('created_at', { ascending: false });
          if (txError) throw txError;
          return rows || [];
        })
      );
      const activationData = activationBatches
        .flat()
        .sort((a: any, b: any) => (a.created_at < b.created_at ? 1 : -1));

      // Create a map of most recent activations
      const activationMap = new Map<string, { method: string; timestamp: string }>();
      (activationData || []).forEach((activation: any) => {
        if (!activationMap.has(activation.attendee_id)) {
          activationMap.set(activation.attendee_id, {
            method: activation.activation_method,
            timestamp: activation.created_at
          });
        }
      });

      // T-shirt pickup transactions (single query, computed in memory per attendee)
      const { data: tshirtTx } = await supabase
        .from('station_transactions')
        .select('attendee_id, extra_data, created_at')
        .eq('event_id', getCurrentEventId())
        .eq('station_type', 'tshirts')
        .eq('transaction_type', 'tshirt_pickup');
      const tshirtTxByAttendee = new Map<string, Array<{ extra_data: any; created_at: string }>>();
      (tshirtTx || []).forEach((tx: any) => {
        const list = tshirtTxByAttendee.get(tx.attendee_id) || [];
        list.push({ extra_data: tx.extra_data, created_at: tx.created_at });
        tshirtTxByAttendee.set(tx.attendee_id, list);
      });

      const processedAttendees: AttendeeData[] = (data || []).map(attendee => {
        const rfidTags = (attendee as any).rfid_tags;
        const rfidTag = Array.isArray(rfidTags) ? rfidTags[0] : rfidTags;
        
        const arrivalDay = (attendee as any).arrival_window === 'early' ? 'Thursday' : 'Friday';
        const formattedMealPlan = formatMealPlan((attendee as any).meal_plan ?? null);
        const siteLocationAssignment = buildSiteAssignment(
          (attendee as any).ticket_type,
          (attendee as any).site_detail,
          (attendee as any).site_location_assignment,
        ) || 'Not Assigned';
        
        const activation = activationMap.get(attendee.id);

        const tshirtInfo = TShirtService.computeAttendeeTShirtInfo(
          attendee.id,
          (attendee as any).custom_fields,
          (attendee as any).t_shirt_size,
          tshirtTxByAttendee.get(attendee.id) || []
        );
        const totalOrders = tshirtInfo.orders.reduce((sum, o) => sum + o.quantity, 0);
        const totalPickedUp = tshirtInfo.orders.reduce((sum, o) => sum + (o.pickedUpCount ?? (o.isPickedUp ? o.quantity : 0)), 0);
        
        
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
          most_recent_activation_method: activation?.method,
          most_recent_activation_at: activation?.timestamp,
          tshirt_orders: tshirtInfo.orders,
          tshirt_summary: {
            hasAnyTShirt: tshirtInfo.hasTShirt && totalOrders > 0,
            totalOrders,
            totalPickedUp,
          },
        };
      });

      // Set attendees first to show data immediately
      setAttendees(processedAttendees);
      setOperationState(prev => ({ ...prev, loading: false }));
      console.log('✅ Attendees loaded and UI updated');

      // Load enhanced statuses separately with timeout
      try {
        console.log('🔍 Loading enhanced statuses...');
        const attendeeIds = processedAttendees.map(a => a.id);
        
        // Add timeout to prevent hanging
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Status loading timeout')), 10000);
        });
        
        const bulkStatusesPromise = getBulkOptimizedStatuses(attendeeIds);
        const bulkStatuses = await Promise.race([bulkStatusesPromise, timeoutPromise]);
        
        console.log(`✅ Enhanced statuses loaded for ${Object.keys(bulkStatuses).length} attendees`);
        setEnhancedStatuses(bulkStatuses);
        
        // Cache the results with both attendees and statuses
        dataCache.set(cacheKey, { attendees: processedAttendees, statuses: bulkStatuses });
      } catch (statusError) {
        console.warn('⚠️ Failed to load enhanced statuses:', statusError);
        // Use fallback statuses
        const fallbackStatuses: Record<string, any> = {};
        processedAttendees.forEach(attendee => {
          fallbackStatuses[attendee.id] = getCheckInStatus(attendee.rfid_uid, attendee.activated_at, attendee.rfid_status);
        });
        setEnhancedStatuses(fallbackStatuses);
        
        // Cache with basic data
        dataCache.set(cacheKey, { attendees: processedAttendees, statuses: fallbackStatuses });
      }
      
    } catch (error) {
      console.error('❌ Error loading attendees:', error);
      toast.error("Failed to load attendee data");
      setOperationState(prev => ({ ...prev, loading: false }));
    }
  }, [uiState.mode, uiState.showCancelledRegistrants]);

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

  // Optimized refresh with adaptive intervals - disabled during initial load
  const { isRefreshing, manualRefresh } = useOptimizedRefresh({
    onRefresh: loadAttendees,
    interval: 30000, // 30 seconds to reduce frequency
    enabled: !operationState.realtimeDisabled && !operationState.loading,
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

    // Category filter (campers / operations / walk-ins)
    if (uiState.categoryFilter !== 'all') {
      filtered = filtered.filter(a => getAttendeeCategory(a) === uiState.categoryFilter);
    }


    // Assignment status filter
    if (uiState.showOnlyUnassigned) {
      filtered = filtered.filter(a => !a.rfid_uid || !['assigned', 'active'].includes(a.rfid_status || ''));
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
        const checkInStatus = enhancedStatus || getCheckInStatus(a.rfid_uid, a.activated_at, a.rfid_status);
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
      if (uiState.categoryFilter !== 'all') {
        filtered = filtered.filter(a => getAttendeeCategory(a) === uiState.categoryFilter);
      }

      if (uiState.showOnlyUnassigned) {
        filtered = filtered.filter(a => !a.rfid_uid || !['assigned', 'active'].includes(a.rfid_status || ''));
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
          const checkInStatus = enhancedStatus || getCheckInStatus(a.rfid_uid, a.activated_at, a.rfid_status);
          return checkInStatus.status === uiState.checkInStatusFilter;
        });
      }
    }

    return filtered;
  }, [attendees, enhancedStatuses, uiState.showCancelledRegistrants, uiState.showOnlyUnassigned, uiState.mealPlanFilter, uiState.arrivalDayFilter, uiState.checkInStatusFilter, uiState.searchTerm, uiState.categoryFilter]);

  // Counts per category for the quick filter chips
  const categoryCounts = useMemo(() => {
    const base = attendees.filter(a =>
      uiState.showCancelledRegistrants
        ? a.registration_status === 'cancelled'
        : ['registered', 'pending'].includes(a.registration_status || 'registered')
    );
    return {
      all: base.length,
      campers: base.filter(a => getAttendeeCategory(a) === 'campers').length,
      ops: base.filter(a => getAttendeeCategory(a) === 'ops').length,
      walkins: base.filter(a => getAttendeeCategory(a) === 'walkins').length,
    };
  }, [attendees, uiState.showCancelledRegistrants]);

  // Memoized sorting and pagination
  const { sortedAndPaginatedAttendees, totalPages } = useMemo(() => {
    const sorted = [...filteredAttendees].sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (uiState.sortField) {
        case 'name':
          aValue = `${a.first_name} ${a.last_name}`.toLocaleLowerCase();
          bValue = `${b.first_name} ${b.last_name}`.toLocaleLowerCase();
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
          const aStatus = enhancedStatuses[a.id] || getCheckInStatus(a.rfid_uid, a.activated_at, a.rfid_status);
          const bStatus = enhancedStatuses[b.id] || getCheckInStatus(b.rfid_uid, b.activated_at, b.rfid_status);
          aValue = aStatus.status;
          bValue = bStatus.status;
          break;
        case 'most_recent_activation':
          aValue = a.most_recent_activation_at || '';
          bValue = b.most_recent_activation_at || '';
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

  // Update UI state helpers
  const updateUiState = useCallback((updates: Partial<typeof uiState>) => {
    setUiState(prev => ({ ...prev, ...updates }));
  }, []);

  // Optimized sorting functions
  const handleSort = useCallback((field: typeof uiState.sortField) => {
    setUiState(prev => ({
      ...prev,
      sortDirection: prev.sortField === field ? (prev.sortDirection === 'asc' ? 'desc' : 'asc') : 'asc',
      sortField: field
    }));
  }, []);

  const setSortDirection = useCallback((sortDirection: 'asc' | 'desc') => {
    setUiState(prev => ({ ...prev, sortDirection, currentPage: 1 }));
  }, []);

  const activeFilterCount = [
    uiState.mealPlanFilter !== 'all',
    uiState.arrivalDayFilter !== 'all',
    uiState.checkInStatusFilter !== 'all',
    uiState.showOnlyUnassigned,
    uiState.showCancelledRegistrants
  ].filter(Boolean).length;

  const getSortIcon = useCallback((field: typeof uiState.sortField) => {
    if (uiState.sortField !== field) return <ArrowUpDown className="h-4 w-4" />;
    return uiState.sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />;
  }, [uiState.sortField, uiState.sortDirection]);

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

  // Bulk activation
  const handleBulkActivation = useCallback(async () => {
    setOperationState(prev => ({ ...prev, isActivating: true }));
    try {
      const { data, error } = await supabase.rpc('bulk_activate_assigned_rfids');
      if (error) throw error;
      
      toast.success(`Activated ${data?.[0]?.total_activated || 0} wristbands successfully`);
      // Invalidate cache and reload
      dataCache.clear();
      loadAttendees();
    } catch (error) {
      console.error('Bulk activation error:', error);
      toast.error("Failed to activate credentials");
    } finally {
      setOperationState(prev => ({ ...prev, isActivating: false }));
    }
  }, [dataCache, loadAttendees]);

  // CSV Export
  const handleCsvExport = useCallback(() => {
    const csvData = filteredAttendees.map(attendee => ({
      'First Name': attendee.first_name,
      'Last Name': attendee.last_name,
      'Email': attendee.email || '',
      'Phone': attendee.phone || '',
      'Order ID': attendee.order_id || '',
      'Ticket Type': formatTicketType(attendee.ticket_type),
      'Meal Plan': attendee.formatted_meal_plan || '',
      'Arrival Day': attendee.arrival_day || '',
      'Site Location': formatSiteAssignment(attendee.ticket_type, (attendee as any).site_detail, attendee.site_location_assignment) || '',
      'Code': attendee.rfid_uid || '',
      'Credential Status': attendee.rfid_status || '',
      'Most Recent Activation Method': attendee.most_recent_activation_method 
        ? (attendee.most_recent_activation_method === 'staff_assisted' ? 'Staff Assisted' : 'Self Activated')
        : 'Not Activated',
      'Most Recent Activation Time': attendee.most_recent_activation_at 
        ? new Date(attendee.most_recent_activation_at).toLocaleString()
        : '',
      'Waiver Signed': attendee.waiver_signed ? 'Yes' : 'No',
      'Registration Status': attendee.registration_status || ''
    }));

    exportToCsv(csvData as any, `rfid-assignments-${new Date().toISOString().split('T')[0]}.csv`);
  }, [filteredAttendees, exportToCsv]);

  // Effects
  // Initial load with performance tracking - only run on mount
  useEffect(() => {
    console.log('🚀 Component mounted, initializing...');
    loadAttendees();
  }, []); // Empty dependency array to prevent infinite loops

  useEffect(() => {
    const interval = setInterval(checkActiveSyncs, 10000); // Check every 10 seconds
    return () => clearInterval(interval);
  }, [checkActiveSyncs]);

  // RFID focus detection
  useEffect(() => {
    const handleFocusChange = () => {
      const activeElement = document.activeElement;
      const isRfidInput = activeElement?.getAttribute('data-rfid-input') === 'true';
      setUiState(prev => ({ ...prev, hasRfidInputFocused: isRfidInput }));
    };

    document.addEventListener('focusin', handleFocusChange);
    document.addEventListener('focusout', handleFocusChange);

    return () => {
      document.removeEventListener('focusin', handleFocusChange);
      document.removeEventListener('focusout', handleFocusChange);
    };
  }, []);

  // Loading state with debug information
  if (operationState.loading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-8 w-64" />
          <div className="text-sm text-muted-foreground animate-pulse">
            Loading attendee data...
          </div>
        </div>
        <Alert>
          <AlertDescription>
            🔄 Loading credential assignment data. If this takes more than 10 seconds, please refresh the page.
          </AlertDescription>
        </Alert>
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (isMobile) {
    return (
      <div className="container mx-auto p-4">
        <RfidCaptureProvider enabled={uiState.hasRfidInputFocused}>
          <div className="space-y-4">
            <OfflineQueueBadge />
            {/* FAQ Toggle */}
            <div className="flex justify-between items-center">
              <h1 className="text-2xl font-bold">Credential Assignment</h1>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setUiState(prev => ({ ...prev, showFAQ: !prev.showFAQ }))}
              >
                <HelpCircle className="h-4 w-4 mr-2" />
                {uiState.showFAQ ? 'Hide' : 'Show'} FAQ
              </Button>
            </div>

            {uiState.showFAQ && (
              <RfidAssignmentFAQ 
                isOpen={uiState.showFAQ}
                onClose={() => setUiState(prev => ({ ...prev, showFAQ: false }))} 
              />
            )}

            {/* Mobile controls: search, sort, filters, grouping */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="relative flex-1 min-w-0">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Search name, phone, order..."
                    value={uiState.searchTerm}
                    onChange={(e) => setUiState(prev => ({ ...prev, searchTerm: e.target.value, currentPage: 1 }))}
                    className="pl-10 h-11"
                  />
                </div>
                {uiState.searchTerm && (
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-11 w-11 shrink-0"
                    onClick={() => setUiState(prev => ({ ...prev, searchTerm: '' }))}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>

              {/* Sort + Filters */}
              <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="h-11 w-full min-w-0 justify-start truncate">
                      <ArrowUpDown className="h-4 w-4 mr-2 shrink-0" />
                      <span className="truncate">{MOBILE_SORT_OPTIONS.find(o => o.value === uiState.sortField)?.label || 'Sort'}</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="z-50 bg-popover w-56">
                    {MOBILE_SORT_OPTIONS.map(option => (
                      <DropdownMenuItem key={option.value} onClick={() => handleSort(option.value)}>
                        <span className="flex-1">{option.label}</span>
                        {uiState.sortField === option.value && (
                          uiState.sortDirection === 'asc'
                            ? <ArrowUp className="h-4 w-4" />
                            : <ArrowDown className="h-4 w-4" />
                        )}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                <Button
                  variant="outline"
                  className="h-11 min-w-[78px] px-3"
                  onClick={() => setSortDirection(uiState.sortDirection === 'asc' ? 'desc' : 'asc')}
                  aria-label={uiState.sortDirection === 'asc' ? 'Sorted ascending; change to descending' : 'Sorted descending; change to ascending'}
                >
                  {uiState.sortDirection === 'asc' ? <ArrowUp className="mr-1 h-4 w-4" /> : <ArrowDown className="mr-1 h-4 w-4" />}
                  {uiState.sortField === 'name' ? (uiState.sortDirection === 'asc' ? 'A–Z' : 'Z–A') : (uiState.sortDirection === 'asc' ? 'Asc' : 'Desc')}
                </Button>

                <Sheet>
                  <SheetTrigger asChild>
                    <Button variant="outline" className="h-11 w-full justify-start">
                      <Filter className="h-4 w-4 mr-2 shrink-0" />
                      <span className="truncate">Filters</span>
                      {activeFilterCount > 0 && (
                        <Badge variant="secondary" className="ml-auto">{activeFilterCount}</Badge>
                      )}
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto pb-[env(safe-area-inset-bottom)]">
                    <SheetHeader>
                      <SheetTitle>Filters</SheetTitle>
                    </SheetHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label>Meal plan</Label>
                        <Select
                          value={uiState.mealPlanFilter}
                          onValueChange={(v) => setUiState(prev => ({ ...prev, mealPlanFilter: v, currentPage: 1 }))}
                        >
                          <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                          <SelectContent className="z-50 bg-popover">
                            <SelectItem value="all">All meal plans</SelectItem>
                            <SelectItem value="standard">Standard Meal Plan</SelectItem>
                            <SelectItem value="vegan">Vegan Meal Plan</SelectItem>
                            <SelectItem value="none">No meal plan</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Arrival day</Label>
                        <Select
                          value={uiState.arrivalDayFilter}
                          onValueChange={(v) => setUiState(prev => ({ ...prev, arrivalDayFilter: v, currentPage: 1 }))}
                        >
                          <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                          <SelectContent className="z-50 bg-popover">
                            <SelectItem value="all">All arrival days</SelectItem>
                            <SelectItem value="early">Thursday (Early)</SelectItem>
                            <SelectItem value="standard">Friday (Standard)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Check-in status</Label>
                        <Select
                          value={uiState.checkInStatusFilter}
                          onValueChange={(v) => setUiState(prev => ({ ...prev, checkInStatusFilter: v, currentPage: 1 }))}
                        >
                          <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                          <SelectContent className="z-50 bg-popover">
                            <SelectItem value="all">All statuses</SelectItem>
                            <SelectItem value="checked_in">Checked in</SelectItem>
                            <SelectItem value="assigned">Assigned</SelectItem>
                            <SelectItem value="unassigned">Unassigned</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex items-center justify-between gap-3">
                        <Label htmlFor="mobile-unassigned">Unassigned only</Label>
                        <Switch
                          id="mobile-unassigned"
                          checked={uiState.showOnlyUnassigned}
                          onCheckedChange={(v) => setUiState(prev => ({ ...prev, showOnlyUnassigned: v, currentPage: 1 }))}
                        />
                      </div>

                      <div className="flex items-center justify-between gap-3">
                        <Label htmlFor="mobile-cancelled">Show cancelled registrants</Label>
                        <Switch
                          id="mobile-cancelled"
                          checked={uiState.showCancelledRegistrants}
                          onCheckedChange={(v) => setUiState(prev => ({ ...prev, showCancelledRegistrants: v, currentPage: 1 }))}
                        />
                      </div>

                      <Button
                        variant="outline"
                        className="w-full h-11"
                        onClick={() => setUiState(prev => ({
                          ...prev,
                          mealPlanFilter: 'all',
                          arrivalDayFilter: 'all',
                          checkInStatusFilter: 'all',
                          showOnlyUnassigned: false,
                          showCancelledRegistrants: false,
                          currentPage: 1
                        }))}
                      >
                        Clear all filters
                      </Button>
                    </div>
                  </SheetContent>
                </Sheet>
              </div>

              {/* Grouping */}
              <div className="grid grid-cols-3 gap-1 rounded-lg bg-muted p-1">
                {([
                  { value: 'individual', label: 'Individual' },
                  { value: 'group', label: 'By Order' },
                  { value: 'site-location', label: 'By Site' }
                ] as const).map(option => (
                  <Button
                    key={option.value}
                    variant={uiState.viewMode === option.value ? 'default' : 'ghost'}
                    size="sm"
                    className="h-10 text-xs"
                    onClick={() => setUiState(prev => ({ ...prev, viewMode: option.value, currentPage: 1 }))}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  className="h-11"
                  onClick={handleCsvExport}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>

                <Button
                  variant="outline"
                  className="h-11"
                  onClick={handleRegFoxSync}
                  disabled={operationState.syncing}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${operationState.syncing ? 'animate-spin' : ''}`} />
                  Sync
                </Button>

                <Button
                  variant="default"
                  className="h-11 col-span-2"
                  onClick={handleBulkActivation}
                  disabled={operationState.isActivating}
                >
                  <Zap className={`h-4 w-4 mr-2 ${operationState.isActivating ? 'animate-pulse' : ''}`} />
                  Activate all assigned bands
                </Button>
              </div>
            </div>

            {/* Progress Card */}
            <Card>
              <CardContent className="p-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Assignment Progress</span>
                    <span className="text-sm text-muted-foreground">{Math.round(progressData.progressPercent)}%</span>
                  </div>
                  <Progress value={progressData.progressPercent} className="h-2" />
                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs sm:text-sm text-muted-foreground">
                    <span>🟢 {progressData.checkedInCount} Checked In</span>
                    <span>🟡 {progressData.assignedCount} Assigned</span>
                    <span>🔴 {progressData.unassignedCount} Unassigned</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <p className="text-xs text-muted-foreground">
              {uiState.viewMode === 'individual'
                ? `Showing ${sortedAndPaginatedAttendees.length} of ${filteredAttendees.length} people`
                : `Showing ${filteredAttendees.length} people`}
            </p>

            {/* Attendee list / grouped views */}
            {uiState.viewMode === 'group' ? (
              <GroupRfidView
                attendees={filteredAttendees}
                onRefresh={loadAttendees}
                onOptimisticUpdate={handleOptimisticUpdate}
                searchTerm={uiState.searchTerm}
              />
            ) : uiState.viewMode === 'site-location' ? (
              <SiteLocationRfidView
                attendees={filteredAttendees}
                onRefresh={loadAttendees}
                onOptimisticUpdate={handleOptimisticUpdate}
                searchTerm={uiState.searchTerm}
              />
            ) : (
              <div className="space-y-3">
                {sortedAndPaginatedAttendees.length === 0 && (
                  <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">
                    No one matches these filters.
                  </CardContent></Card>
                )}
                {sortedAndPaginatedAttendees.map(attendee => (
                  <div key={attendee.id}>
                    <MobileRfidAssignmentCard
                      attendee={attendee}
                      onOptimisticUpdate={handleOptimisticUpdate}
                      onAssignmentComplete={loadAttendees}
                      onViewDetails={() => setSelectedAttendeeId(attendee.id)}
                    />
                  </div>
                ))}
              </div>
            )}


            {/* Pagination */}
            {uiState.viewMode === 'individual' && totalPages > 1 && (
              <div className="flex justify-between items-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setUiState(prev => ({ ...prev, currentPage: Math.max(1, prev.currentPage - 1) }))}
                  disabled={uiState.currentPage <= 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground">
                  Page {uiState.currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setUiState(prev => ({ ...prev, currentPage: Math.min(totalPages, prev.currentPage + 1) }))}
                  disabled={uiState.currentPage >= totalPages}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </RfidCaptureProvider>

        {/* Attendee Detail Modal */}
        {selectedAttendeeId && attendees.find(a => a.id === selectedAttendeeId) && (
          <AttendeeDetailModal
            attendee={attendees.find(a => a.id === selectedAttendeeId)!}
            allAttendees={attendees}
            open={!!selectedAttendeeId}
            onOpenChange={(open) => { if (!open) setSelectedAttendeeId(null); }}
          />
        )}
      </div>
    );
  }

  // Desktop view rendering would continue here...
  return (
    <div className="container mx-auto p-6">
      <RfidCaptureProvider enabled={uiState.hasRfidInputFocused}>
        <div className="space-y-6">
          <OfflineQueueBadge />
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold">Credential Assignment</h1>
            <Button 
              variant="outline" 
              onClick={() => setUiState(prev => ({ ...prev, showFAQ: !prev.showFAQ }))}
            >
              <HelpCircle className="h-4 w-4 mr-2" />
              {uiState.showFAQ ? 'Hide' : 'Show'} FAQ
            </Button>
          </div>

          {uiState.showFAQ && (
            <RfidAssignmentFAQ 
              isOpen={uiState.showFAQ}
              onClose={() => setUiState(prev => ({ ...prev, showFAQ: false }))} 
            />
          )}

          {/* Progress and Controls */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                Assignment Progress
                {operationState.isRealtimeConnected ? (
                  <Wifi className="h-4 w-4 text-green-500" />
                ) : (
                  <WifiOff className="h-4 w-4 text-red-500" />
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span>Total Progress</span>
                  <span className="font-medium">{Math.round(progressData.progressPercent)}%</span>
                </div>
                <Progress value={progressData.progressPercent} className="h-2" />
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 text-sm">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{progressData.checkedInCount}</div>
                    <div className="text-muted-foreground">Checked In</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-yellow-600">{progressData.assignedCount}</div>
                    <div className="text-muted-foreground">Assigned</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">{progressData.unassignedCount}</div>
                    <div className="text-muted-foreground">Unassigned</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">{progressData.totalCount}</div>
                    <div className="text-muted-foreground">Total</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Desktop Controls */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Search & Filter</CardTitle>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCsvExport}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export CSV
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRegFoxSync}
                    disabled={operationState.syncing}
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${operationState.syncing ? 'animate-spin' : ''}`} />
                    Sync RegFox
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleBulkActivation}
                    disabled={operationState.isActivating}
                  >
                    <Zap className={`h-4 w-4 mr-2 ${operationState.isActivating ? 'animate-pulse' : ''}`} />
                    Bulk Activate
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search attendees..."
                    value={uiState.searchTerm}
                    onChange={(e) => setUiState(prev => ({ ...prev, searchTerm: e.target.value }))}
                    className="pl-10"
                  />
                </div>
                <Select value={uiState.mealPlanFilter} onValueChange={(value) => setUiState(prev => ({ ...prev, mealPlanFilter: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Meal Plan" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Meal Plans</SelectItem>
                    <SelectItem value="standard">Standard Meal Plan</SelectItem>
                    <SelectItem value="vegan">Vegan Meal Plan</SelectItem>
                    <SelectItem value="none">No meal plan</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={uiState.arrivalDayFilter} onValueChange={(value) => setUiState(prev => ({ ...prev, arrivalDayFilter: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Arrival Day" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Days</SelectItem>
                    <SelectItem value="early">Thursday (Early)</SelectItem>
                    <SelectItem value="standard">Friday (Standard)</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={uiState.checkInStatusFilter} onValueChange={(value) => setUiState(prev => ({ ...prev, checkInStatusFilter: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Check-in Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="checked_in">Checked In</SelectItem>
                    <SelectItem value="assigned">Assigned</SelectItem>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button
                  variant={uiState.showOnlyUnassigned ? "default" : "outline"}
                  size="sm"
                  onClick={() => setUiState(prev => ({ ...prev, showOnlyUnassigned: !prev.showOnlyUnassigned }))}
                >
                  <Filter className="h-4 w-4 mr-2" />
                  Unassigned Only
                </Button>
                <Button
                  variant={uiState.showCancelledRegistrants ? "default" : "outline"}
                  size="sm"
                  onClick={() => setUiState(prev => ({ ...prev, showCancelledRegistrants: !prev.showCancelledRegistrants }))}
                >
                  Cancelled Registrants
                </Button>
                {uiState.searchTerm && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setUiState(prev => ({ ...prev, searchTerm: '' }))}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Clear Search
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Data Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex flex-wrap items-center justify-between gap-3">
                <span>Attendee Management</span>
                <div className="flex flex-wrap items-center gap-2 text-sm font-normal">
                  <span className="text-muted-foreground">
                    Showing {sortedAndPaginatedAttendees.length} of {filteredAttendees.length}
                  </span>
                  <Select
                    value={uiState.sortField}
                    onValueChange={(v) => setUiState(prev => ({ ...prev, sortField: v as typeof prev.sortField, currentPage: 1 }))}
                  >
                    <SelectTrigger className="h-10 w-[200px]" aria-label="Sort attendees by">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="name">Sort: Name</SelectItem>
                      <SelectItem value="phone">Sort: Phone</SelectItem>
                      <SelectItem value="order">Sort: Order ID</SelectItem>
                      <SelectItem value="meal_plan">Sort: Meal plan</SelectItem>
                      <SelectItem value="arrival_day">Sort: Arrival day</SelectItem>
                      <SelectItem value="waiver">Sort: Waiver</SelectItem>
                      <SelectItem value="check_in_status">Sort: Check-in status</SelectItem>
                      <SelectItem value="most_recent_activation">Sort: Recent activation</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-10"
                    onClick={() => handleSort(uiState.sortField)}
                    aria-label="Toggle sort direction"
                  >
                    {uiState.sortDirection === 'asc' ? 'A–Z ↑' : 'Z–A ↓'}
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table className="min-w-[600px] table-fixed [&_.badge-row>*]:whitespace-nowrap">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[32%] xl:w-[24%] cursor-pointer" onClick={() => handleSort('name')}>
                        <div className="flex items-center gap-2">Attendee {getSortIcon('name')}</div>
                      </TableHead>
                      <TableHead className="hidden xl:table-cell w-[16%]">Registration</TableHead>
                      <TableHead className="w-[24%] xl:w-[18%] cursor-pointer" onClick={() => handleSort('check_in_status')}>
                        <div className="flex items-center gap-2">Status {getSortIcon('check_in_status')}</div>
                      </TableHead>
                      <TableHead className="w-[44%] xl:w-[30%]">Wristband</TableHead>
                      <TableHead className="hidden xl:table-cell xl:w-[12%] text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedAndPaginatedAttendees.map((attendee) => {
                      const enhancedStatus = enhancedStatuses[attendee.id] || getCheckInStatus(attendee.rfid_uid, attendee.activated_at, attendee.rfid_status);
                      return (
                        <TableRow key={attendee.id} data-attendee-id={attendee.id} className="align-top">
                          <TableCell className="py-4">
                            <div className="font-semibold leading-snug">
                              {attendee.first_name} {attendee.last_name}
                            </div>
                            <div className="mt-1 space-y-0.5 text-sm text-muted-foreground">
                              {attendee.email && <div className="truncate" title={attendee.email}>{attendee.email}</div>}
                              <div>{attendee.phone ? formatPhoneNumber(attendee.phone) : 'No phone'}</div>
                              <div className="font-mono text-xs">Order {attendee.order_id || '—'}</div>
                            </div>
                            <div className="badge-row mt-2 xl:hidden">
                              <Badge variant="outline" className={getStatusClassName(attendee.registration_status)}>
                                {getStatusLabel(attendee.registration_status)}
                              </Badge>
                              <Badge variant={attendee.arrival_window === 'early' ? 'default' : 'outline'}>{attendee.arrival_day}</Badge>
                              <Badge variant="secondary">{attendee.formatted_meal_plan}</Badge>
                            </div>
                          </TableCell>
                          <TableCell className="hidden xl:table-cell py-4">
                            <div className="flex flex-col items-start gap-1.5">
                              <Badge variant="outline" className={getStatusClassName(attendee.registration_status)}>
                                {getStatusLabel(attendee.registration_status)}
                              </Badge>
                              <Badge variant={attendee.arrival_window === 'early' ? 'default' : 'outline'}>
                                {attendee.arrival_day}
                              </Badge>
                              <Badge variant="secondary">{attendee.formatted_meal_plan}</Badge>
                            </div>
                          </TableCell>
                          <TableCell className="py-4">
                            <div className="flex flex-col items-start gap-1.5">
                              <Badge variant={enhancedStatus.variant} className="whitespace-nowrap">
                                {enhancedStatus.icon} {enhancedStatus.label}
                              </Badge>
                              <Badge variant={attendee.waiver_signed ? 'default' : 'destructive'} className="whitespace-nowrap">
                                Waiver {attendee.waiver_signed ? 'signed' : 'not signed'}
                              </Badge>
                              <TShirtSummaryBadge
                                summary={attendee.tshirt_summary}
                                orders={attendee.tshirt_orders}
                                showDetails
                              />
                              {attendee.most_recent_activation_method && attendee.most_recent_activation_at ? (
                                <div className="text-xs text-muted-foreground">
                                  {attendee.most_recent_activation_method === 'staff_assisted' ? 'Staff assisted' : 'Self activated'}
                                  {' · '}
                                  {new Date(attendee.most_recent_activation_at).toLocaleString('en-US', {
                                    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true
                                  })}
                                </div>
                              ) : (
                                <div className="text-xs text-muted-foreground">Not activated</div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="py-4">
                            <EnhancedRfidAssignmentCell
                              attendeeId={attendee.id}
                              attendeeName={`${attendee.first_name} ${attendee.last_name}`}
                              currentRfidUid={attendee.rfid_uid}
                              currentRfidStatus={attendee.rfid_status}
                              onOptimisticUpdate={handleOptimisticUpdate}
                              onAssignmentComplete={() => {}}
                            />
                            <Button
                              variant="outline"
                              size="sm"
                              className="mt-2 min-h-11 xl:hidden"
                              onClick={() => setSelectedAttendeeId(attendee.id)}
                            >
                              Details
                            </Button>
                          </TableCell>
                          <TableCell className="hidden xl:table-cell py-4 text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              className="min-h-10"
                              onClick={() => setSelectedAttendeeId(attendee.id)}
                            >
                              Details
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Pagination */}
          {totalPages > 1 && (
            <Card>
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    Page {uiState.currentPage} of {totalPages} ({filteredAttendees.length} total attendees)
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setUiState(prev => ({ ...prev, currentPage: Math.max(1, prev.currentPage - 1) }))}
                      disabled={uiState.currentPage <= 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setUiState(prev => ({ ...prev, currentPage: Math.min(totalPages, prev.currentPage + 1) }))}
                      disabled={uiState.currentPage >= totalPages}
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </RfidCaptureProvider>

      {selectedAttendeeId && attendees.find(a => a.id === selectedAttendeeId) && (
        <AttendeeDetailModal
          attendee={attendees.find(a => a.id === selectedAttendeeId)!}
          allAttendees={attendees}
          open={!!selectedAttendeeId}
          onOpenChange={(open) => { if (!open) setSelectedAttendeeId(null); }}
        />
      )}
    </div>
  );
};