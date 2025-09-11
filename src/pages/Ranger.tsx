import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Scan, MapPin, CheckCircle, XCircle, ArrowLeft, Clock } from "lucide-react";
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
}

const Ranger = () => {
  const [selectedLocation, setSelectedLocation] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [recentScans, setRecentScans] = useState<ScanResult[]>([]);
  const [stats, setStats] = useState({ allowed: 0, denied: 0 });
  const navigate = useNavigate();
  const { toast } = useToast();

  const locations = [
    { value: "gate_main", label: "Main Gate" },
    { value: "gate_early", label: "Early Gate" },
    { value: "meals", label: "Meal Station" },
    { value: "bar", label: "Bar" },
    { value: "headphones", label: "Headphones Station" },
    { value: "activity_1", label: "Activity Area 1" },
    { value: "activity_2", label: "Activity Area 2" },
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
    
    // Simulate NFC scan or manual entry
    try {
      // For now, we'll simulate a successful scan
      // In real implementation, this would integrate with Web NFC API
      const mockUID = `TAG_${Date.now()}`;
      
      const { data, error } = await supabase
        .from('scans')
        .insert({
          rfid_uid: mockUID,
          location: selectedLocation,
          action: 'verify',
          result: Math.random() > 0.2 ? 'allow' : 'deny', // 80% success rate for demo
          reason: Math.random() > 0.2 ? 'Valid access' : 'Tag not found'
        })
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
            <h1 className="text-3xl font-bold text-accent">Ranger Station</h1>
            <p className="text-muted-foreground">RFID scanning and access control</p>
          </div>
          <Button variant="outline" onClick={handleBackToRoles}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Role Selection
          </Button>
        </div>

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
                    <div className="text-right">
                      <Badge variant={scan.result === 'allow' ? 'default' : 'destructive'}>
                        {scan.result}
                      </Badge>
                      <p className="text-xs text-muted-foreground mt-1">
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