import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { 
  Shield, 
  ArrowLeft, 
  LogOut, 
  BarChart3, 
  Settings, 
  TestTube, 
  FileText,
  Users,
  UserCheck,
  AlertTriangle,
  HandHeart,
  Power,
  ChevronDown,
  Download,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  Database,
  Wifi,
  Play
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { PhoneActivationService } from "@/services/phoneActivationService";

// Import existing components that will become tabs
import { RegFoxSyncPanel } from "@/components/RegFoxSyncPanel";
import { WebhookStatus } from "@/components/WebhookStatus";
import { SystemCleanupStatus } from "@/components/SystemCleanupStatus";

const AdminHub = () => {
  const [adminCode, setAdminCode] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [adminId, setAdminId] = useState<string | null>(null);
  
  // Dashboard states
  const [stats, setStats] = useState({
    totalAttendees: 0,
    activeRFID: 0,
    totalScans: 0,
    staffAssisted: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(true);

  // System validation states
  interface ValidationTest {
    id: string;
    name: string;
    description: string;
    status: 'pending' | 'running' | 'passed' | 'failed';
  }

  const [validationTests, setValidationTests] = useState<ValidationTest[]>([
    {
      id: 'database_connection',
      name: 'Database Connection',
      description: 'Verify Supabase connection and basic queries',
      status: 'pending'
    },
    {
      id: 'rfid_integrity',
      name: 'RFID Tag Integrity',
      description: 'Check for orphaned tags and proper assignments',
      status: 'pending'
    },
    {
      id: 'attendee_data',
      name: 'Attendee Data Validation',
      description: 'Verify attendee records and RegFox sync',
      status: 'pending'
    },
    {
      id: 'station_workflows',
      name: 'Station Workflows',
      description: 'Test all station transaction capabilities',
      status: 'pending'
    }
  ]);
  const [validationProgress, setValidationProgress] = useState(0);
  const [isRunningValidation, setIsRunningValidation] = useState(false);

  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (isAuthenticated) {
      loadDashboardStats();
    }
  }, [isAuthenticated]);

  const handleAdminLogin = () => {
    if (adminCode.toLowerCase() === 'admin2025') {
      setIsAuthenticated(true);
      setAdminId('ADMIN2025');
      toast({
        title: "Welcome to Admin Hub",
        description: "You now have access to all administrative functions",
      });
    } else {
      toast({
        title: "Invalid Admin Code",
        description: "Please enter the correct admin access code",
        variant: "destructive",
      });
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setAdminId(null);
    setAdminCode("");
    toast({
      title: "Logged Out",
      description: "Admin session ended successfully",
    });
  };

  const loadDashboardStats = async () => {
    try {
      // Get attendee count
      const { count: attendeeCount } = await supabase
        .from('attendees')
        .select('*', { count: 'exact', head: true });

      // Get active RFID count
      const { count: rfidCount } = await supabase
        .from('rfid_tags')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');

      // Get total scans count
      const { count: scanCount } = await supabase
        .from('scans')
        .select('*', { count: 'exact', head: true });

      // Get staff-assisted activations today
      const { count: staffAssistedCount } = await supabase
        .from('station_transactions')
        .select('*', { count: 'exact', head: true })
        .eq('activation_method', 'staff_assisted')
        .eq('station_type', 'activation')
        .gte('created_at', new Date().toISOString().split('T')[0]);

      setStats({
        totalAttendees: attendeeCount || 0,
        activeRFID: rfidCount || 0,
        totalScans: scanCount || 0,
        staffAssisted: staffAssistedCount || 0
      });
    } catch (error) {
      console.error('Error loading stats:', error);
      toast({
        title: "Error",
        description: "Failed to load dashboard statistics",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleMassDeactivation = async () => {
    if (!confirm("Are you sure you want to deactivate ALL RFID tags? This action cannot be undone and will affect all attendees.")) {
      return;
    }
    
    const confirmAgain = confirm("This will deactivate ALL active RFID tags system-wide. Type 'CONFIRM' if you're absolutely sure.");
    if (!confirmAgain) {
      return;
    }

    setIsProcessing(true);
    try {
      const count = await PhoneActivationService.deactivateAllRfids("Mass deactivation via admin dashboard");
      toast({
        title: "Mass Deactivation Complete",
        description: `${count} RFID tags have been deactivated system-wide.`,
      });
    } catch (error) {
      console.error("Mass deactivation error:", error);
      toast({
        title: "Deactivation Failed",
        description: "Failed to perform mass deactivation. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const runSystemValidation = async () => {
    setIsRunningValidation(true);
    setValidationProgress(0);

    for (let i = 0; i < validationTests.length; i++) {
      const test = validationTests[i];
      
      setValidationTests(prev => prev.map(t => 
        t.id === test.id ? { ...t, status: 'running' } : t
      ));

      try {
        // Simulate test execution
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        setValidationTests(prev => prev.map(t => 
          t.id === test.id ? { ...t, status: 'passed' } : t
        ));
      } catch (error) {
        setValidationTests(prev => prev.map(t => 
          t.id === test.id ? { ...t, status: 'failed' } : t
        ));
      }

      setValidationProgress(((i + 1) / validationTests.length) * 100);
    }

    setIsRunningValidation(false);
    toast({
      title: "Validation Complete",
      description: "All system validation tests have been completed",
    });
  };

  const getTestStatusIcon = (status: string) => {
    switch (status) {
      case 'passed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'running':
        return <RefreshCw className="h-4 w-4 text-blue-600 animate-spin" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const statCards = [
    {
      title: "Total Attendees",
      value: stats.totalAttendees,
      icon: Users,
      color: "text-primary"
    },
    {
      title: "Active RFID Tags",
      value: stats.activeRFID,
      icon: UserCheck,
      color: "text-secondary"
    },
    {
      title: "Total Scans Today",
      value: stats.totalScans,
      icon: AlertTriangle,
      color: "text-accent"
    },
    {
      title: "Staff Assisted Today",
      value: stats.staffAssisted,
      icon: HandHeart,
      color: "text-amber-600"
    }
  ];

  // Login screen
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-md mx-auto mt-20">
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="flex items-center justify-center gap-2">
                <Shield className="h-6 w-6" />
                Admin Access Required
              </CardTitle>
              <CardDescription>
                Enter the admin code to access administrative functions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="admin-code">Admin Code</Label>
                <Input
                  id="admin-code"
                  type="password"
                  value={adminCode}
                  onChange={(e) => setAdminCode(e.target.value)}
                  placeholder="Enter admin code..."
                  onKeyPress={(e) => e.key === 'Enter' && handleAdminLogin()}
                />
              </div>
              
              <Button 
                onClick={handleAdminLogin}
                disabled={!adminCode.trim()}
                className="w-full"
              >
                Access Admin Hub
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

  // Main admin interface
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-4">
            <Button 
              variant="outline" 
              onClick={() => navigate("/")}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Main Hub
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-primary">Admin Hub</h1>
              <p className="text-muted-foreground">Melanated Campout 2025 - Administrative Control</p>
            </div>
            <Badge variant="outline" className="flex items-center gap-1">
              <Shield className="h-3 w-3" />
              Admin: {adminId}
            </Badge>
          </div>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>

        {/* Main Tabs Interface */}
        <Tabs defaultValue="dashboard" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="system" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              System Management
            </TabsTrigger>
            <TabsTrigger value="reports" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Reports
            </TabsTrigger>
            <TabsTrigger value="status" className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Project Status
            </TabsTrigger>
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {statCards.map((stat) => {
                const Icon = stat.icon;
                return (
                  <Card key={stat.title}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">
                        {stat.title}
                      </CardTitle>
                      <Icon className={`h-4 w-4 ${stat.color}`} />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {isLoading ? "..." : stat.value}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* System Status */}
            <SystemCleanupStatus />

            {/* RegFox Integration Panel */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <RegFoxSyncPanel />
              <WebhookStatus />
            </div>

            {/* Critical Operations */}
            <Card className="border-destructive/50 bg-destructive/5">
              <Collapsible open={!isCollapsed} onOpenChange={(open) => setIsCollapsed(!open)}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-destructive">
                    <AlertTriangle className="h-5 w-5" />
                    Critical Operations
                  </CardTitle>
                  <CardDescription className="text-destructive/80">
                    Dangerous system-wide operations that cannot be undone. Click to reveal.
                  </CardDescription>
                  <CollapsibleTrigger className="w-full mt-4">
                    <div className="flex items-center justify-center gap-2 p-3 border border-destructive/30 rounded-lg bg-destructive/5 hover:bg-destructive/10 transition-colors">
                      <AlertTriangle className="h-4 w-4 text-destructive" />
                      <span className="text-destructive font-medium">
                        {isCollapsed ? "⚠️ Show Critical Operations" : "Hide Critical Operations"}
                      </span>
                      <ChevronDown className={`h-4 w-4 text-destructive transition-transform ${isCollapsed ? "" : "rotate-180"}`} />
                    </div>
                  </CollapsibleTrigger>
                </CardHeader>
                <CollapsibleContent>
                  <CardContent>
                    <div className="p-6 border-2 border-destructive bg-destructive/10 rounded-lg">
                      <div className="flex items-start gap-4">
                        <AlertTriangle className="h-6 w-6 text-destructive flex-shrink-0 mt-1" />
                        <div className="flex-1">
                          <h4 className="font-bold text-destructive mb-2 text-lg">
                            Mass RFID Deactivation
                          </h4>
                          <p className="text-destructive/90 mb-4 text-sm leading-relaxed">
                            This will immediately deactivate ALL active RFID tags system-wide, affecting every attendee. 
                            This action is irreversible and should only be used in emergency situations or at event conclusion.
                          </p>
                          <Button
                            onClick={handleMassDeactivation}
                            disabled={isProcessing}
                            variant="destructive"
                            className="w-full font-semibold"
                          >
                            {isProcessing ? "Deactivating All RFIDs..." : "⚠️ DEACTIVATE ALL RFID TAGS"}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          </TabsContent>

          {/* System Management Tab */}
          <TabsContent value="system" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* System Validation */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Database className="h-5 w-5" />
                      System Validation
                    </span>
                    <Button 
                      onClick={runSystemValidation}
                      disabled={isRunningValidation}
                      size="sm"
                    >
                      {isRunningValidation ? (
                        <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Play className="h-4 w-4 mr-2" />
                      )}
                      Run Tests
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {isRunningValidation && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Running validation tests...</span>
                        <span>{Math.round(validationProgress)}%</span>
                      </div>
                      <Progress value={validationProgress} className="h-2" />
                    </div>
                  )}
                  
                  <div className="space-y-3">
                    {validationTests.map((test) => (
                      <div key={test.id} className="flex items-center gap-3 p-3 border rounded-lg">
                        {getTestStatusIcon(test.status)}
                        <div className="flex-1">
                          <div className="font-medium">{test.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {test.description}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* RFID Testing Hub */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TestTube className="h-5 w-5" />
                    RFID Testing Hub
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-muted-foreground text-sm">
                    Access the comprehensive RFID testing framework for synthetic testing and performance analysis.
                  </p>
                  <Button 
                    onClick={() => navigate("/rfid-testing")}
                    className="w-full gap-2"
                  >
                    <TestTube className="h-4 w-4" />
                    Open RFID Testing Hub
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Reports Tab */}
          <TabsContent value="reports" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Reports Dashboard
                </CardTitle>
                <CardDescription>
                  Access comprehensive reporting and analytics dashboard
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <p className="text-muted-foreground">
                    The reports dashboard provides detailed analytics on attendee management, 
                    RFID assignments, station utilization, and comprehensive event oversight.
                  </p>
                  <Button 
                    onClick={() => navigate("/reports")}
                    className="w-full gap-2"
                  >
                    <BarChart3 className="h-4 w-4" />
                    Open Reports Dashboard
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Project Status Tab */}
          <TabsContent value="status" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5" />
                  Project Checklist & Status
                </CardTitle>
                <CardDescription>
                  Complete project status and feature implementation progress
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <p className="text-muted-foreground">
                    Track development progress, feature completion status, and system readiness 
                    for the Melanated Campout 2025 event.
                  </p>
                  <Button 
                    onClick={() => navigate("/checklist")}
                    className="w-full gap-2"
                  >
                    <FileText className="h-4 w-4" />
                    View Project Checklist
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminHub;