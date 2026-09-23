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
  UserCheck
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { RfidScanner } from "@/components/RfidScanner";
import { UnifiedSearchFilter, QuickFilter } from "@/components/shared/UnifiedSearchFilter";
import { rfidLookupService } from "@/services/rfidLookupService";
import { EnhancedActivationService } from "@/services/enhancedActivationService";
import { TShirtService } from '@/services/tshirtService';
import { StaffAssistanceNotifications } from "@/components/StaffAssistanceNotifications";
import { OfflineQueueBadge } from "@/components/OfflineQueueBadge";
import { WaiverStatusPanel } from "@/components/WaiverStatusPanel";
import { ScrollToTop } from "@/components/ui/scroll-to-top";
import { formatStandardDateTime, formatWithRelativeTime } from "@/utils/dateTimeUtils";
import { formatTicketType } from "@/lib/ticketTypes";
import { WORKING_STATUSES } from "@/lib/registrationStatus";
import { StaffAttendeeRow } from "@/components/staff/StaffAttendeeRow";

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

interface StaffStats {
  totalActive: number;
  todayDeactivations: number;
  todayActivations: number;
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
  
  // Deactivation section state
  const [isDeactivationOpen, setIsDeactivationOpen] = useState(false);
  const [selectedReason, setSelectedReason] = useState("other");
  const [customReason, setCustomReason] = useState("");
  const [manualRfid, setManualRfid] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [deactivationActivity, setDeactivationActivity] = useState<any[]>([]);
  
  // Attendee detail modal state
  // Expandable master-detail rows
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const toggleRow = (id: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };
  
  const navigate = useNavigate();
  
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

      // Cancelled/abandoned/transferred registrations are hidden unless staff
      // explicitly asks to see them.
      if (!showCancelledRegistrants) {
        query = query.in('registration_status', WORKING_STATUSES);
      }

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
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      console.error('Individual activation error:', error);
      toast.error("Failed to activate attendee");
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
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <Button 
              variant="outline" 
              onClick={() => navigate("/")}
              size="icon"
              className="h-11 w-11 shrink-0"
              aria-label="Back to main hub"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="truncate text-2xl font-bold">Staff Hub</h1>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
            <Button variant="outline" className="min-h-11" onClick={exportActivity}>
              <Download className="h-4 w-4 mr-2" />
              Export Activity
            </Button>
            <Button variant="outline" className="min-h-11" onClick={handleLogout}>
              Logout
            </Button>
          </div>
        </div>

        <OfflineQueueBadge />

        {/* Staff Assistance Queue */}
        <StaffAssistanceNotifications />

        {/* Individual Search & Management */}
        <Card id="individual-search">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5" />
              Attendee Management
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

            <WaiverStatusPanel
              refreshTrigger={attendees.filter((attendee) => attendee.waiver_signed).length}
              onFilterUnsigned={() => setActiveQuickFilter('waiver_missing')}
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
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm text-muted-foreground">
                    Found {processedAttendees.length} attendee{processedAttendees.length !== 1 ? 's' : ''}
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <Select
                      value={sortField || 'first_name'}
                      onValueChange={(value) => handleSort(value as keyof EnhancedAttendee)}
                    >
                      <SelectTrigger className="h-9 w-[170px]">
                        <SelectValue placeholder="Sort by" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="first_name">Sort: First name</SelectItem>
                        <SelectItem value="last_name">Sort: Last name</SelectItem>
                        <SelectItem value="registration_status">Sort: Registration</SelectItem>
                        <SelectItem value="rfid_status">Sort: Band status</SelectItem>
                        <SelectItem value="ticket_type">Sort: Ticket type</SelectItem>
                        <SelectItem value="order_id">Sort: Order</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-9"
                      onClick={() => setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')}
                    >
                      {sortDirection === 'asc' ? 'A → Z' : 'Z → A'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-9"
                      onClick={() =>
                        setExpandedRows(prev =>
                          prev.size === processedAttendees.length
                            ? new Set()
                            : new Set(processedAttendees.map(a => a.id))
                        )
                      }
                    >
                      {expandedRows.size === processedAttendees.length ? 'Collapse all' : 'Expand all'}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  {processedAttendees.map((attendee) => (
                    <StaffAttendeeRow
                      key={attendee.id}
                      attendee={attendee}
                      allAttendees={attendees}
                      expanded={expandedRows.has(attendee.id)}
                      onToggle={() => toggleRow(attendee.id)}
                      onActivate={handleIndividualActivation}
                      onGroupActivate={handleGroupActivation}
                      onWaiverSigned={() => fetchAttendees()}
                    />
                  ))}
                </div>
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