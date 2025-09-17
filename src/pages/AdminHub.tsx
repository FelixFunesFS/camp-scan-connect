import * as React from 'react';
const { useState, useEffect } = React;
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { 
  CreditCard, 
  BarChart3, 
  Eye,
  EyeOff,
  LogOut,
  Users,
  FileText
} from "lucide-react";
import { RfidAssignmentTab } from "@/components/RfidAssignmentTab";

const AdminHub = () => {
  try {
    // Safety check for React availability
    if (!React || !useState || !useEffect) {
      console.error('React hooks not available in AdminHub');
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Loading AdminHub...</h1>
            <p className="text-muted-foreground">Please wait while the application initializes.</p>
          </div>
        </div>
      );
    }

    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [adminCode, setAdminCode] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [activeTab, setActiveTab] = useState('dashboard');
    const { toast } = useToast();

    const handleAdminLogin = () => {
      if (adminCode.toLowerCase() === 'admin2025') {
        setIsAuthenticated(true);
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
      setAdminCode('');
      toast({
        title: "Logged Out",
        description: "Admin session ended successfully",
      });
    };

    if (!isAuthenticated) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="space-y-1 text-center">
              <CardTitle className="text-2xl font-bold">Admin Hub</CardTitle>
              <CardDescription>Enter admin code to access dashboard</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="admin-code">Admin Code</Label>
                <div className="relative">
                  <Input
                    id="admin-code"
                    type={showPassword ? "text" : "password"}
                    value={adminCode}
                    onChange={(e) => setAdminCode(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAdminLogin()}
                    placeholder="Enter admin code"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-auto p-1"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              <Button 
                onClick={handleAdminLogin} 
                className="w-full"
                disabled={!adminCode}
              >
                Access Admin Hub
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }

    // Simplified tabs for core functionality
    const tabs = [
      { 
        id: 'dashboard', 
        label: 'Dashboard', 
        icon: BarChart3, 
        component: (
          <div className="p-6">
            <Card>
              <CardHeader>
                <CardTitle>Admin Dashboard</CardTitle>
                <CardDescription>System overview and management tools</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Welcome to the Admin Hub. Use the tabs above to navigate to different tools.</p>
              </CardContent>
            </Card>
          </div>
        )
      },
      { 
        id: 'rfid-assignment', 
        label: 'RFID Assignment', 
        icon: CreditCard, 
        component: <RfidAssignmentTab />
      },
      { 
        id: 'reports', 
        label: 'Reports', 
        icon: FileText, 
        component: (
          <div className="p-6">
            <Card>
              <CardHeader>
                <CardTitle>Reports Dashboard</CardTitle>
                <CardDescription>Event analytics and management insights</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Reports functionality coming soon.</p>
              </CardContent>
            </Card>
          </div>
        )
      },
      { 
        id: 'staff', 
        label: 'Staff Tools', 
        icon: Users, 
        component: (
          <div className="p-6">
            <Card>
              <CardHeader>
                <CardTitle>Staff Management</CardTitle>
                <CardDescription>Staff activation and management tools</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Staff tools coming soon.</p>
              </CardContent>
            </Card>
          </div>
        )
      }
    ];

    return (
      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container flex h-16 items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-xl font-bold">Admin Hub</h1>
            </div>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </header>

        {/* Main Content */}
        <div className="container mx-auto p-6">
          {/* Tab Navigation */}
          <div className="flex gap-2 mb-6">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <Button
                  key={tab.id}
                  variant={activeTab === tab.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => setActiveTab(tab.id)}
                  className="flex items-center gap-2"
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </Button>
              );
            })}
          </div>

          {/* Tab Content */}
          <div className="min-h-[600px]">
            {tabs.find(tab => tab.id === activeTab)?.component}
          </div>
        </div>
      </div>
    );

  } catch (error) {
    console.error('Error in AdminHub:', error);
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4 text-destructive">Admin Hub Error</h1>
          <p className="text-muted-foreground">There was an error loading the admin panel.</p>
          <Button 
            onClick={() => window.location.reload()} 
            className="mt-4"
          >
            Reload Page
          </Button>
        </div>
      </div>
    );
  }
};

export default AdminHub;