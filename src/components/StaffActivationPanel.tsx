import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  UserPlus, 
  Scan, 
  Search, 
  CheckCircle, 
  XCircle, 
  Users,
  Activity
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { RfidScanner } from "@/components/RfidScanner";
import { rfidLookupService, AttendeeSearchResult, RfidOperationResult } from "@/services/rfidLookupService";

interface StaffActivationPanelProps {
  staffId?: string;
}

export function StaffActivationPanel({ staffId }: StaffActivationPanelProps) {
  const [manualRfid, setManualRfid] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<AttendeeSearchResult[]>([]);
  const [selectedAttendees, setSelectedAttendees] = useState<AttendeeSearchResult[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [scanMode, setScanMode] = useState<'single' | 'bulk'>('single');
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [dailyStats, setDailyStats] = useState({ activations: 0, deactivations: 0 });
  const { toast } = useToast();

  useEffect(() => {
    loadRecentActivity();
    loadDailyStats();
  }, []);

  useEffect(() => {
    if (searchQuery.length >= 2) {
      performSearch();
    } else {
      setSearchResults([]);
    }
  }, [searchQuery]);

  const loadRecentActivity = async () => {
    const activity = await rfidLookupService.getRecentStaffActivity(10);
    setRecentActivity(activity);
  };

  const loadDailyStats = async () => {
    // This would need a dedicated function in the service for daily stats
    setDailyStats({ activations: 0, deactivations: 0 });
  };

  const performSearch = async () => {
    const results = await rfidLookupService.searchAttendees(searchQuery);
    setSearchResults(results);
  };

  const handleRfidScan = async (rfidData: any) => {
    if (scanMode === 'single') {
      await activateSingleRfid(rfidData.uid);
    } else {
      // In bulk mode, add to selection
      const attendee = await rfidLookupService.getRfidWithAttendee(rfidData.uid);
      if (attendee && !selectedAttendees.find(a => a.rfid_uid === attendee.rfid_uid)) {
        setSelectedAttendees(prev => [...prev, attendee]);
        toast({
          title: "Added to Bulk Selection",
          description: `${attendee.first_name} ${attendee.last_name} added`,
        });
      }
    }
  };

  const activateSingleRfid = async (uid: string) => {
    setIsProcessing(true);
    try {
      const result = await rfidLookupService.activateRfid(uid, staffId);
      
      if (result.success) {
        const attendee = await rfidLookupService.getRfidWithAttendee(uid);
        toast({
          title: "RFID Activated",
          description: attendee ? 
            `${attendee.first_name} ${attendee.last_name} activated successfully` :
            "RFID activated successfully",
        });
        loadRecentActivity();
        loadDailyStats();
      } else {
        toast({
          title: "Activation Failed",
          description: result.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to activate RFID",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleManualActivation = async () => {
    if (!manualRfid.trim()) return;
    await activateSingleRfid(manualRfid.trim());
    setManualRfid("");
  };

  const addToSelection = (attendee: AttendeeSearchResult) => {
    if (selectedAttendees.find(a => a.id === attendee.id)) return;
    
    setSelectedAttendees(prev => [...prev, attendee]);
    toast({
      title: "Added to Selection",
      description: `${attendee.first_name} ${attendee.last_name} added`,
    });
  };

  const removeFromSelection = (attendeeId: string) => {
    setSelectedAttendees(prev => prev.filter(a => a.id !== attendeeId));
  };

  const processBulkActivation = async () => {
    if (selectedAttendees.length === 0) return;

    setIsProcessing(true);
    try {
      const operations = selectedAttendees
        .filter(a => a.rfid_uid && a.rfid_status !== 'active')
        .map(a => ({
          rfid_uid: a.rfid_uid!,
          attendee_id: a.id,
          operation: 'activate' as const
        }));

      if (operations.length === 0) {
        toast({
          title: "No Operations Needed",
          description: "All selected attendees are already activated",
          variant: "destructive",
        });
        return;
      }

      const result = await rfidLookupService.processBulkOperations(operations, staffId);
      
      toast({
        title: "Bulk Activation Complete",
        description: `${result.processed_count} activated, ${result.failed_count} failed`,
        variant: result.success ? "default" : "destructive",
      });

      setSelectedAttendees([]);
      loadRecentActivity();
      loadDailyStats();
    } catch (error) {
      toast({
        title: "Bulk Operation Failed",
        description: "Failed to process bulk activation",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Daily Stats */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-green-600" />
              <div>
                <p className="text-sm text-muted-foreground">Today's Activations</p>
                <p className="text-2xl font-bold text-green-600">{dailyStats.activations}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-blue-600" />
              <div>
                <p className="text-sm text-muted-foreground">Mode</p>
                <Badge variant={scanMode === 'single' ? 'default' : 'secondary'}>
                  {scanMode === 'single' ? 'Single' : 'Bulk'}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Mode Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Scan className="h-5 w-5" />
            Activation Mode
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button
              variant={scanMode === 'single' ? 'default' : 'outline'}
              onClick={() => setScanMode('single')}
              className="flex-1"
            >
              Single Activation
            </Button>
            <Button
              variant={scanMode === 'bulk' ? 'default' : 'outline'}
              onClick={() => setScanMode('bulk')}
              className="flex-1"
            >
              Bulk Selection
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* RFID Scanner */}
      <RfidScanner
        onScan={handleRfidScan}
        stationType="activation"
        disabled={isProcessing}
        title="Staff RFID Scanner"
        showAttendeeInfo={true}
        autoTrigger={true}
      />

      {/* Manual RFID Entry */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Manual RFID Entry
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <div className="flex-1">
              <Label htmlFor="manual-rfid" className="sr-only">RFID UID</Label>
              <Input
                id="manual-rfid"
                value={manualRfid}
                onChange={(e) => setManualRfid(e.target.value)}
                placeholder="Enter RFID UID..."
                onKeyPress={(e) => e.key === 'Enter' && handleManualActivation()}
              />
            </div>
            <Button
              onClick={handleManualActivation}
              disabled={!manualRfid.trim() || isProcessing}
            >
              Activate
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Attendee Search */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Attendee Search
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, email, phone, or order ID..."
          />
          
          {searchResults.length > 0 && (
            <ScrollArea className="h-48">
              <div className="space-y-2">
                {searchResults.map((attendee) => (
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
                      {scanMode === 'bulk' && (
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => addToSelection(attendee)}
                          disabled={selectedAttendees.find(a => a.id === attendee.id) !== undefined}
                        >
                          Add
                        </Button>
                      )}
                      {scanMode === 'single' && attendee.rfid_uid && attendee.rfid_status !== 'active' && (
                        <Button 
                          size="sm"
                          onClick={() => activateSingleRfid(attendee.rfid_uid!)}
                          disabled={isProcessing}
                        >
                          Activate
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Bulk Selection */}
      {scanMode === 'bulk' && selectedAttendees.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Bulk Selection ({selectedAttendees.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <ScrollArea className="h-32">
              <div className="space-y-2">
                {selectedAttendees.map((attendee) => (
                  <div
                    key={attendee.id}
                    className="flex items-center justify-between p-2 bg-muted/50 rounded"
                  >
                    <span className="text-sm">
                      {attendee.first_name} {attendee.last_name}
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeFromSelection(attendee.id)}
                    >
                      <XCircle className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
            
            <div className="flex gap-2">
              <Button
                onClick={processBulkActivation}
                disabled={isProcessing}
                className="flex-1"
              >
                {isProcessing ? "Processing..." : `Activate ${selectedAttendees.length} RFIDs`}
              </Button>
              <Button
                variant="outline"
                onClick={() => setSelectedAttendees([])}
              >
                Clear
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-32">
            <div className="space-y-2">
              {recentActivity.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-center justify-between p-2 text-sm"
                >
                  <div className="flex items-center gap-2">
                    {activity.transaction_type === 'activate' ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-600" />
                    )}
                    <span>
                      {(activity.attendee as any)?.first_name} {(activity.attendee as any)?.last_name}
                    </span>
                  </div>
                  <div className="text-muted-foreground">
                    {new Date(activity.created_at).toLocaleTimeString()}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}