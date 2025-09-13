import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, UserCheck, AlertTriangle, Zap, LogOut, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { RegFoxSyncPanel } from "@/components/RegFoxSyncPanel";
import { WebhookStatus } from "@/components/WebhookStatus";

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalAttendees: 0,
    activeRFID: 0,
    totalScans: 0,
    powerSites: 0
  });
  const [isLoading, setIsLoading] = useState(true);
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

      // Get power site attendees
      const { count: powerCount } = await supabase
        .from('attendees')
        .select('*', { count: 'exact', head: true })
        .eq('ticket_type', 'premium_power');

      setStats({
        totalAttendees: attendeeCount || 0,
        activeRFID: rfidCount || 0,
        totalScans: scanCount || 0,
        powerSites: powerCount || 0
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
      title: "Power Site Attendees",
      value: stats.powerSites,
      icon: Zap,
      color: "text-muted-foreground"
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

        {/* Action Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCheck className="h-5 w-5 text-secondary" />
                Check-In Station
              </CardTitle>
              <CardDescription>
                Attendee lookup, RFID activation, and campsite assignment
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={() => navigate("/check-in")}
                className="w-full"
              >
                Open Check-In
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                View Reports
              </CardTitle>
              <CardDescription>
                Detailed analytics, exports, and system reports
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                variant="outline"
                onClick={() => navigate("/reports")}
                className="w-full"
              >
                View Reports
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                Import Data
              </CardTitle>
              <CardDescription>
                Upload RegFox CSV files and manage attendee data
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                variant="outline"
                onClick={() => navigate("/import")}
                className="w-full"
              >
                Import Data
              </Button>
            </CardContent>
          </Card>
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
      </div>
    </div>
  );
};

export default Dashboard;