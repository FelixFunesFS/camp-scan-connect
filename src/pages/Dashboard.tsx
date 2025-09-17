import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
// Force rebuild to fix TestTube import issue
import { Users, UserCheck, AlertTriangle, HandHeart, LogOut, Download, TestTube, Power, ChevronDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { RegFoxSyncPanel } from "@/components/RegFoxSyncPanel";
import { WebhookStatus } from "@/components/WebhookStatus";
import { SystemCleanupStatus } from "@/components/SystemCleanupStatus";
import { PhoneActivationService } from "@/services/phoneActivationService";

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalAttendees: 0,
    activeRFID: 0,
    totalScans: 0,
    staffAssisted: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
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

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-primary">Admin Dashboard</h1>
            <p className="text-muted-foreground">Melanated Campout 2025 - System Overview</p>
          </div>
          <Button variant="outline" onClick={handleSignOut}>
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
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


        {/* Administrative Controls */}
        <div className="mb-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Power className="h-5 w-5" />
                Administrative Controls
              </CardTitle>
              <CardDescription>System testing and management utilities</CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                variant="outline" 
                onClick={() => navigate("/rfid-testing")}
                className="gap-2"
              >
                <TestTube className="h-4 w-4" />
                RFID Testing Hub
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* System Cleanup Status */}
        <div className="mb-8">
          <SystemCleanupStatus />
        </div>

        {/* RegFox Integration Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <RegFoxSyncPanel />
          <WebhookStatus />
        </div>

        {/* System Status */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>System Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <Badge variant="secondary">Database Connected</Badge>
              <Badge variant="secondary">Authentication Active</Badge>
              <Badge variant="outline">
                Last Updated: {new Date().toLocaleTimeString()}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Critical Operations - Positioned at Bottom for Safety */}
        <div className="mt-12 pt-8 border-t-2 border-destructive/20">
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
                  <div className="p-6 border-2 border-destructive bg-destructive/10 rounded-lg animate-accordion-down">
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
        </div>
      </div>
    </div>
  );
};

export default Dashboard;