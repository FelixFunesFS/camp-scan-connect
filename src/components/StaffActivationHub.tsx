import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  ArrowLeft, 
  Shield, 
  UserMinus, 
  Activity, 
  Download,
  Users,
  Clock,
  Search,
  Scan,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Phone,
  UserCheck,
  CheckCircle2,
  Smartphone,
  AlertCircle
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { RfidScanner } from "@/components/RfidScanner";
import { MobileAttendeeCard } from "@/components/MobileAttendeeCard";
import { MobileActivationPreview } from "@/components/MobileActivationPreview";
import { rfidLookupService, AttendeeSearchResult } from "@/services/rfidLookupService";
import { PhoneActivationService, type PhoneLookupResult, type GroupActivationResult } from "@/services/phoneActivationService";
import { formatPhoneNumber } from "@/lib/phoneUtils";

interface StaffStats {
  totalActive: number;
  todayDeactivations: number;
  todayActivations: number;
}

type SearchType = 'general' | 'phone' | 'order_id' | 'email';

const DEACTIVATION_REASONS = [
  { value: "lost", label: "Lost RFID" },
  { value: "damaged", label: "Damaged RFID" },
  { value: "replaced", label: "Replaced with New RFID" },
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
  
  // Active attendee search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<AttendeeSearchResult[]>([]);
  const [activeRfids, setActiveRfids] = useState<AttendeeSearchResult[]>([]);
  const [searchType, setSearchType] = useState<SearchType>('general');
  
  // Phone activation workflow state
  const [phoneLookupResult, setPhoneLookupResult] = useState<PhoneLookupResult | null>(null);
  const [showActivationPreview, setShowActivationPreview] = useState(false);
  const [activationProcessing, setActivationProcessing] = useState(false);
  
  // Deactivation section state
  const [isDeactivationOpen, setIsDeactivationOpen] = useState(false);
  const [selectedReason, setSelectedReason] = useState("other");
  const [customReason, setCustomReason] = useState("");
  const [manualRfid, setManualRfid] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [deactivationActivity, setDeactivationActivity] = useState<any[]>([]);
  
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (isAuthenticated) {
      loadDashboardData();
      // Refresh data every 30 seconds
      const interval = setInterval(loadDashboardData, 30000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (searchQuery.length >= 2) {
      performAttendeeSearch();
    } else {
      setSearchResults([]);
    }
  }, [searchQuery]);

  const loadDashboardData = async () => {
    try {
      const [activeRfidsData, recentActivityData] = await Promise.all([
        rfidLookupService.getActiveRfids(),
        rfidLookupService.getRecentStaffActivity(20)
      ]);

      setActiveRfids(activeRfidsData);

      // Calculate today's stats
      const today = new Date().toDateString();
      const todayActivity = recentActivityData.filter(
        activity => new Date(activity.created_at).toDateString() === today
      );

      const todayDeactivations = todayActivity.filter(a => a.transaction_type === 'deactivate').length;
      const todayActivations = todayActivity.filter(a => a.transaction_type === 'activate').length;

      setStats({
        totalActive: activeRfidsData.length,
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

  const performAttendeeSearch = async () => {
    try {
      const detectedType = detectSearchType(searchQuery);
      setSearchType(detectedType);
      
      if (detectedType === 'phone') {
        await handlePhoneSearch(searchQuery);
      } else {
        const results = await rfidLookupService.searchAttendees(searchQuery);
        // Show all attendees for activation, not just active ones
        setSearchResults(results);
        setPhoneLookupResult(null); // Clear phone results when doing general search
      }
    } catch (error) {
      console.error('Error searching attendees:', error);
      toast({
        title: "Search Error",
        description: "Failed to search attendees",
        variant: "destructive",
      });
    }
  };

  // Helper functions for search and activation
  const detectSearchType = (query: string): SearchType => {
    const trimmed = query.trim();
    
    // Phone number detection (10+ digits with optional formatting)
    const phonePattern = /^[\+]?[1]?[\s\-\.\(\)]?[\d\s\-\.\(\)]{10,}$/;
    if (phonePattern.test(trimmed)) {
      return 'phone';
    }
    
    // Order ID detection (alphanumeric, often with dashes or underscores)
    const orderPattern = /^[A-Za-z0-9\-_]{6,}$/;
    if (orderPattern.test(trimmed) && !trimmed.includes('@')) {
      return 'order_id';
    }
    
    // Email detection
    if (trimmed.includes('@') && trimmed.includes('.')) {
      return 'email';
    }
    
    return 'general';
  };

  const handlePhoneSearch = async (phone: string) => {
    try {
      setActivationProcessing(true);
      const result = await PhoneActivationService.lookupPhonePreview(phone);
      if (result) {
        setPhoneLookupResult(result);
        setSearchResults([]); // Clear general search results
      } else {
        setPhoneLookupResult(null);
        toast({
          title: "No Results",
          description: "No attendees found for this phone number",
          variant: "default",
        });
      }
    } catch (error) {
      console.error('Phone search error:', error);
      toast({
        title: "Phone Search Error",
        description: error instanceof Error ? error.message : "Failed to search phone number",
        variant: "destructive",
      });
    } finally {
      setActivationProcessing(false);
    }
  };

  const handlePhoneActivation = async () => {
    if (!phoneLookupResult) return;
    
    try {
      setActivationProcessing(true);
      const result = await PhoneActivationService.activateGroupByPhone(searchQuery, 'staff_assisted');
      
      if (result) {
        toast({
          title: "Activation Successful",
          description: `Activated ${result.activated_count} of ${result.total_attendees} attendees`,
        });
        loadDashboardData(); // Refresh data
        setPhoneLookupResult(null);
        setSearchQuery("");
      }
    } catch (error) {
      console.error('Phone activation error:', error);
      toast({
        title: "Activation Failed",
        description: error instanceof Error ? error.message : "Failed to activate group",
        variant: "destructive",
      });
    } finally {
      setActivationProcessing(false);
    }
  };

  const handleEntireOrderActivation = async () => {
    if (!phoneLookupResult) return;
    
    try {
      setActivationProcessing(true);
      const result = await PhoneActivationService.activateEntireOrderByPhone(searchQuery, 'staff_assisted');
      
      if (result) {
        toast({
          title: "Order Activation Successful",
          description: `Activated ${result.activated_count} of ${result.total_attendees} people in the order`,
        });
        loadDashboardData(); // Refresh data
        setPhoneLookupResult(null);
        setSearchQuery("");
      }
    } catch (error) {
      console.error('Order activation error:', error);
      toast({
        title: "Order Activation Failed",
        description: error instanceof Error ? error.message : "Failed to activate entire order",
        variant: "destructive",
      });
    } finally {
      setActivationProcessing(false);
    }
  };

  const handleIndividualActivation = async (attendeeId: string) => {
    // Individual activation logic would be implemented here
    // This could involve activating a single attendee's RFID
    toast({
      title: "Individual Activation",
      description: "Individual activation feature coming soon",
    });
  };

  const handleStaffLogin = () => {
    // Simple staff code validation - in production, this would be more secure
    if (staffCode.toLowerCase() === 'mc2025') {
      setIsAuthenticated(true);
      setStaffId('MC2025');
      toast({
        title: "Welcome, MC2025 Staff",
        description: "You now have access to event management tools",
      });
    } else {
      toast({
        title: "Invalid Staff Code",
        description: "Please enter a valid staff code",
        variant: "destructive",
      });
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
        toast({
          title: "RFID Deactivated",
          description: attendee ? 
            `${attendee.first_name} ${attendee.last_name} deactivated` :
            "RFID deactivated successfully",
        });
        loadDashboardData();
      } else {
        toast({
          title: "Deactivation Failed",
          description: result.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to deactivate RFID",
        variant: "destructive",
      });
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

        {/* Multi-Criteria Search Interface */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Search & Activate Attendees
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, email, phone number, or order ID..."
                className="pr-10"
              />
              {searchType === 'phone' && (
                <Phone className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
              )}
              {activationProcessing && (
                <div className="absolute right-3 top-3 animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
              )}
            </div>
            
            {/* Search Type Indicator */}
            {searchQuery.length >= 2 && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Badge variant="outline" className="text-xs">
                  {searchType === 'phone' ? '📞 Phone Search' : 
                   searchType === 'order_id' ? '📄 Order ID Search' :
                   searchType === 'email' ? '📧 Email Search' : '🔍 General Search'}
                </Badge>
              </div>
            )}
            
            {/* Phone Lookup Results with Activation */}
            {phoneLookupResult && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-medium text-primary">
                  <Smartphone className="h-4 w-4" />
                  Phone Lookup Results
                </div>
                <MobileActivationPreview
                  phoneNumber={searchQuery}
                  lookupResult={phoneLookupResult}
                  isProcessing={activationProcessing}
                  onActivatePhoneGroup={handlePhoneActivation}
                  onActivateEntireOrder={handleEntireOrderActivation}
                  onBack={() => {
                    setPhoneLookupResult(null);
                    setSearchQuery("");
                  }}
                />
              </div>
            )}
            
            {/* General Search Results with Rich Display */}
            {searchResults.length > 0 && !phoneLookupResult && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Found {searchResults.length} {searchResults.length === 1 ? 'attendee' : 'attendees'}</h4>
                </div>
                <ScrollArea className="max-h-96">
                  <div className="space-y-3">
                    {searchResults.map((attendee) => (
                      <Card key={attendee.id} className="transition-all duration-200 hover:shadow-md">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="font-medium">
                                  {attendee.first_name} {attendee.last_name}
                                </span>
                                {attendee.is_veteran && (
                                  <Badge variant="secondary" className="text-xs">Veteran</Badge>
                                )}
                              </div>
                              
                              <div className="space-y-1 text-sm text-muted-foreground">
                                <p>{attendee.email}</p>
                                <p>{attendee.ticket_type}</p>
                                {attendee.rfid_uid && (
                                  <p className="font-mono text-xs">RFID: {attendee.rfid_uid}</p>
                                )}
                                {attendee.order_id && (
                                  <p className="font-mono text-xs">Order: {attendee.order_id}</p>
                                )}
                              </div>
                            </div>
                            
                            <div className="flex flex-col items-end gap-2">
                              {/* Status Badge */}
                              <Badge 
                                variant={
                                  attendee.rfid_status === 'active' && attendee.activated_at ? 'default' :
                                  attendee.rfid_status === 'assigned' ? 'secondary' : 
                                  'destructive'
                                }
                                className="text-xs"
                              >
                                {attendee.rfid_status === 'active' && attendee.activated_at ? (
                                  <><CheckCircle2 className="h-3 w-3 mr-1" />Active</>
                                ) : attendee.rfid_status === 'assigned' ? (
                                  <><Clock className="h-3 w-3 mr-1" />Pending</>
                                ) : (
                                  <><AlertTriangle className="h-3 w-3 mr-1" />No RFID</>
                                )}
                              </Badge>
                              
                              {/* Activation Button */}
                              {attendee.rfid_uid && !attendee.activated_at && (
                                <Button
                                  size="sm"
                                  onClick={() => handleIndividualActivation(attendee.id)}
                                  className="text-xs"
                                  disabled={activationProcessing}
                                >
                                  <UserCheck className="h-3 w-3 mr-1" />
                                  Activate
                                </Button>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}

            {/* No Results Message */}
            {searchQuery.length >= 2 && searchResults.length === 0 && !phoneLookupResult && !activationProcessing && (
              <div className="text-center py-8 text-muted-foreground">
                <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No attendees found matching "{searchQuery}"</p>
                <p className="text-sm mt-1">Try searching by name, email, phone, or order ID</p>
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
                  <p className="text-sm text-muted-foreground">Active RFIDs</p>
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
                        {activity.transaction_type === 'activate' ? 'Activated' : 'Deactivated'} • RFID: {activity.rfid_uid}
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
                        {new Date(activity.created_at).toLocaleTimeString()}
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

                {/* RFID Scanner */}
                <RfidScanner
                  onScan={handleRfidScan}
                  stationType="activation"
                  disabled={isProcessing}
                  title="Staff RFID Scanner (Individual Deactivation)"
                  showAttendeeInfo={true}
                  autoTrigger={true}
                />

                {/* Manual RFID Entry */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <UserMinus className="h-5 w-5" />
                      Manual RFID Entry
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <Label htmlFor="manual-rfid" className="sr-only">RFID UID</Label>
                        <Input
                          id="manual-rfid"
                          value={manualRfid}
                          onChange={(e) => setManualRfid(e.target.value)}
                          placeholder="Enter RFID UID..."
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

                {/* Recent Deactivations */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Activity className="h-5 w-5" />
                      Recent Deactivations
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-32">
                      <div className="space-y-2">
                        {deactivationActivity.map((activity) => (
                          <div
                            key={activity.id}
                            className="flex items-center justify-between p-2 border rounded-lg"
                          >
                            <div className="flex-1">
                              <p className="font-medium text-sm">
                                {(activity.attendee as any)?.first_name} {(activity.attendee as any)?.last_name}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                RFID: {activity.rfid_uid}
                              </p>
                              {activity.extra_data?.reason && (
                                <Badge variant="outline" className="text-xs mt-1">
                                  {activity.extra_data.reason}
                                </Badge>
                              )}
                            </div>
                            <div className="text-right">
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Clock className="h-3 w-3" />
                                {new Date(activity.created_at).toLocaleTimeString()}
                              </div>
                            </div>
                          </div>
                        ))}
                        {deactivationActivity.length === 0 && (
                          <p className="text-sm text-muted-foreground text-center py-4">
                            No recent deactivations
                          </p>
                        )}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      </div>
    </div>
  );
}