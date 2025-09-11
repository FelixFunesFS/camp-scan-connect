import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Scan, MapPin, CheckCircle, XCircle, ArrowLeft, Clock, Shield, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

interface ScanResult {
  id: number;
  rfid_uid: string;
  location: string;
  result: 'allow' | 'deny';
  reason: string;
  scanned_at: string;
  extra?: any;
}

const Ranger = () => {
  const [selectedLocation, setSelectedLocation] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [recentScans, setRecentScans] = useState<ScanResult[]>([]);
  const [stats, setStats] = useState({ allowed: 0, denied: 0 });
  const [overrideMode, setOverrideMode] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const locations = [
    { value: "gate_main", label: "Main Gate" },
    { value: "early_gate", label: "Early Gate" }, 
    { value: "power_zone", label: "Power Zone" }
  ];

  useEffect(() => {
    loadRecentScans();
    const interval = setInterval(loadRecentScans, 10000); // Refresh every 10 seconds
    return () => clearInterval(interval);
  }, []);

  const loadRecentScans = async () => {
    try {
      const { data, error } = await supabase
        .from('scans')
        .select('*')
        .order('scanned_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      
      setRecentScans(data || []);
      
      // Calculate stats
      const allowed = data?.filter(scan => scan.result === 'allow').length || 0;
      const denied = data?.filter(scan => scan.result === 'deny').length || 0;
      setStats({ allowed, denied });
    } catch (error) {
      console.error('Error loading scans:', error);
    }
  };

  const checkAccess = (location: string, attendee: any = null): { allow: boolean; reason: string } => {
    const now = new Date();
    
    // September 2025 access windows (EDT UTC-04)
    const earlyStart = new Date('2025-09-25T12:00:00-04:00'); // Sep 25 12:00 EDT
    const mainStart = new Date('2025-09-26T06:00:00-04:00');  // Sep 26 06:00 EDT
    const eventEnd = new Date('2025-09-28T23:59:00-04:00');   // Sep 28 23:59 EDT
    
    // If override mode is active, allow all access
    if (overrideMode) {
      return { allow: true, reason: 'Override mode active' };
    }
    
    // Check if we're before event starts
    if (now < earlyStart) {
      return { allow: false, reason: 'Event has not started yet' };
    }
    
    // Check if we're after event ends
    if (now > eventEnd) {
      return { allow: false, reason: 'Event has ended' };
    }
    
    // Location-specific access rules
    switch (location) {
      case 'early_gate':
        if (now >= earlyStart && now < mainStart) {
          // Early check-in window - would check attendee.arrival_window === 'early' in real implementation
          return { allow: true, reason: 'Early check-in access' };
        } else if (now >= mainStart) {
          return { allow: false, reason: 'Use Main Gate - early check-in closed' };
        }
        break;
        
      case 'gate_main':
        if (now >= mainStart) {
          return { allow: true, reason: 'Main gate access' };
        } else {
          return { allow: false, reason: 'Main gate opens Sep 26 at 6:00 AM' };
        }
        
      case 'power_zone':
        if (now >= earlyStart) {
          // Would check attendee.ticket_type === 'premium_power' in real implementation
          return { allow: Math.random() > 0.3, reason: Math.random() > 0.3 ? 'Premium power access' : 'Premium ticket required' };
        }
        break;
    }
    
    return { allow: false, reason: 'Access not permitted at this time' };
  };

  const handleScan = async () => {
    if (!selectedLocation) {
      toast({
        title: "Location Required",
        description: "Please select a location before scanning.",
        variant: "destructive"
      });
      return;
    }

    setIsScanning(true);
    
    try {
      const mockUID = `TAG_${Date.now()}`;
      const accessCheck = checkAccess(selectedLocation);
      
      const scanData = {
        rfid_uid: mockUID,
        location: selectedLocation,
        action: 'verify' as const,
        result: accessCheck.allow ? 'allow' as const : 'deny' as const,
        reason: accessCheck.reason,
        extra: overrideMode ? { override_used: true } : null
      };

      const { data, error } = await supabase
        .from('scans')
        .insert(scanData)
        .select()
        .single();

      if (error) throw error;

      toast({
        title: data.result === 'allow' ? "Access Granted" : "Access Denied",
        description: data.reason,
        variant: data.result === 'allow' ? "default" : "destructive"
      });

      loadRecentScans();
    } catch (error) {
      console.error('Scan error:', error);
      toast({
        title: "Scan Error",
        description: "Failed to process scan. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsScanning(false);
    }
  };

  const handleBackToRoles = () => {
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold text-accent">Ranger Station</h1>
              {overrideMode && (
                <Badge variant="destructive" className="flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  OVERRIDE ACTIVE
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground">RFID scanning and access control</p>
          </div>
          <Button variant="outline" onClick={handleBackToRoles}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Role Selection
          </Button>
        </div>

        {/* Override Mode Toggle */}
        <Card className="mb-6 border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-900/10">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Shield className="h-5 w-5 text-amber-600" />
                <div>
                  <Label className="text-sm font-medium">Early Check-In Override</Label>
                  <p className="text-xs text-muted-foreground">
                    Bypass time restrictions for early arrivals
                  </p>
                </div>
              </div>
              <Switch
                checked={overrideMode}
                onCheckedChange={setOverrideMode}
              />
            </div>
            {overrideMode && (
              <div className="mt-3 p-2 rounded-md bg-amber-100 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                <p className="text-xs text-amber-800 dark:text-amber-200">
                  ⚠️ Override mode allows access regardless of time restrictions. All scans will be logged with override flag.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Allowed Today</p>
                  <p className="text-2xl font-bold text-green-600">{stats.allowed}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Denied Today</p>
                  <p className="text-2xl font-bold text-red-600">{stats.denied}</p>
                </div>
                <XCircle className="h-8 w-8 text-red-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Scanning Interface */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Scan className="h-5 w-5" />
              RFID Scanner
            </CardTitle>
            <CardDescription>
              Select location and scan RFID tags for access control
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-sm font-medium mb-2 block">Scan Location</Label>
              <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                <SelectTrigger>
                  <SelectValue placeholder="Select scanning location" />
                </SelectTrigger>
                <SelectContent>
                  {locations.map((location) => (
                    <SelectItem key={location.value} value={location.value}>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        {location.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button 
              onClick={handleScan}
              disabled={isScanning || !selectedLocation}
              className="w-full h-20 text-xl"
              size="lg"
            >
              {isScanning ? (
                <>
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mr-3"></div>
                  Scanning...
                </>
              ) : (
                <>
                  <Scan className="h-8 w-8 mr-3" />
                  Tap to Scan RFID Tag
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Recent Scans */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Recent Scans
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentScans.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">
                  No scans yet. Start scanning to see results here.
                </p>
              ) : (
                recentScans.map((scan) => (
                  <div key={scan.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      {scan.result === 'allow' ? (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-600" />
                      )}
                      <div>
                        <p className="font-medium">{scan.rfid_uid}</p>
                        <p className="text-sm text-muted-foreground">
                          {locations.find(l => l.value === scan.location)?.label || scan.location}
                        </p>
                      </div>
                    </div>
                    <div className="text-right flex flex-col items-end gap-1">
                      <div className="flex items-center gap-2">
                        <Badge variant={scan.result === 'allow' ? 'default' : 'destructive'}>
                          {scan.result}
                        </Badge>
                        {scan.extra?.override_used && (
                          <Badge variant="outline" className="text-xs">
                            <Shield className="h-3 w-3 mr-1" />
                            OVERRIDE
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {new Date(scan.scanned_at).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Ranger;