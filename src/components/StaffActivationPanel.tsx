import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Users, UserCheck, UserMinus, Activity, Search, Zap } from 'lucide-react';

interface StaffStats {
  totalAttendees: number;
  activatedAttendees: number;
  todayActivations: number;
  activationRate: number;
}

export const StaffActivationPanel: React.FC = () => {
  const [staffCode, setStaffCode] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [stats, setStats] = useState<StaffStats>({
    totalAttendees: 0,
    activatedAttendees: 0,
    todayActivations: 0,
    activationRate: 0
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  
  const { toast } = useToast();

  const handleStaffLogin = () => {
    if (staffCode.toLowerCase() === 'staff2025') {
      setIsAuthenticated(true);
      toast({
        title: "Staff Access Granted",
        description: "You can now manage attendee activations",
      });
      loadStats();
    } else {
      toast({
        title: "Invalid Staff Code",
        description: "Please enter the correct staff access code",
        variant: "destructive",
      });
    }
  };

  const loadStats = async () => {
    try {
      const { data: attendeeData } = await supabase
        .from('attendees')
        .select('id, activated_at');

      const today = new Date().toISOString().split('T')[0];
      const { data: todayActivations } = await supabase
        .from('station_transactions')
        .select('id')
        .eq('transaction_type', 'activate')
        .gte('created_at', `${today}T00:00:00.000Z`)
        .lt('created_at', `${today}T23:59:59.999Z`);

      const totalAttendees = attendeeData?.length || 0;
      const activatedAttendees = attendeeData?.filter(a => a.activated_at).length || 0;
      const activationRate = totalAttendees > 0 ? (activatedAttendees / totalAttendees) * 100 : 0;

      setStats({
        totalAttendees,
        activatedAttendees,
        todayActivations: todayActivations?.length || 0,
        activationRate
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const handleQuickActivation = async () => {
    if (!searchQuery.trim()) return;
    
    setIsProcessing(true);
    try {
      // Simple activation logic - this would be expanded based on your needs
      toast({
        title: "Activation Processed",
        description: `Searched for: ${searchQuery}`,
      });
      setSearchQuery('');
      loadStats();
    } catch (error) {
      toast({
        title: "Activation Failed",
        description: "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadStats();
      const interval = setInterval(loadStats, 30000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Staff Tools Access
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Input
              type="password"
              placeholder="Enter staff code"
              value={staffCode}
              onChange={(e) => setStaffCode(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleStaffLogin()}
            />
            <Button 
              onClick={handleStaffLogin} 
              className="w-full"
              disabled={!staffCode}
            >
              Access Staff Tools
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{stats.totalAttendees}</div>
            <p className="text-xs text-muted-foreground">Total Attendees</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-emerald-600">{stats.activatedAttendees}</div>
            <p className="text-xs text-muted-foreground">Activated</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">{stats.todayActivations}</div>
            <p className="text-xs text-muted-foreground">Today's Activations</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{Math.round(stats.activationRate)}%</div>
            <p className="text-xs text-muted-foreground">Activation Rate</p>
            <Progress value={stats.activationRate} className="mt-2 h-2" />
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="activation" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="activation">Quick Activation</TabsTrigger>
          <TabsTrigger value="management">Attendee Management</TabsTrigger>
        </TabsList>

        <TabsContent value="activation" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Quick Activation
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name, email, phone, or RFID..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                    onKeyPress={(e) => e.key === 'Enter' && handleQuickActivation()}
                  />
                </div>
                <Button 
                  onClick={handleQuickActivation}
                  disabled={!searchQuery.trim() || isProcessing}
                >
                  {isProcessing ? 'Processing...' : 'Activate'}
                </Button>
              </div>
              
              <div className="text-sm text-muted-foreground">
                Enter attendee details to quickly activate their RFID and grant access to stations.
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="management" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Attendee Management
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Full attendee management tools available in the main Staff Activation Hub.</p>
                <p className="text-sm mt-2">Use the Event Management tab for comprehensive attendee operations.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};