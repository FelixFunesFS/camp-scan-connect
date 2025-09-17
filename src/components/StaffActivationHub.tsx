import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  ArrowLeft, 
  Shield, 
  UserPlus, 
  UserMinus, 
  Activity, 
  BarChart3,
  Download,
  Users,
  Clock,
  Tag
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { StaffActivationPanel } from "@/components/StaffActivationPanel";
import { StaffDeactivationPanel } from "@/components/StaffDeactivationPanel";
import { RfidManagementPanel } from "@/components/RfidManagementPanel";
import { rfidLookupService } from "@/services/rfidLookupService";

interface StaffStats {
  totalActive: number;
  todayActivations: number;
  todayDeactivations: number;
  totalRegistered: number;
}

export function StaffActivationHub() {
  const [staffCode, setStaffCode] = useState("");
  const [staffId, setStaffId] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [stats, setStats] = useState<StaffStats>({
    totalActive: 0,
    todayActivations: 0,
    todayDeactivations: 0,
    totalRegistered: 0
  });
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
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

      const todayActivations = todayActivity.filter(a => a.transaction_type === 'activate').length;
      const todayDeactivations = todayActivity.filter(a => a.transaction_type === 'deactivate').length;

      setStats({
        totalActive: activeRfids.length,
        todayActivations,
        todayDeactivations,
        totalRegistered: 0 // This would need a separate query
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

  const exportActivity = () => {
    // Export recent activity as CSV
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

        {/* Dashboard Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
                <UserPlus className="h-4 w-4 text-green-600" />
                <div>
                  <p className="text-sm text-muted-foreground">Today's Activations</p>
                  <p className="text-2xl font-bold text-green-600">{stats.todayActivations}</p>
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
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-purple-600" />
                <div>
                  <p className="text-sm text-muted-foreground">Activation Rate</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {stats.totalRegistered > 0 ? 
                      Math.round((stats.totalActive / stats.totalRegistered) * 100) : 0}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Interface */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Staff Tools */}
          <div className="lg:col-span-2">
            <Tabs defaultValue="activation" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="activation" className="flex items-center gap-2">
                  <UserPlus className="h-4 w-4" />
                  Activation
                </TabsTrigger>
                <TabsTrigger value="deactivation" className="flex items-center gap-2">
                  <UserMinus className="h-4 w-4" />
                  Deactivation
                </TabsTrigger>
                <TabsTrigger value="rfid-management" className="flex items-center gap-2">
                  <Tag className="h-4 w-4" />
                  RFID Management
                </TabsTrigger>
              </TabsList>

              <TabsContent value="activation" className="mt-6">
                <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h3 className="font-semibold text-blue-900 mb-2">Phone Activation Available</h3>
                  <p className="text-blue-800 text-sm">
                    Staff can also use phone number lookup for activations. Enter a phone number to see 
                    if it's an individual registration or group order before activating.
                  </p>
                </div>
                <StaffActivationPanel staffId={staffId || undefined} />
              </TabsContent>

              <TabsContent value="deactivation" className="mt-6">
                <StaffDeactivationPanel staffId={staffId || undefined} />
              </TabsContent>

              <TabsContent value="rfid-management" className="mt-6">
                <RfidManagementPanel />
              </TabsContent>
            </Tabs>
          </div>

          {/* Activity Feed */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Live Activity Feed
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
      </div>
    </div>
  );
}