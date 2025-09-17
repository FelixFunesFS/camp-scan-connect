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
  ChevronRight
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { RfidScanner } from "@/components/RfidScanner";
import { rfidLookupService, AttendeeSearchResult } from "@/services/rfidLookupService";

interface StaffStats {
  totalActive: number;
  todayDeactivations: number;
}

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
    todayDeactivations: 0
  });
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  
  // Active attendee search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<AttendeeSearchResult[]>([]);
  const [activeRfids, setActiveRfids] = useState<AttendeeSearchResult[]>([]);
  
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

      setStats({
        totalActive: activeRfidsData.length,
        todayDeactivations
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
      const results = await rfidLookupService.searchAttendees(searchQuery);
      // Filter to only active RFIDs
      const activeResults = results.filter(r => r.rfid_status === 'active');
      setSearchResults(activeResults);
    } catch (error) {
      console.error('Error searching attendees:', error);
    }
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

        {/* Active Attendees Search - Primary Interface */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Search Active Attendees
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, email, phone, or order ID..."
            />
            
            {searchResults.length > 0 && (
              <ScrollArea className="h-64">
                <div className="space-y-2">
                  {searchResults.map((attendee) => (
                    <div
                      key={attendee.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50"
                    >
                      <div className="flex-1">
                        <p className="font-medium">
                          {attendee.first_name} {attendee.last_name}
                          {attendee.is_veteran && (
                            <Badge variant="secondary" className="ml-2">Veteran</Badge>
                          )}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {attendee.email} • {attendee.ticket_type}
                        </p>
                        <p className="text-xs text-muted-foreground font-mono">
                          RFID: {attendee.rfid_uid}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-green-600">
                          Active
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}

            {searchQuery.length >= 2 && searchResults.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No active attendees found matching "{searchQuery}"
              </div>
            )}
          </CardContent>
        </Card>

        {/* Individual Deactivation Tools - Collapsible Section */}
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
                    This section handles individual RFID deactivations only.
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
                    <ScrollArea className="h-48">
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
                          <p className="text-sm text-muted-foreground text-center py-8">
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

        {/* Summary Stats */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Active RFIDs</p>
                  <p className="text-2xl font-bold text-primary">{stats.totalActive}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-red-500/20 bg-red-50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <UserMinus className="h-5 w-5 text-red-600" />
                <div>
                  <p className="text-sm text-muted-foreground">Today's Deactivations</p>
                  <p className="text-2xl font-bold text-red-600">{stats.todayDeactivations}</p>
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
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-64">
              <div className="space-y-2">
                {recentActivity.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex-1">
                      <p className="font-medium">
                        {(activity.attendee as any)?.first_name} {(activity.attendee as any)?.last_name}
                      </p>
                      <p className="text-sm text-muted-foreground">
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
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No recent activity
                  </p>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}