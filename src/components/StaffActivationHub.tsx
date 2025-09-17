import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  ArrowLeft, 
  Shield, 
  UserPlus, 
  UserMinus, 
  Activity, 
  Download,
  Users,
  Clock,
  Search,
  Smartphone,
  Scan,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { StaffDeactivationPanel } from "@/components/StaffDeactivationPanel";
import { rfidLookupService, AttendeeSearchResult } from "@/services/rfidLookupService";
import { PhoneActivationService, type PhoneLookupResult } from "@/services/phoneActivationService";
import { formatPhoneNumber } from "@/lib/phoneUtils";
import { MobileAttendeeCard } from "@/components/MobileAttendeeCard";
import { RfidScanner } from "@/components/RfidScanner";

interface StaffStats {
  totalActive: number;
  todayDeactivations: number;
}

type SearchMode = 'phone' | 'name' | 'rfid';

export function StaffActivationHub() {
  const [staffCode, setStaffCode] = useState("");
  const [staffId, setStaffId] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [stats, setStats] = useState<StaffStats>({
    totalActive: 0,
    todayDeactivations: 0
  });
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Search state
  const [searchMode, setSearchMode] = useState<SearchMode>('phone');
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [phoneLookupResult, setPhoneLookupResult] = useState<PhoneLookupResult | null>(null);
  const [attendeeSearchResults, setAttendeeSearchResults] = useState<AttendeeSearchResult[]>([]);
  
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

  const loadDashboardData = async () => {
    try {
      const [activeRfids, recentActivityData] = await Promise.all([
        rfidLookupService.getActiveRfids(),
        rfidLookupService.getRecentStaffActivity(20)
      ]);

      // Calculate today's stats
      const today = new Date().toDateString();
      const todayActivity = recentActivityData.filter(
        activity => new Date(activity.created_at).toDateString() === today
      );

      const todayDeactivations = todayActivity.filter(a => a.transaction_type === 'deactivate').length;

      setStats({
        totalActive: activeRfids.length,
        todayDeactivations
      });

      setRecentActivity(recentActivityData);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
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

  // Search functions
  const performPhoneSearch = async (phone: string) => {
    setIsSearching(true);
    try {
      const result = await PhoneActivationService.lookupPhonePreview(phone);
      setPhoneLookupResult(result);
      setAttendeeSearchResults([]);
    } catch (error) {
      toast({
        title: "Search Failed",
        description: error instanceof Error ? error.message : "Failed to lookup phone number",
        variant: "destructive",
      });
      setPhoneLookupResult(null);
    } finally {
      setIsSearching(false);
    }
  };

  const performAttendeeSearch = async (query: string) => {
    setIsSearching(true);
    try {
      const results = await rfidLookupService.searchAttendees(query);
      setAttendeeSearchResults(results);
      setPhoneLookupResult(null);
    } catch (error) {
      toast({
        title: "Search Failed",
        description: "Failed to search attendees",
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    if (searchMode === 'phone') {
      await performPhoneSearch(searchQuery);
    } else {
      await performAttendeeSearch(searchQuery);
    }
  };

  const handleRfidScan = async (rfidData: any) => {
    try {
      const attendee = await rfidLookupService.getRfidWithAttendee(rfidData.uid);
      if (attendee) {
        setAttendeeSearchResults([attendee]);
        setPhoneLookupResult(null);
      } else {
        toast({
          title: "RFID Not Found",
          description: "No attendee found for this RFID",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "RFID Scan Failed",
        description: "Failed to lookup RFID",
        variant: "destructive",
      });
    }
  };

  // Activation functions
  const activatePhoneGroup = async () => {
    if (!phoneLookupResult) return;
    
    setIsLoading(true);
    try {
      const result = await PhoneActivationService.activateGroupByPhone(
        searchQuery,
        'staff_assisted'
      );
      
      if (result) {
        toast({
          title: "Group Activated",
          description: `${result.activated_count} RFIDs activated successfully`,
        });
        clearSearch();
        loadDashboardData();
      }
    } catch (error) {
      toast({
        title: "Activation Failed",
        description: error instanceof Error ? error.message : "Failed to activate group",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const activateEntireOrder = async () => {
    if (!phoneLookupResult) return;
    
    setIsLoading(true);
    try {
      const result = await PhoneActivationService.activateEntireOrderByPhone(
        searchQuery,
        'staff_assisted'
      );
      
      if (result) {
        toast({
          title: "Order Activated",
          description: `${result.activated_count} RFIDs activated successfully`,
        });
        clearSearch();
        loadDashboardData();
      }
    } catch (error) {
      toast({
        title: "Activation Failed",
        description: error instanceof Error ? error.message : "Failed to activate order",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const activateSingleAttendee = async (attendee: AttendeeSearchResult) => {
    if (!attendee.rfid_uid) return;
    
    setIsLoading(true);
    try {
      const result = await rfidLookupService.activateRfid(attendee.rfid_uid, staffId || undefined);
      
      if (result.success) {
        toast({
          title: "RFID Activated",
          description: `${attendee.first_name} ${attendee.last_name} activated successfully`,
        });
        clearSearch();
        loadDashboardData();
      } else {
        toast({
          title: "Activation Failed",
          description: result.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Activation Failed",
        description: "Failed to activate RFID",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const clearSearch = () => {
    setSearchQuery("");
    setPhoneLookupResult(null);
    setAttendeeSearchResults([]);
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
            <h1 className="text-2xl font-bold">Staff Activation Hub</h1>
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

        {/* Attendee Search - Primary Interface */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Attendee Search & Activation
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Search Mode Selection */}
            <div className="flex gap-2">
              <Button
                variant={searchMode === 'phone' ? 'default' : 'outline'}
                onClick={() => setSearchMode('phone')}
                size="sm"
              >
                <Smartphone className="h-4 w-4 mr-2" />
                Phone
              </Button>
              <Button
                variant={searchMode === 'name' ? 'default' : 'outline'}
                onClick={() => setSearchMode('name')}
                size="sm"
              >
                <Search className="h-4 w-4 mr-2" />
                Name/Email
              </Button>
              <Button
                variant={searchMode === 'rfid' ? 'default' : 'outline'}
                onClick={() => setSearchMode('rfid')}
                size="sm"
              >
                <Scan className="h-4 w-4 mr-2" />
                RFID Scan
              </Button>
            </div>

            {/* Search Input */}
            {searchMode !== 'rfid' && (
              <div className="flex gap-2">
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={
                    searchMode === 'phone' 
                      ? "Enter phone number..." 
                      : "Search by name, email, or order ID..."
                  }
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                />
                <Button
                  onClick={handleSearch}
                  disabled={!searchQuery.trim() || isSearching}
                >
                  {isSearching ? "Searching..." : "Search"}
                </Button>
                {(phoneLookupResult || attendeeSearchResults.length > 0) && (
                  <Button variant="outline" onClick={clearSearch}>
                    Clear
                  </Button>
                )}
              </div>
            )}

            {/* RFID Scanner */}
            {searchMode === 'rfid' && (
              <RfidScanner
                onScan={handleRfidScan}
                stationType="activation"
                disabled={isLoading}
                title="Scan RFID to Find Attendee"
                showAttendeeInfo={true}
                autoTrigger={true}
              />
            )}
          </CardContent>
        </Card>

        {/* Search Results - Phone Lookup */}
        {phoneLookupResult && (
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="p-4">
              <div className="flex items-start gap-3 mb-4">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Smartphone className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-lg">
                    {formatPhoneNumber(searchQuery)}
                  </h3>
                  <p className="text-muted-foreground text-sm">
                    Found {phoneLookupResult.attendee_count} {phoneLookupResult.attendee_count === 1 ? 'person' : 'people'}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="outline" className="text-xs">
                      {phoneLookupResult.has_group_order ? 'Group Order' : 'Individual Registration'}
                    </Badge>
                    {phoneLookupResult.order_id && (
                      <Badge variant="secondary" className="text-xs font-mono">
                        #{phoneLookupResult.order_id}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* Direct Phone Matches */}
              {phoneLookupResult.attendee_details?.length > 0 && (
                <div className="space-y-3 mb-4">
                  <h4 className="font-medium flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Primary Registration ({phoneLookupResult.attendee_details.length})
                  </h4>
                  <div className="space-y-2">
                    {phoneLookupResult.attendee_details.map((attendee: any, index: number) => (
                      <MobileAttendeeCard
                        key={`direct-${index}`}
                        attendee={attendee}
                        type="direct"
                        showDetails={true}
                        onToggleDetails={() => {}}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Order Companions */}
              {phoneLookupResult.order_companions?.length > 0 && (
                <div className="space-y-3 mb-4">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-accent" />
                    <h4 className="font-medium">
                      Order Companions ({phoneLookupResult.order_companions.length})
                    </h4>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    These people are in the same order but have different phone numbers:
                  </p>
                  <div className="space-y-2">
                    {phoneLookupResult.order_companions.map((companion: any, index: number) => (
                      <MobileAttendeeCard
                        key={`companion-${index}`}
                        attendee={companion}
                        type="companion"
                        showDetails={true}
                        onToggleDetails={() => {}}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2">
                <Button
                  onClick={activatePhoneGroup}
                  disabled={isLoading}
                  className="flex-1"
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Activating...
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4" />
                      Activate Primary ({phoneLookupResult.attendee_details?.length || 0})
                    </div>
                  )}
                </Button>

                {phoneLookupResult.order_companions?.length > 0 && (
                  <Button
                    onClick={activateEntireOrder}
                    disabled={isLoading}
                    variant="outline"
                    className="flex-1"
                  >
                    {isLoading ? "Activating..." : `Activate All (${phoneLookupResult.attendee_count})`}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Search Results - Attendee Search */}
        {attendeeSearchResults.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Search Results ({attendeeSearchResults.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
                <div className="space-y-3">
                  {attendeeSearchResults.map((attendee) => (
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
                          {attendee.ticket_type} • RFID: {attendee.rfid_uid || 'Not assigned'}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge 
                            variant={attendee.rfid_status === 'active' ? 'default' : 'secondary'}
                          >
                            {attendee.rfid_status || 'No RFID'}
                          </Badge>
                          {attendee.activated_at && (
                            <Badge variant="outline">Activated</Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {attendee.rfid_uid && attendee.rfid_status !== 'active' && (
                          <Button 
                            size="sm"
                            onClick={() => activateSingleAttendee(attendee)}
                            disabled={isLoading}
                          >
                            Activate
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        )}

        {/* Individual Deactivation Panel */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserMinus className="h-5 w-5" />
              Individual Deactivation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4 p-3 bg-orange-50 rounded-lg border border-orange-200">
              <p className="text-orange-800 text-sm">
                This section handles individual RFID deactivations only.
              </p>
            </div>
            <StaffDeactivationPanel staffId={staffId || undefined} />
          </CardContent>
        </Card>

        <Separator className="my-8" />

        {/* Summary Stats */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-blue-600" />
                <div>
                  <p className="text-sm text-muted-foreground">Active RFIDs</p>
                  <p className="text-2xl font-bold text-blue-600">{stats.totalActive}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <UserMinus className="h-4 w-4 text-red-600" />
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
            <ScrollArea className="h-96">
              <div className="space-y-3">
                {recentActivity.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg"
                  >
                    <div className="flex-shrink-0 mt-1">
                      {activity.transaction_type === 'activate' ? (
                        <UserPlus className="h-4 w-4 text-green-600" />
                      ) : (
                        <UserMinus className="h-4 w-4 text-red-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">
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
                      <div className="flex items-center gap-1 mt-1">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">
                          {new Date(activity.created_at).toLocaleTimeString()}
                        </span>
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