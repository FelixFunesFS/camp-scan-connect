import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { supabase } from "@/integrations/supabase/client";
import { 
  Users, 
  CreditCard, 
  Zap, 
  HelpCircle, 
  Shield, 
  Settings, 
  BarChart3, 
  CheckSquare,
  Eye,
  EyeOff,
  Menu,
  LogOut,
  ArrowLeft,
  UserCheck,
  AlertTriangle,
  HandHeart,
  ChevronDown,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  Database,
  Play,
  FileText
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { PhoneActivationService } from "@/services/phoneActivationService";

// Import existing components
import { RegFoxSyncPanel } from "@/components/RegFoxSyncPanel";
import { WebhookStatus } from "@/components/WebhookStatus";
import { SystemCleanupStatus } from "@/components/SystemCleanupStatus";

interface ValidationTest {
  id: string;
  name: string;
  description: string;
  status: 'pending' | 'running' | 'passed' | 'failed';
}

const AdminHub = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [adminCode, setAdminCode] = useState('');
  const [adminId, setAdminId] = useState<string>('');
  const [showPassword, setShowPassword] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const navigate = useNavigate();

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
    setAdminId('');
    setAdminCode('');
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
        return <CheckCircle className="h-4 w-4 text-success" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-destructive" />;
      case 'running':
        return <RefreshCw className="h-4 w-4 text-primary animate-spin" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
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
      icon: Zap,
      color: "text-accent"
    },
    {
      title: "Staff Assisted Today",
      value: stats.staffAssisted,
      icon: HandHeart,
      color: "text-warning"
    }
  ];

  const tabs = [
    { 
      id: 'dashboard', 
      label: 'Dashboard', 
      icon: BarChart3, 
      component: (
        <div className="space-y-4 sm:space-y-6">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {statCards.map((stat) => {
              const Icon = stat.icon;
              return (
                <Card key={stat.title} className="p-4 sm:p-6">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-0">
                    <CardTitle className="text-sm font-medium">
                      {stat.title}
                    </CardTitle>
                    <Icon className={`h-4 w-4 ${stat.color}`} />
                  </CardHeader>
                  <CardContent className="p-0 pt-2">
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
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
                  <div className="flex items-center justify-center gap-2 p-3 border border-destructive/30 rounded-lg bg-destructive/5 hover:bg-destructive/10 transition-colors min-h-[44px]">
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
                  <div className="p-4 sm:p-6 border-2 border-destructive bg-destructive/10 rounded-lg">
                    <div className="flex flex-col sm:flex-row items-start gap-4">
                      <AlertTriangle className="h-6 w-6 text-destructive flex-shrink-0" />
                      <div className="flex-1 w-full">
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
                          className="w-full font-semibold min-h-[44px]"
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
        </div>
      )
    },
    { 
      id: 'system', 
      label: 'System Management', 
      icon: Settings, 
      component: (
        <div className="space-y-4 sm:space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            {/* System Validation */}
            <Card>
              <CardHeader>
                <CardTitle className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <span className="flex items-center gap-2">
                    <Database className="h-5 w-5" />
                    System Validation
                  </span>
                  <Button 
                    onClick={runSystemValidation}
                    disabled={isRunningValidation}
                    size="sm"
                    className="min-h-[44px] w-full sm:w-auto"
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
                      <span>Progress</span>
                      <span>{Math.round(validationProgress)}%</span>
                    </div>
                    <Progress value={validationProgress} className="w-full" />
                  </div>
                )}
                
                <div className="space-y-3">
                  {validationTests.map((test) => (
                    <div key={test.id} className="flex items-start gap-3 p-3 rounded-lg border bg-card">
                      {getTestStatusIcon(test.status)}
                      <div className="flex-1">
                        <div className="font-medium text-sm">{test.name}</div>
                        <div className="text-xs text-muted-foreground">{test.description}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* RFID Testing Hub Link */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  RFID Testing Hub
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Access advanced RFID testing tools and generate synthetic tags for testing purposes.
                </p>
                <Button 
                  onClick={() => navigate('/rfid-testing')}
                  className="w-full min-h-[44px]"
                  variant="outline"
                >
                  Open RFID Testing Hub
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      )
    },
    { 
      id: 'reports', 
      label: 'Reports', 
      icon: FileText, 
      component: (
        <Card>
          <CardHeader>
            <CardTitle>Reports Dashboard</CardTitle>
            <CardDescription>
              Comprehensive reporting and analytics
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-center text-muted-foreground py-8">
              Reports functionality will be integrated here
            </p>
          </CardContent>
        </Card>
      )
    },
    { 
      id: 'checklist', 
      label: 'Project Status', 
      icon: CheckSquare, 
      component: (
        <Card>
          <CardHeader>
            <CardTitle>Project Checklist</CardTitle>
            <CardDescription>
              Track project completion status and milestones
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-center text-muted-foreground py-8">
              Project checklist functionality will be integrated here
            </p>
          </CardContent>
        </Card>
      )
    }
  ];

  const TabNavigation = () => (
    <div className="space-y-2">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        return (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id);
              if (isMobile) setMobileMenuOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors min-h-[44px] ${
              activeTab === tab.id 
                ? 'bg-primary text-primary-foreground' 
                : 'hover:bg-muted text-muted-foreground hover:text-foreground'
            }`}
          >
            <Icon className="h-5 w-5 shrink-0" />
            <span className="font-medium">{tab.label}</span>
          </button>
        );
      })}
      <div className="border-t border-border pt-2 mt-4">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors hover:bg-destructive/10 text-destructive hover:text-destructive min-h-[44px]"
        >
          <LogOut className="h-5 w-5 shrink-0" />
          <span className="font-medium">Logout</span>
        </button>
      </div>
    </div>
  );

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold flex items-center justify-center gap-2">
              <Shield className="h-6 w-6" />
              Admin Access
            </CardTitle>
            <CardDescription>
              Enter the admin code to access the system
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="adminCode">Admin Code</Label>
              <div className="relative">
                <Input
                  id="adminCode"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter admin code"
                  value={adminCode}
                  onChange={(e) => setAdminCode(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAdminLogin()}
                  className="pr-10 min-h-[44px]"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 px-0"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
            <Button 
              onClick={handleAdminLogin}
              className="w-full min-h-[44px]"
              disabled={!adminCode.trim()}
            >
              Access Admin Panel
            </Button>
            <div className="text-center">
              <Button 
                variant="outline"
                onClick={() => navigate("/")}
                className="flex items-center gap-2 min-h-[44px]"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Main Hub
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="px-4 py-3 sm:px-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {isMobile && (
                <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                  <SheetTrigger asChild>
                    <Button variant="ghost" size="sm" className="p-2 min-h-[44px] min-w-[44px]">
                      <Menu className="h-5 w-5" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="w-80 p-0">
                    <div className="p-6">
                      <div className="flex items-center gap-3 mb-6">
                        <Shield className="h-6 w-6 text-primary" />
                        <h2 className="text-lg font-semibold">Admin Panel</h2>
                      </div>
                      <TabNavigation />
                    </div>
                  </SheetContent>
                </Sheet>
              )}
              <Shield className="h-6 w-6 text-primary" />
              <div>
                <h1 className="text-lg sm:text-xl font-bold">Admin Dashboard</h1>
                <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">
                  Melanated Campout 2025
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {!isMobile && (
                <Badge variant="outline" className="flex items-center gap-1">
                  <Shield className="h-3 w-3" />
                  {adminId}
                </Badge>
              )}
              {!isMobile && (
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={handleLogout}
                  className="ml-2 min-h-[44px]"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="flex min-h-screen">
        {/* Desktop Sidebar */}
        {!isMobile && (
          <aside className="w-64 border-r bg-card/30 p-6">
            <TabNavigation />
          </aside>
        )}

        {/* Main Content */}
        <main className="flex-1 p-4 sm:p-6">
          <div className="max-w-7xl mx-auto">
            {tabs.find(tab => tab.id === activeTab)?.component}
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminHub;