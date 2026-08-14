import { getCurrentEventId } from "@/lib/eventRuntime";
import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { getRfidStatusVariant, getRegistrationStatusVariant, getRegistrationStatusDisplayText } from "@/utils/statusUtils";
import { 
  ArrowLeft, 
  Shield, 
  UserMinus, 
  Activity, 
  Download,
  Users,
  Clock,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  UserCheck,
  CheckCircle2,
  Search,
  Zap
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { RfidScanner } from "@/components/RfidScanner";
import { UnifiedSearchFilter, QuickFilter } from "@/components/shared/UnifiedSearchFilter";
import { MobileAttendeeCard } from "@/components/shared/MobileAttendeeCard";
import { rfidLookupService } from "@/services/rfidLookupService";
import { enhancedActivationService, UnifiedSearchResult, EnhancedActivationService } from "@/services/enhancedActivationService";
import { StationTransactionService } from '@/services/stationTransactionService';
import { phoneActivationService } from '@/services/phoneActivationService';
import { HeadphonesStatusService } from '@/services/headphonesStatusService';
import { EquipmentStatusService } from '@/services/equipmentStatusService';
import { TShirtService } from '@/services/tshirtService';
import { UnifiedActivationPreview } from "@/components/UnifiedActivationPreview";
import { AttendeeDetailModal } from "@/components/AttendeeDetailModal";
import { useIsMobile } from "@/hooks/use-mobile";
import type { NotificationState } from "@/types/attendee";
import { StaffAssistanceNotifications } from "@/components/StaffAssistanceNotifications";
import { WaiverStatusPanel } from "@/components/WaiverStatusPanel";
import { ScrollToTop } from "@/components/ui/scroll-to-top";
import { formatStandardDateTime, formatWithRelativeTime } from "@/utils/dateTimeUtils";

// Enhanced attendee interface matching AttendeeManagementTab
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
  headphones_status?: 'checked_out' | 'checked_in' | 'never_used';
  headphones_duration?: number;
  golf_cart_status?: 'checked_out' | 'checked_in' | 'never_used';
  golf_cart_duration?: number;
  golf_cart_checkout_at?: string;
  walkie_talkie_status?: 'checked_out' | 'checked_in' | 'never_used';
  walkie_talkie_duration?: number;
  walkie_talkie_checkout_at?: string;
  fanny_pack_status?: 'checked_out' | 'checked_in' | 'never_used';
  fanny_pack_duration?: number;
  fanny_pack_checkout_at?: string;
  bar_hits?: number;
  arrival_day?: string;
  is_duplicate?: boolean;
  is_phone_duplicate?: boolean;
  meal_plan?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  group_size?: number;
  is_group_order?: boolean;
  is_veteran?: boolean;
  city?: string;
  state?: string;
  special_accommodations?: string;
  tshirt_orders?: Array<{
    id: string;
    style: string;
    size: string;
    quantity: number;
    isPickedUp: boolean;
    pickupTime?: string;
  }>;
  tshirt_summary?: {
    totalOrders: number;
    totalPickedUp: number;
    hasAnyTShirt: boolean;
  };
}

export interface TableColumn {
  key: string;
  label: string;
  mobile?: boolean;
  desktop?: boolean;
  width?: string;
  sortable?: boolean;
}

interface StaffStats {
  totalActive: number;
  todayDeactivations: number;
  todayActivations: number;
}

export interface AttendeeNotification {
  attendeeId: string;
  state: NotificationState;
  message: string;
  showNotification: boolean;
}

const DEACTIVATION_REASONS = [
  { value: "lost", label: "Lost credential" },
  { value: "damaged", label: "Damaged credential" },
  { value: "replaced", label: "Replaced with new credential" },
  { value: "checkout", label: "Event Checkout/Departure" },
  { value: "sunday_mass", label: "Sunday Mass Deactivation" },
  { value: "staff_request", label: "Staff Request" },
  { value: "security", label: "Security Issue" },
  { value: "other", label: "Other" },
];

export function StaffActivationHub() {
  const [staffCode, setStaffCode] = useState("");
  const [staffId, setStaffId] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [stats, setStats] = useState<StaffStats>({
    totalActive: 0,
    todayDeactivations: 0,
    todayActivations: 0
  });
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  
  // Enhanced attendee management state (from AttendeeManagementTab)
  const [attendees, setAttendees] = useState<EnhancedAttendee[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeQuickFilter, setActiveQuickFilter] = useState<string | null>(null);
  const [showCancelledRegistrants, setShowCancelledRegistrants] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<string>('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [visibleColumns] = useState<string[]>([
    'first_name', 'email', 'phone', 'order_id', 'ticket_type', 'registration_status', 'rfid_status', 'headphones', 'golf_carts', 'walkie_talkies', 'fanny_packs', 'tshirts', 'actions'
  ]);
  
  // Unified activation section state
  const [unifiedSearchQuery, setUnifiedSearchQuery] = useState("");
  const [unifiedSearchResult, setUnifiedSearchResult] = useState<UnifiedSearchResult | null>(null);
  const [showUnifiedPreview, setShowUnifiedPreview] = useState(false);
  const [isUnifiedProcessing, setIsUnifiedProcessing] = useState(false);
  const [isUnifiedSearching, setIsUnifiedSearching] = useState(false);
  const [attendeeNotifications, setAttendeeNotifications] = useState<AttendeeNotification[]>([]);
  
  // Deactivation section state
  const [isDeactivationOpen, setIsDeactivationOpen] = useState(false);
  const [selectedReason, setSelectedReason] = useState("other");
  const [customReason, setCustomReason] = useState("");
  const [manualRfid, setManualRfid] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [deactivationActivity, setDeactivationActivity] = useState<any[]>([]);
  
  // Attendee detail modal state
  const [selectedAttendee, setSelectedAttendee] = useState<EnhancedAttendee | null>(null);
  
  const navigate = useNavigate();
  
  const isMobile = useIsMobile();

  // Table columns configuration for staff use
  const allColumns: TableColumn[] = [
    { key: 'first_name', label: 'Name', mobile: true, desktop: true, width: 'min-w-32', sortable: true },
    { key: 'email', label: 'Email', mobile: true, desktop: true, width: 'min-w-48', sortable: true },
    { key: 'phone', label: 'Phone', desktop: true, width: 'min-w-32', sortable: true },
    { key: 'order_id', label: 'Order ID', mobile: true, desktop: true, width: 'min-w-32', sortable: true },
    { key: 'ticket_type', label: 'Ticket Type', desktop: true, width: 'min-w-24', sortable: true },
    { key: 'registration_status', label: 'Registration Status', mobile: true, desktop: true, width: 'min-w-28', sortable: true },
    { key: 'rfid_status', label: 'Credential Status', mobile: true, desktop: true, width: 'min-w-24', sortable: true },
    { key: 'headphones', label: 'Headphones', mobile: true, desktop: true, width: 'min-w-28', sortable: true },
    { key: 'golf_carts', label: 'Golf Carts', desktop: true, width: 'min-w-28', sortable: true },
    { key: 'walkie_talkies', label: 'Walkie Talkies', desktop: true, width: 'min-w-32', sortable: true },
    { key: 'fanny_packs', label: 'Fanny Packs', desktop: true, width: 'min-w-28', sortable: true },
    { key: 'tshirts', label: 'T-Shirts', mobile: true, desktop: true, width: 'min-w-24', sortable: true },
    { key: 'actions', label: 'Actions', mobile: true, desktop: true, width: 'min-w-32', sortable: false }
  ];

  useEffect(() => {
    if (isAuthenticated) {
      fetchAttendees();
      loadDashboardData();
      // Refresh data every 30 seconds
      const interval = setInterval(() => {
        fetchAttendees();
        loadDashboardData();
      }, 30000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated, showCancelledRegistrants]);

  // Enhanced attendee data fetching (from AttendeeManagementTab)
  const fetchAttendees = async () => {
    try {
      setIsLoading(true);
      
      let query = supabase
        .from('attendees')
        .select('*')
        .eq('event_id', getCurrentEventId())
        .order('created_at', { ascending: false });

      // Staff Hub shows ALL registration statuses for complete oversight
      // No filtering by registration_status - staff needs to see everything

      const { data: attendeesData, error: attendeesError } = await query;

      if (attendeesError) throw attendeesError;

      const { data: rfidData, error: rfidError } = await supabase
        .from('rfid_tags')
        .select('*')
        .eq('event_id', getCurrentEventId());

      if (rfidError) throw rfidError;

      const { data: transactionData, error: transactionError } = await supabase
        .from('station_transactions')
        .select('*')
        .eq('event_id', getCurrentEventId());

      if (transactionError) throw transactionError;

      // Calculate group sizes for order IDs
      const orderSizes = new Map<string, number>();
      attendeesData?.forEach(attendee => {
        if (attendee.order_id && attendee.order_id.trim()) {
          orderSizes.set(attendee.order_id, (orderSizes.get(attendee.order_id) || 0) + 1);
        }
      });

      const processedAttendees = await Promise.all((attendeesData || []).map(async (attendee) => {
        const rfidTag = rfidData?.find(tag => tag.attendee_id === attendee.id);
        const transactions = transactionData?.filter(t => t.attendee_id === attendee.id) || [];
        
        // Get latest headphones transaction to determine current status
        const headphonesTransactions = transactions
          .filter(t => t.station_type === 'headphones' && 
                      ['headphone_checkout', 'headphone_checkin'].includes(t.transaction_type))
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        
        const latestHeadphonesTransaction = headphonesTransactions[0];
        const has_headphones = latestHeadphonesTransaction?.transaction_type === 'headphone_checkout';
        
        let headphones_status: 'checked_out' | 'checked_in' | 'never_used' = 'never_used';
        let headphones_duration: number | undefined;
        
        if (latestHeadphonesTransaction) {
          if (latestHeadphonesTransaction.transaction_type === 'headphone_checkout') {
            headphones_status = 'checked_out';
            headphones_duration = Math.floor((Date.now() - new Date(latestHeadphonesTransaction.created_at).getTime()) / (1000 * 60));
          } else {
            headphones_status = 'checked_in';
          }
        }

        // Get latest golf cart transaction to determine current status
        const golfCartTransactions = transactions
          .filter(t => t.station_type === 'golf_carts' && 
                      ['golf_cart_checkout', 'golf_cart_checkin'].includes(t.transaction_type))
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        
        const latestGolfCartTransaction = golfCartTransactions[0];
        let golf_cart_status: 'checked_out' | 'checked_in' | 'never_used' = 'never_used';
        let golf_cart_duration: number | undefined;
        let golf_cart_checkout_at: string | undefined;
        
        if (latestGolfCartTransaction) {
          if (latestGolfCartTransaction.transaction_type === 'golf_cart_checkout') {
            golf_cart_status = 'checked_out';
            golf_cart_duration = Math.floor((Date.now() - new Date(latestGolfCartTransaction.created_at).getTime()) / (1000 * 60));
            golf_cart_checkout_at = latestGolfCartTransaction.created_at;
          } else {
            golf_cart_status = 'checked_in';
          }
        }

        // Get latest walkie talkie transaction to determine current status
        const walkieTalkieTransactions = transactions
          .filter(t => t.station_type === 'walkie_talkies' && 
                      ['walkie_talkie_checkout', 'walkie_talkie_checkin'].includes(t.transaction_type))
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        
        const latestWalkieTalkieTransaction = walkieTalkieTransactions[0];
        let walkie_talkie_status: 'checked_out' | 'checked_in' | 'never_used' = 'never_used';
        let walkie_talkie_duration: number | undefined;
        let walkie_talkie_checkout_at: string | undefined;
        
        if (latestWalkieTalkieTransaction) {
          if (latestWalkieTalkieTransaction.transaction_type === 'walkie_talkie_checkout') {
            walkie_talkie_status = 'checked_out';
            walkie_talkie_duration = Math.floor((Date.now() - new Date(latestWalkieTalkieTransaction.created_at).getTime()) / (1000 * 60));
            walkie_talkie_checkout_at = latestWalkieTalkieTransaction.created_at;
          } else {
            walkie_talkie_status = 'checked_in';
          }
        }

        // Get latest fanny pack transaction to determine current status
        const fannyPackTransactions = transactions
          .filter(t => t.station_type === 'fanny_packs' && 
                      ['fanny_pack_checkout', 'fanny_pack_checkin'].includes(t.transaction_type))
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        
        const latestFannyPackTransaction = fannyPackTransactions[0];
        let fanny_pack_status: 'checked_out' | 'checked_in' | 'never_used' = 'never_used';
        let fanny_pack_duration: number | undefined;
        let fanny_pack_checkout_at: string | undefined;
        
        if (latestFannyPackTransaction) {
          if (latestFannyPackTransaction.transaction_type === 'fanny_pack_checkout') {
            fanny_pack_status = 'checked_out';
            fanny_pack_duration = Math.floor((Date.now() - new Date(latestFannyPackTransaction.created_at).getTime()) / (1000 * 60));
            fanny_pack_checkout_at = latestFannyPackTransaction.created_at;
          } else {
            fanny_pack_status = 'checked_in';
          }
        }
        
        const bar_hits = transactions.filter(t => 
          t.station_type === 'drinks' && t.transaction_type === 'drink'
        ).length;

        // Get enhanced t-shirt information with all orders
        const tshirtData = await TShirtService.checkAttendeeHasTShirt(attendee.id);
        const tshirtOrders = tshirtData.orders || [];
        const tshirtSummary = {
          totalOrders: tshirtOrders.reduce((sum, order) => sum + order.quantity, 0), // Total items, not just order groups
          totalPickedUp: tshirtOrders.filter(order => order.isPickedUp).reduce((sum, order) => sum + order.quantity, 0), // Total picked up items
          hasAnyTShirt: tshirtOrders.length > 0
        };

        const rfid_status = rfidTag?.status || 'unissued';
        const arrival_day = attendee.arrival_window === 'early' ? 'Thursday' : 'Friday';

        const duplicateEmails = attendeesData?.filter(a => 
          a.email && a.email === attendee.email && a.id !== attendee.id
        ) || [];
        const is_duplicate = duplicateEmails.length > 0;

        const duplicatePhones = attendeesData?.filter(a => 
          a.phone && a.phone === attendee.phone && a.id !== attendee.id
        ) || [];
        const is_phone_duplicate = duplicatePhones.length > 0;

        const calculatedGroupSize = attendee.order_id ? (orderSizes.get(attendee.order_id) || 1) : 1;
        const group_size = Number.isFinite(calculatedGroupSize) ? calculatedGroupSize : 1;
        const is_group_order = group_size > 1;

        return {
          ...attendee,
          rfid_uid: rfidTag?.uid || undefined,
          rfid_status,
          has_headphones,
          headphones_status,
          headphones_duration,
          golf_cart_status,
          golf_cart_duration,
          golf_cart_checkout_at,
          walkie_talkie_status,
          walkie_talkie_duration,
          walkie_talkie_checkout_at,
          fanny_pack_status,
          fanny_pack_duration,
          fanny_pack_checkout_at,
          bar_hits,
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
          is_group_order,
          is_veteran: attendee.is_veteran ?? false,
          city: attendee.city || undefined,
          state: attendee.state || undefined,
          special_accommodations: attendee.special_accommodations || undefined,
          tshirt_orders: tshirtOrders,
          tshirt_summary: tshirtSummary
        } as EnhancedAttendee;
      }));

      setAttendees(processedAttendees);

    } catch (error) {
      console.error("Error fetching attendees:", error);
      toast.error("Failed to fetch attendees data");
    } finally {
      setIsLoading(false);
    }
  };

  const loadDashboardData = async () => {
    try {
      const recentActivityData = await rfidLookupService.getRecentStaffActivity(20);

      // Calculate today's stats
      const today = new Date().toDateString();
      const todayActivity = recentActivityData.filter(
        activity => new Date(activity.created_at).toDateString() === today
      );

      const todayDeactivations = todayActivity.filter(a => a.transaction_type === 'deactivate').length;
      const todayActivations = todayActivity.filter(a => a.transaction_type === 'activate').length;
      
      // Get total active from attendees data
      const totalActive = attendees.filter(a => !!a.activated_at).length;

      setStats({
        totalActive,
        todayDeactivations,
        todayActivations
      });

      setRecentActivity(recentActivityData);
      
      // Load deactivation-specific activity
      const deactivationData = recentActivityData.filter(a => a.transaction_type === 'deactivate').slice(0, 10);
      setDeactivationActivity(deactivationData);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    }
  };

  // Real-time subscription setup
  useEffect(() => {
    if (!isAuthenticated) return;

    const channel = supabase
      .channel('staff-hub-changes')
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
  }, [isAuthenticated]);

  // Quick filters for staff use
  const quickFilters: QuickFilter[] = useMemo(() => {
    const totalCount = attendees.length;
    const activatedCount = attendees.filter(a => a.activated_at).length;
    const assignedCount = attendees.filter(a => a.rfid_status === 'assigned' || a.rfid_status === 'active').length;
    const unassignedCount = attendees.filter(a => a.rfid_status === 'unissued').length;
    const veteransCount = attendees.filter(a => a.is_veteran).length;
    const waiverMissingCount = attendees.filter(a => !a.waiver_signed).length;

    return [
      { key: "all", label: "All Attendees", count: totalCount },
      { key: "activated", label: "Activated", count: activatedCount },
      { key: "assigned", label: "Assigned", count: assignedCount },
      { key: "unassigned", label: "Needs credential", count: unassignedCount },
      { key: "waiver_missing", label: "Waiver Missing", count: waiverMissingCount },
      { key: "veterans", label: "Veterans Only", count: veteransCount }
    ];
  }, [attendees]);

  // Filter and sort processed attendees
  const processedAttendees = useMemo(() => {
    let filtered = [...attendees];
    
    // Apply quick filter
    if (activeQuickFilter && activeQuickFilter !== 'all') {
      switch (activeQuickFilter) {
        case 'activated': filtered = filtered.filter(a => a.activated_at); break;
        case 'assigned': filtered = filtered.filter(a => a.rfid_status === 'assigned' || a.rfid_status === 'active'); break;
        case 'unassigned': filtered = filtered.filter(a => a.rfid_status === 'unissued'); break;
        case 'waiver_missing': filtered = filtered.filter(a => !a.waiver_signed); break;
        case 'veterans': filtered = filtered.filter(a => a.is_veteran); break;
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
    
    // Apply sorting
    if (sortField) {
      filtered.sort((a, b) => {
        const aVal = a[sortField as keyof EnhancedAttendee];
        const bVal = b[sortField as keyof EnhancedAttendee];
        
        // Handle null/undefined values
        if (aVal == null && bVal == null) return 0;
        if (aVal == null) return sortDirection === 'asc' ? -1 : 1;
        if (bVal == null) return sortDirection === 'asc' ? 1 : -1;
        
        // Handle different data types
        if (typeof aVal === 'string' && typeof bVal === 'string') {
          const result = aVal.toLowerCase().localeCompare(bVal.toLowerCase());
          return sortDirection === 'asc' ? result : -result;
        }
        
        if (typeof aVal === 'number' && typeof bVal === 'number') {
          const result = aVal - bVal;
          return sortDirection === 'asc' ? result : -result;
        }
        
        // Handle date strings
        const aDate = new Date(String(aVal));
        const bDate = new Date(String(bVal));
        if (!isNaN(aDate.getTime()) && !isNaN(bDate.getTime())) {
          const result = aDate.getTime() - bDate.getTime();
          return sortDirection === 'asc' ? result : -result;
        }
        
        // Fallback to string comparison
        const result = String(aVal).toLowerCase().localeCompare(String(bVal).toLowerCase());
        return sortDirection === 'asc' ? result : -result;
      });
    }
    
    return filtered;
  }, [attendees, searchTerm, activeQuickFilter, sortField, sortDirection]);

  const handleSort = (field: keyof EnhancedAttendee) => {
    setSortField(field);
    setSortDirection(sortField === field ? (sortDirection === 'asc' ? 'desc' : 'asc') : 'asc');
  };

  // Refresh unified search results after activation
  const refreshUnifiedSearchResults = async () => {
    if (unifiedSearchQuery && unifiedSearchQuery.trim()) {
      try {
        setIsUnifiedSearching(true);
        const result = await EnhancedActivationService.unifiedSearch(unifiedSearchQuery.trim());
        setUnifiedSearchResult(result);
      } catch (error) {
        console.error('Error refreshing search results:', error);
      } finally {
        setIsUnifiedSearching(false);
      }
    }
  };

  // Enhanced activation handlers with edge case functions
  const handleIndividualActivation = async (attendeeId: string) => {
    try {
      const attendee = attendees.find(a => a.id === attendeeId);
      if (!attendee) return;

      if (!attendee.rfid_uid) {
        toast.error("Attendee needs an credential assigned first");
        return;
      }

      const result = await EnhancedActivationService.activateIndividual(attendeeId, staffId || undefined);
      
      if (result.success) {
        toast.success(`${attendee.first_name} ${attendee.last_name} has been activated`);
        fetchAttendees(); // Refresh data
        loadDashboardData();
        // Also refresh unified search results if we're in that view
        if (showUnifiedPreview) {
          await refreshUnifiedSearchResults();
        }
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      console.error('Individual activation error:', error);
      toast.error("Failed to activate attendee");
    }
  };

  // New function for activating remaining attendees by phone
  const handleActivateRemainingByPhone = async (phoneNumber: string) => {
    try {
      setIsUnifiedProcessing(true);
      
      // Use the phone activation service
      const { data, error } = await supabase.rpc('activate_remaining_rfids_by_phone', {
        p_phone: phoneNumber,
        p_activation_method: 'staff_remaining'
      });

      if (error) throw error;

      const result = data[0];
      // Provide contextual messaging based on activation results
      if (result && result.activated_count > 0) {
        toast.success(`Activated ${result.activated_count} additional attendees${
          result.warnings && result.warnings.length > 0 ? `. ${result.warnings.length} warnings.` : ''
        }`);
      } else if (result && result.warnings && result.warnings.length > 0) {
        toast.error("Remaining attendees need credentials assigned before activation");
      } else {
        toast.info("All attendees with this phone number are already activated");
      }

      fetchAttendees();
      loadDashboardData();
      // Also refresh unified search results if we're in that view
      if (showUnifiedPreview) {
        await refreshUnifiedSearchResults();
      }
    } catch (error) {
      console.error('Remaining activation error:', error);
      toast.error("Failed to activate remaining attendees");
    } finally {
      setIsUnifiedProcessing(false);
    }
  };

  const handleGroupActivation = async (orderAttendees: EnhancedAttendee[]) => {
    try {
      const activatableAttendees = orderAttendees.filter(a => a.rfid_uid && !a.activated_at);
      
      if (activatableAttendees.length === 0) {
        toast.info("All attendees in this group are already activated or missing credentials");
        return;
      }

      let successCount = 0;
      let failureCount = 0;

      for (const attendee of activatableAttendees) {
        try {
          const result = await rfidLookupService.activateRfid(attendee.rfid_uid!, staffId || undefined);
          if (result.success) {
            successCount++;
          } else {
            failureCount++;
          }
        } catch {
          failureCount++;
        }
      }

      if (failureCount === 0) {
        toast.success(`Activated ${successCount} attendees`);
      } else {
        toast.warning(`Activated ${successCount} attendees, ${failureCount} failed`);
      }
      
      fetchAttendees(); // Refresh data
      loadDashboardData();
      // Also refresh unified search results if we're in that view
      if (showUnifiedPreview) {
        await refreshUnifiedSearchResults();
      }
    } catch (error) {
      console.error('Group activation error:', error);
      toast.error("Failed to activate group");
    }
  };

  const handleStaffLogin = async () => {
    try {
      const { data, error } = await supabase.rpc('authenticate_staff_code', {
        p_code: staffCode.toLowerCase()
      });

      if (error) throw error;

      if (data && data.length > 0) {
        const staffInfo = data[0];
        setIsAuthenticated(true);
        setStaffId(staffInfo.staff_id);
        toast.success(`Welcome, ${staffInfo.display_name} - You now have access to event management tools`);
      } else {
        toast.error("Please enter a valid staff code");
      }
    } catch (error) {
      console.error('Authentication error:', error);
      toast.error("Authentication failed");
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setStaffId(null);
    setStaffCode("");
  };

  // Deactivation functions
  const getReasonText = () => {
    if (selectedReason === "other") {
      return customReason.trim() || "Other reason";
    }
    return DEACTIVATION_REASONS.find(r => r.value === selectedReason)?.label || "Other reason";
  };

  const handleRfidScan = async (rfidData: any) => {
    await deactivateSingleRfid(rfidData.uid);
  };

  const deactivateSingleRfid = async (uid: string) => {
    setIsProcessing(true);
    try {
      const reason = getReasonText();
      const result = await rfidLookupService.deactivateRfid(uid, reason, staffId || undefined);
      
      if (result.success) {
        const attendee = await rfidLookupService.getRfidWithAttendee(uid);
        toast.success(attendee ? 
          `${attendee.first_name} ${attendee.last_name} deactivated` :
          "Credential deactivated successfully");
        loadDashboardData();
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error("Failed to deactivate credential");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleManualDeactivation = async () => {
    if (!manualRfid.trim()) return;
    await deactivateSingleRfid(manualRfid.trim());
    setManualRfid("");
  };

  // Unified activation handlers
  const handleUnifiedSearch = async () => {
    if (!unifiedSearchQuery.trim()) return;
    
    setIsUnifiedSearching(true);
    setAttendeeNotifications([]); // Clear previous notifications
    try {
      const result = await EnhancedActivationService.unifiedSearch(unifiedSearchQuery);
      
      if (result) {
        setUnifiedSearchResult(result);
        setShowUnifiedPreview(true);
      } else {
        toast.error("No attendees found for this search query");
      }
    } catch (error) {
      console.error('Unified search error:', error);
      toast.error("Failed to search attendees");
    } finally {
      setIsUnifiedSearching(false);
    }
  };

  const handleUnifiedActivateSearchGroup = async (notifications: AttendeeNotification[] = []) => {
    if (!unifiedSearchResult) return;

    setIsUnifiedProcessing(true);
    
    // Set processing state for all attendees
    const allAttendees = [
      ...(unifiedSearchResult.attendee_details || []),
      ...(unifiedSearchResult.order_companions || [])
    ];
    
    const processingNotifications: AttendeeNotification[] = allAttendees.map(attendee => ({
      attendeeId: attendee.id,
      state: 'processing' as NotificationState,
      message: 'Activating...',
      showNotification: true
    }));
    
    setAttendeeNotifications(processingNotifications);
    
    try {
      const result = await EnhancedActivationService.activateSearchGroup(
        unifiedSearchResult,
        staffId || undefined
      );

      // Create per-attendee notifications based on results
      const resultNotifications: AttendeeNotification[] = [];
      
      // Process successful activations
      if (result.activated_count > 0) {
        // Enhanced notifications with veteran recognition
        result.attendee_details?.forEach(attendee => {
          if (attendee.can_use_services && !attendee.was_already_active) {
            const message = attendee.is_veteran && attendee.veteran_thanked_at 
              ? '✅ Activated - Thank you for your service! 🇺🇸'
              : '✅ Activated successfully';
              
            resultNotifications.push({
              attendeeId: attendee.id || attendee.name,
              state: 'success',
              message,
              showNotification: true
            });
          } else if (attendee.was_already_active) {
            resultNotifications.push({
              attendeeId: attendee.id || attendee.name,
              state: 'warning',
              message: '⚠️ Already activated',
              showNotification: true
            });
          } else if (!attendee.has_rfid) {
            resultNotifications.push({
              attendeeId: attendee.id || attendee.name,
              state: 'error',
              message: '❌ credential required for activation',
              showNotification: true
            });
          }
        });
      }
      
      // Process warnings/errors  
      if (result.warnings && result.warnings.length > 0) {
        const remainingAttendees = allAttendees.slice(result.activated_count);
        remainingAttendees.forEach(attendee => {
          if (!attendee.rfid_uid) {
            resultNotifications.push({
              attendeeId: attendee.id,
              state: 'error',
              message: '❌ credential required for activation',
              showNotification: true
            });
          } else if (attendee.is_activated) {
            resultNotifications.push({
              attendeeId: attendee.id,
              state: 'warning',
              message: '⚠️ Already activated',
              showNotification: true
            });
          }
        });
      }
      
      setAttendeeNotifications(resultNotifications);

      // Only show summary toast for major issues or complete success with veteran recognition
      if (result.activated_count === allAttendees.length) {
        const veteranCount = result.attendee_details?.filter(a => a.is_veteran && a.veteran_thanked_at).length || 0;
        const baseMessage = `Successfully activated all ${result.activated_count} attendees`;
        const veteranMessage = veteranCount > 0 ? `! Thank you for your service to our ${veteranCount} veteran${veteranCount > 1 ? 's' : ''}!` : '';
        toast.success(baseMessage + veteranMessage);
      } else if (result.activated_count === 0 && result.warnings && result.warnings.length > 0) {
        toast.info("Check individual attendee cards for specific activation issues");
      } else if (result.activated_count > 0) {
        const veteranCount = result.attendee_details?.filter(a => a.is_veteran && a.veteran_thanked_at && a.can_use_services && !a.was_already_active).length || 0;
        const baseMessage = `Successfully activated ${result.activated_count} of ${allAttendees.length} attendees`;
        const veteranMessage = veteranCount > 0 ? `! Thank you for your service to our ${veteranCount} veteran${veteranCount > 1 ? 's' : ''}!` : '';
        toast.success(baseMessage + veteranMessage);
      }

      // Refresh data
      fetchAttendees();
      loadDashboardData();
      // Also refresh unified search results
      await refreshUnifiedSearchResults();
    } catch (error) {
      console.error('Group activation error:', error);
      
      // Set error state for all attendees
      const errorNotifications: AttendeeNotification[] = allAttendees.map(attendee => ({
        attendeeId: attendee.id,
        state: 'error' as NotificationState,
        message: '❌ Activation failed - system error',
        showNotification: true
      }));
      
      setAttendeeNotifications(errorNotifications);
      
      toast.error("Failed to activate group");
    } finally {
      setIsUnifiedProcessing(false);
    }
  };

  const handleUnifiedActivateEntireOrder = async () => {
    if (!unifiedSearchResult) return;

    setIsUnifiedProcessing(true);
    try {
      const result = await EnhancedActivationService.activateEntireOrder(
        unifiedSearchResult,
        staffId || undefined
      );

      // Provide contextual messaging based on activation results
      if (result.activated_count === 0 && result.warnings && result.warnings.length > 0) {
        toast.error("No attendees could be activated - credentials must be assigned first");
      } else if (result.activated_count === 0) {
        toast.info("All order members are already activated");
      } else if (result.activated_count < result.total_attendees) {
        toast.warning(`Activated ${result.activated_count} of ${result.total_attendees} attendees${
          result.warnings && result.warnings.length > 0 ? `. ${result.warnings.length} need credential assignment.` : ''
        }`);
      } else {
        toast.success(`Successfully activated all ${result.activated_count} order members`);
      }

      // Reset unified search state
      setShowUnifiedPreview(false);
      setUnifiedSearchQuery("");
      setUnifiedSearchResult(null);

      // Refresh data
      fetchAttendees();
      loadDashboardData();
      // Also refresh unified search results  
      await refreshUnifiedSearchResults();
    } catch (error) {
      console.error('Order activation error:', error);
      toast.error("Failed to activate entire order");
    } finally {
      setIsUnifiedProcessing(false);
    }
  };

  const handleUnifiedBack = () => {
    setShowUnifiedPreview(false);
    setUnifiedSearchResult(null);
    setAttendeeNotifications([]);
  };

  const exportActivity = () => {
    const csvContent = [
      ['Time', 'Name', 'Action', 'RFID', 'Reason'].join(','),
      ...recentActivity.map(activity => [
        new Date(activity.created_at).toLocaleString(),
        `"${(activity.attendee as any)?.first_name} ${(activity.attendee as any)?.last_name}"`,
        activity.transaction_type,
        activity.rfid_uid,
        activity.extra_data?.reason || ''
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `staff-activity-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-md mx-auto mt-20">
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="flex items-center justify-center gap-2">
                <Shield className="h-6 w-6" />
                Staff Access Required
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="staff-code">Staff Code</Label>
                <Input
                  id="staff-code"
                  type="password"
                  value={staffCode}
                  onChange={(e) => setStaffCode(e.target.value)}
                  placeholder="Enter staff access code..."
                  onKeyPress={(e) => e.key === 'Enter' && handleStaffLogin()}
                />
              </div>
              
              <Button 
                onClick={handleStaffLogin}
                disabled={!staffCode.trim()}
                className="w-full"
              >
                Access Staff Tools
              </Button>
              
              <div className="text-center">
                <Button 
                  variant="outline"
                  onClick={() => navigate("/")}
                  className="flex items-center gap-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to Main Hub
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button 
              variant="outline" 
              onClick={() => navigate("/")}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Main Hub
            </Button>
            <h1 className="text-2xl font-bold">Staff Hub</h1>
            <Badge variant="outline" className="flex items-center gap-1">
              <Shield className="h-3 w-3" />
              Staff: {staffId}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={exportActivity}>
              <Download className="h-4 w-4 mr-2" />
              Export Activity
            </Button>
            <Button variant="outline" onClick={handleLogout}>
              Logout
            </Button>
          </div>
        </div>

        {/* Staff Assistance Queue */}
        <StaffAssistanceNotifications />

        {/* Waiver completion queue */}
        <WaiverStatusPanel
          onFilterUnsigned={() => {
            setActiveQuickFilter('waiver_missing');
            document.getElementById('individual-search')?.scrollIntoView({ behavior: 'smooth' });
          }}
        />

        {/* Unified Multi-Criteria Activation Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Smart Activation Search
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!showUnifiedPreview ? (
              <div className="space-y-4">
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Input
                      placeholder="Search by name, email, phone, or order ID to activate..."
                      value={unifiedSearchQuery}
                      onChange={(e) => setUnifiedSearchQuery(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleUnifiedSearch()}
                      disabled={isUnifiedSearching}
                      className="h-12 text-base"
                    />
                  </div>
                  <Button
                    onClick={handleUnifiedSearch}
                    disabled={!unifiedSearchQuery.trim() || isUnifiedSearching}
                    size="lg"
                    className="h-12 px-6"
                  >
                    {isUnifiedSearching ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    ) : (
                      <><Search className="h-4 w-4 mr-2" />Search</>
                    )}
                  </Button>
                </div>
                
                <div className="text-sm text-muted-foreground">
                  <p className="flex items-center gap-2 mb-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    Automatically detects search type and shows group context for activation
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                    <div className="flex items-center gap-1">
                      <Badge variant="outline" className="text-xs">📞</Badge>
                      Phone numbers
                    </div>
                    <div className="flex items-center gap-1">
                      <Badge variant="outline" className="text-xs">📧</Badge>
                      Email addresses
                    </div>
                    <div className="flex items-center gap-1">
                      <Badge variant="outline" className="text-xs">#</Badge>
                      Order IDs
                    </div>
                    <div className="flex items-center gap-1">
                      <Badge variant="outline" className="text-xs">👤</Badge>
                      Names
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              unifiedSearchResult && (
                <UnifiedActivationPreview
                  searchQuery={unifiedSearchQuery}
                  searchResult={unifiedSearchResult}
                  isProcessing={isUnifiedProcessing}
                  onActivateSearchGroup={handleUnifiedActivateSearchGroup}
                  onActivateEntireOrder={handleUnifiedActivateEntireOrder}
                  onBack={handleUnifiedBack}
                  onRefreshResults={refreshUnifiedSearchResults}
                  attendeeNotifications={attendeeNotifications}
                />
              )
            )}
          </CardContent>
        </Card>

        {/* Individual Search & Management */}
        <Card id="individual-search">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5" />
              Individual Search & Management
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <UnifiedSearchFilter
              searchValue={searchTerm}
              onSearchChange={setSearchTerm}
              quickFilters={quickFilters}
              activeQuickFilters={[activeQuickFilter]}
              onQuickFilterChange={(filterKey, active) => {
                setActiveQuickFilter(active ? filterKey : "all");
              }}
              placeholder="Search attendees for detailed management..."
            />

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Switch
                  id="show-cancelled-staff"
                  checked={showCancelledRegistrants}
                  onCheckedChange={setShowCancelledRegistrants}
                />
                <Label htmlFor="show-cancelled-staff" className="text-sm">
                  Show cancelled registrants
                </Label>
              </div>
            </div>

            {/* Enhanced Search Results */}
            {processedAttendees.length > 0 ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    Found {processedAttendees.length} attendee{processedAttendees.length !== 1 ? 's' : ''}
                  </p>
                </div>
                
                {/* Mobile and Desktop Attendee Display */}
                {isMobile ? (
                  <ScrollArea className="max-h-96">
                    <div className="space-y-3">
                      {processedAttendees.map((attendee) => (
                        <Card key={attendee.id} className="transition-all duration-200 hover:shadow-md">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="font-medium">
                                    {attendee.first_name} {attendee.last_name}
                                  </span>
                                </div>
                                
                                 <div className="space-y-1 text-sm text-muted-foreground">
                                   <p>{attendee.email}</p>
                                   <p>{attendee.ticket_type}</p>
                                   <div className="flex items-center gap-2 flex-wrap">
                                     <Badge variant={getRegistrationStatusVariant(attendee.registration_status)} className="text-xs">
                                       {getRegistrationStatusDisplayText(attendee.registration_status)}
                                     </Badge>
                                     {(() => {
                                       if (attendee.headphones_status === 'checked_out') {
                                         const duration = attendee.headphones_duration || 0;
                                         const isLong = duration > 180;
                                         return (
                                           <Badge 
                                             variant={isLong ? "destructive" : "secondary"}
                                             className="text-xs"
                                           >
                                             Headphones ({HeadphonesStatusService.formatCheckoutDuration(duration)})
                                           </Badge>
                                         );
                                       }
                                       if (attendee.headphones_status === 'checked_in') {
                                         return <Badge variant="outline" className="text-xs">Headphones Available</Badge>;
                                       }
                                       if (attendee.headphones_status === 'never_used') {
                                         return <Badge variant="outline" className="text-xs text-muted-foreground">No Headphone Use</Badge>;
                                       }
                                       return null;
                                      })()}
                                      {/* Golf Cart Status */}
                                      {(() => {
                                        if (attendee.golf_cart_status === 'checked_out') {
                                          const duration = attendee.golf_cart_duration || 0;
                                          const isLong = duration > 480; // 8 hours
                                          return (
                                            <Badge 
                                              variant={isLong ? "destructive" : "secondary"}
                                              className="text-xs"
                                            >
                                              Golf Cart ({EquipmentStatusService.formatUsageTime(duration)})
                                            </Badge>
                                          );
                                        }
                                        if (attendee.golf_cart_status === 'checked_in') {
                                          return <Badge variant="outline" className="text-xs">Golf Cart Available</Badge>;
                                        }
                                        return null;
                                      })()}
                                      {/* Walkie Talkie Status */}
                                      {(() => {
                                        if (attendee.walkie_talkie_status === 'checked_out') {
                                          const duration = attendee.walkie_talkie_duration || 0;
                                          const isLong = duration > 480; // 8 hours
                                          return (
                                            <Badge 
                                              variant={isLong ? "destructive" : "secondary"}
                                              className="text-xs"
                                            >
                                              Walkie Talkie ({EquipmentStatusService.formatUsageTime(duration)})
                                            </Badge>
                                          );
                                        }
                                        if (attendee.walkie_talkie_status === 'checked_in') {
                                          return <Badge variant="outline" className="text-xs">Walkie Talkie Available</Badge>;
                                        }
                                        return null;
                                      })()}
                                      {/* Fanny Pack Status */}
                                      {(() => {
                                        if (attendee.fanny_pack_status === 'checked_out') {
                                          const duration = attendee.fanny_pack_duration || 0;
                                          const isLong = duration > 1440; // 24 hours
                                          return (
                                            <Badge 
                                              variant={isLong ? "destructive" : "secondary"}
                                              className="text-xs"
                                            >
                                              Fanny Pack ({EquipmentStatusService.formatUsageTime(duration)})
                                            </Badge>
                                          );
                                        }
                                        if (attendee.fanny_pack_status === 'checked_in') {
                                          return <Badge variant="outline" className="text-xs">Fanny Pack Available</Badge>;
                                        }
                                         return null;
                                       })()}
                                        {/* T-Shirt Status */}
                                        {(() => {
                                          const summary = attendee.tshirt_summary;
                                          if (!summary?.hasAnyTShirt) return null;
                                          
                                          if (summary.totalPickedUp === summary.totalOrders) {
                                            return (
                                              <Badge variant="default" className="text-xs">
                                                All T-Shirts Picked Up ({summary.totalOrders})
                                              </Badge>
                                            );
                                          }
                                          
                                          if (summary.totalPickedUp > 0) {
                                            return (
                                              <Badge variant="secondary" className="text-xs">
                                                Partial Pickup ({summary.totalPickedUp}/{summary.totalOrders})
                                              </Badge>
                                            );
                                          }
                                          
                                          return (
                                            <Badge variant="outline" className="text-xs">
                                              T-Shirts Pending ({summary.totalOrders})
                                            </Badge>
                                          );
                                        })()}
                                     </div>
                                     {attendee.rfid_uid && (
                                       <p className="font-mono text-xs">Code: {attendee.rfid_uid}</p>
                                     )}
                                    {attendee.order_id && (
                                      <p className="font-mono text-xs">Order: {attendee.order_id}</p>
                                    )}
                                 </div>
                              </div>
                              
                              <div className="flex flex-col items-end gap-2">
                                {/* Status Badge */}
                                <Badge 
                                  variant={getRfidStatusVariant(attendee.rfid_status, attendee.rfid_uid)}
                                  className="text-xs"
                                >
                                  {attendee.activated_at ? (
                                    <><CheckCircle2 className="h-3 w-3 mr-1" />Active</>
                                  ) : attendee.rfid_uid ? (
                                    <><Clock className="h-3 w-3 mr-1" />Pending</>
                                  ) : (
                                    <><AlertTriangle className="h-3 w-3 mr-1" />No credential</>
                                  )}
                                </Badge>
                                
                                {/* Action Buttons */}
                                <div className="flex gap-2">
                                  {attendee.rfid_uid && !attendee.activated_at && (
                                    <Button
                                      size="sm"
                                      onClick={() => handleIndividualActivation(attendee.id)}
                                      className="text-xs"
                                    >
                                      <UserCheck className="h-3 w-3 mr-1" />
                                      Activate
                                    </Button>
                                  )}
                                  {attendee.is_group_order && attendee.order_id && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => {
                                        const orderAttendees = attendees.filter(a => a.order_id === attendee.order_id);
                                        handleGroupActivation(orderAttendees);
                                      }}
                                      className="text-xs"
                                    >
                                      <Users className="h-3 w-3 mr-1" />
                                      Group
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </ScrollArea>
                ) : (
                  <div className="border rounded-lg overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b bg-muted/30">
                            {allColumns.filter(col => col.desktop && visibleColumns.includes(col.key)).map((column) => (
                              <th key={column.key} className="p-3 text-left text-sm font-medium">
                                <div className="flex items-center gap-2">
                                  {column.label}
                                   {column.sortable && (
                                     <Button
                                       variant="ghost"
                                       size="sm"
                                       onClick={() => handleSort(column.key as keyof EnhancedAttendee)}
                                       className="h-4 w-4 p-0 hover:bg-accent"
                                     >
                                       {sortField === column.key ? (
                                         sortDirection === 'asc' ? '↑' : '↓'
                                       ) : '↕'}
                                     </Button>
                                   )}
                                </div>
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {processedAttendees.map((attendee, index) => (
                            <tr key={attendee.id} className={`border-b hover:bg-accent/50 cursor-pointer ${index % 2 === 0 ? 'bg-background' : 'bg-muted/20'}`}>
                               <td className="p-3 text-sm">
                                 <AttendeeDetailModal 
                                   attendee={attendee} 
                                   allAttendees={attendees}
                                   onActivate={handleIndividualActivation}
                                   onGroupActivate={handleGroupActivation}
                                   trigger={
                                     <button className="text-left hover:underline focus:outline-none">
                                       {attendee.first_name} {attendee.last_name}
                                     </button>
                                   }
                                 />
                               </td>
                               <td className="p-3 text-sm">{attendee.email}</td>
                               <td className="p-3 text-sm">{attendee.phone}</td>
                               <td className="p-3 text-sm">{attendee.order_id}</td>
                               <td className="p-3 text-sm">{attendee.ticket_type}</td>
                               <td className="p-3 text-sm">
                                 <Badge variant={getRegistrationStatusVariant(attendee.registration_status)}>
                                   {getRegistrationStatusDisplayText(attendee.registration_status)}
                                 </Badge>
                               </td>
                               <td className="p-3 text-sm">
                                 <Badge variant={
                                   attendee.rfid_status === 'active' ? 'default' :
                                   attendee.rfid_status === 'assigned' ? 'secondary' : 'destructive'
                                 }>
                                   {attendee.rfid_status}
                                 </Badge>
                               </td>
                               <td className="p-3 text-sm">
                                 {(() => {
                                   if (attendee.headphones_status === 'checked_out') {
                                     const duration = attendee.headphones_duration || 0;
                                     const isLong = duration > 180;
                                     return (
                                       <Badge 
                                         variant={isLong ? "destructive" : "secondary"}
                                         className="text-xs"
                                       >
                                         Checked Out ({HeadphonesStatusService.formatCheckoutDuration(duration)})
                                       </Badge>
                                     );
                                   }
                                   if (attendee.headphones_status === 'checked_in') {
                                     return <Badge variant="outline" className="text-xs">Available</Badge>;
                                   }
                                   return <Badge variant="outline" className="text-xs text-muted-foreground">Never Used</Badge>;
                                 })()}
                               </td>
                               <td className="p-3 text-sm">
                                 {(() => {
                                   if (attendee.golf_cart_status === 'checked_out') {
                                     const duration = attendee.golf_cart_duration || 0;
                                     const isLong = duration > 480; // 8 hours
                                     return (
                                       <Badge 
                                         variant={isLong ? "destructive" : "secondary"}
                                         className="text-xs"
                                       >
                                         Checked Out ({EquipmentStatusService.formatUsageTime(duration)})
                                       </Badge>
                                     );
                                   }
                                   if (attendee.golf_cart_status === 'checked_in') {
                                     return <Badge variant="outline" className="text-xs">Available</Badge>;
                                   }
                                   return <Badge variant="outline" className="text-xs text-muted-foreground">Never Used</Badge>;
                                 })()}
                               </td>
                               <td className="p-3 text-sm">
                                 {(() => {
                                   if (attendee.walkie_talkie_status === 'checked_out') {
                                     const duration = attendee.walkie_talkie_duration || 0;
                                     const isLong = duration > 480; // 8 hours
                                     return (
                                       <Badge 
                                         variant={isLong ? "destructive" : "secondary"}
                                         className="text-xs"
                                       >
                                         Checked Out ({EquipmentStatusService.formatUsageTime(duration)})
                                       </Badge>
                                     );
                                   }
                                   if (attendee.walkie_talkie_status === 'checked_in') {
                                     return <Badge variant="outline" className="text-xs">Available</Badge>;
                                   }
                                   return <Badge variant="outline" className="text-xs text-muted-foreground">Never Used</Badge>;
                                 })()}
                               </td>
                               <td className="p-3 text-sm">
                                 {(() => {
                                   if (attendee.fanny_pack_status === 'checked_out') {
                                     const duration = attendee.fanny_pack_duration || 0;
                                     const isLong = duration > 1440; // 24 hours
                                     return (
                                       <Badge 
                                         variant={isLong ? "destructive" : "secondary"}
                                         className="text-xs"
                                       >
                                         Checked Out ({EquipmentStatusService.formatUsageTime(duration)})
                                       </Badge>
                                     );
                                   }
                                   if (attendee.fanny_pack_status === 'checked_in') {
                                     return <Badge variant="outline" className="text-xs">Available</Badge>;
                                   }
                                    return <Badge variant="outline" className="text-xs text-muted-foreground">Never Used</Badge>;
                                  })()}
                                </td>
                                 <td className="p-3 text-sm">
                                   {(() => {
                                     const summary = attendee.tshirt_summary;
                                     const orders = attendee.tshirt_orders || [];
                                     
                                     if (!summary?.hasAnyTShirt) {
                                       return <Badge variant="outline" className="text-xs text-muted-foreground">None</Badge>;
                                     }
                                     
                                     if (summary.totalPickedUp === summary.totalOrders) {
                                       return (
                                         <div className="flex flex-col gap-1">
                                           <Badge variant="default" className="text-xs">All Picked Up</Badge>
                                           <span className="text-xs text-muted-foreground">
                                             {orders.map(o => `${o.style} ${o.size}`).join(', ')}
                                           </span>
                                         </div>
                                       );
                                     }
                                     
                                     if (summary.totalPickedUp > 0) {
                                       return (
                                         <div className="flex flex-col gap-1">
                                           <Badge variant="secondary" className="text-xs">
                                             Partial ({summary.totalPickedUp}/{summary.totalOrders})
                                           </Badge>
                                           <div className="space-y-1">
                                             {orders.map(order => (
                                               <div key={order.id} className="text-xs">
                                                 <span className={order.isPickedUp ? "text-green-600" : "text-muted-foreground"}>
                                                   {order.isPickedUp ? "✓" : "○"} {order.style} {order.size}
                                                 </span>
                                               </div>
                                             ))}
                                           </div>
                                         </div>
                                       );
                                     }
                                     
                                     return (
                                       <div className="flex flex-col gap-1">
                                         <Badge variant="outline" className="text-xs">Pending</Badge>
                                         <span className="text-xs text-muted-foreground">
                                           {orders.map(o => `${o.style} ${o.size}`).join(', ')}
                                         </span>
                                       </div>
                                     );
                                   })()}
                                 </td>
                               <td className="p-3 text-sm">
                                <div className="flex gap-2">
                                  {attendee.rfid_uid && !attendee.activated_at && (
                                    <Button
                                      size="sm"
                                      onClick={() => handleIndividualActivation(attendee.id)}
                                      className="text-xs"
                                    >
                                      <UserCheck className="h-3 w-3 mr-1" />
                                      Activate
                                    </Button>
                                  )}
                                  {attendee.is_group_order && attendee.order_id && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => {
                                        const orderAttendees = attendees.filter(a => a.order_id === attendee.order_id);
                                        handleGroupActivation(orderAttendees);
                                      }}
                                      className="text-xs"
                                    >
                                      <Users className="h-3 w-3 mr-1" />
                                      Group
                                    </Button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No attendees found</p>
                <p className="text-sm mt-1">Try adjusting your search criteria</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Summary Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Users className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.totalActive}</p>
                  <p className="text-sm text-muted-foreground">Active credentials</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <UserCheck className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.todayActivations}</p>
                  <p className="text-sm text-muted-foreground">Today's Activations</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-lg">
                  <UserMinus className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.todayDeactivations}</p>
                  <p className="text-sm text-muted-foreground">Today's Deactivations</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Recent Staff Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-48">
              <div className="space-y-2">
                {recentActivity.slice(0, 10).map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-center justify-between p-2 border rounded-lg"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-sm">
                        {(activity.attendee as any)?.first_name} {(activity.attendee as any)?.last_name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {activity.transaction_type === 'activate' ? 'Activated' : 'Deactivated'} • Code: {activity.rfid_uid}
                      </p>
                      {activity.extra_data?.reason && (
                        <Badge variant="outline" className="text-xs mt-1">
                          {activity.extra_data.reason}
                        </Badge>
                      )}
                    </div>
                    <div className="text-right">
                      <Badge 
                        variant={activity.transaction_type === 'activate' ? 'default' : 'destructive'}
                        className="text-xs mb-1"
                      >
                        {activity.transaction_type}
                      </Badge>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {formatStandardDateTime(activity.created_at, { compact: true })}
                      </div>
                    </div>
                  </div>
                ))}
                {recentActivity.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No recent activity
                  </p>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Individual Deactivation Tools - Moved to Bottom */}
        <Collapsible open={isDeactivationOpen} onOpenChange={setIsDeactivationOpen}>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <UserMinus className="h-5 w-5" />
                    Individual Deactivation Tools
                  </div>
                  {isDeactivationOpen ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </CardTitle>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="space-y-6">
                <div className="mb-4 p-3 bg-orange-50 rounded-lg border border-orange-200">
                  <p className="text-orange-800 text-sm">
                    This section handles individual RFID deactivations only. Use the search interface above for activations.
                  </p>
                </div>

                {/* Reason Selection */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5" />
                      Deactivation Reason
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="reason">Select Reason</Label>
                      <Select value={selectedReason} onValueChange={setSelectedReason}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a reason" />
                        </SelectTrigger>
                        <SelectContent>
                          {DEACTIVATION_REASONS.map((reason) => (
                            <SelectItem key={reason.value} value={reason.value}>
                              {reason.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {selectedReason === "other" && (
                      <div className="space-y-2">
                        <Label htmlFor="custom-reason">Custom Reason</Label>
                        <Textarea
                          id="custom-reason"
                          value={customReason}
                          onChange={(e) => setCustomReason(e.target.value)}
                          placeholder="Enter custom reason..."
                          rows={2}
                        />
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Scanner */}
                <RfidScanner
                  onScan={handleRfidScan}
                  stationType="activation"
                  disabled={isProcessing}
                  title="Staff Scanner (Individual Deactivation)"
                  showAttendeeInfo={true}
                  autoTrigger={true}
                />

                {/* Manual code entry */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <UserMinus className="h-5 w-5" />
                      Manual code entry
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <Label htmlFor="manual-rfid" className="sr-only">Code</Label>
                        <Input
                          id="manual-rfid"
                          value={manualRfid}
                          onChange={(e) => setManualRfid(e.target.value)}
                          placeholder="Enter Code..."
                          onKeyPress={(e) => e.key === 'Enter' && handleManualDeactivation()}
                        />
                      </div>
                      <Button
                        onClick={handleManualDeactivation}
                        disabled={!manualRfid.trim() || isProcessing}
                        variant="destructive"
                      >
                        Deactivate
                      </Button>
                    </div>
                  </CardContent>
                </Card>

              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      </div>

      {/* Scroll to Top Button */}
      <ScrollToTop />
    </div>
  );
}