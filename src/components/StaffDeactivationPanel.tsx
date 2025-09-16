import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { 
  UserMinus, 
  Scan, 
  Search, 
  CheckCircle, 
  XCircle, 
  Users,
  Activity,
  AlertTriangle,
  PowerOff
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { RfidScanner } from "@/components/RfidScanner";
import { rfidLookupService, AttendeeSearchResult, BulkRfidOperation } from "@/services/rfidLookupService";

interface StaffDeactivationPanelProps {
  staffId?: string;
}

const DEACTIVATION_REASONS = [
  { value: "lost", label: "Lost RFID" },
  { value: "damaged", label: "Damaged RFID" },
  { value: "replaced", label: "Replaced with New RFID" },
  { value: "checkout", label: "Event Checkout/Departure" },
  { value: "sunday_mass", label: "Sunday Mass Deactivation" },
  { value: "staff_request", label: "Staff Request" },
  { value: "security", label: "Security Issue" },
  { value: "other", label: "Other" },
];

export function StaffDeactivationPanel({ staffId }: StaffDeactivationPanelProps) {
  const [manualRfid, setManualRfid] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<AttendeeSearchResult[]>([]);
  const [selectedAttendees, setSelectedAttendees] = useState<AttendeeSearchResult[]>([]);
  const [selectedReason, setSelectedReason] = useState("other");
  const [customReason, setCustomReason] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeRfids, setActiveRfids] = useState<AttendeeSearchResult[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [showMassDeactivation, setShowMassDeactivation] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadActiveRfids();
    loadRecentActivity();
  }, []);

  useEffect(() => {
    if (searchQuery.length >= 2) {
      performSearch();
    } else {
      setSearchResults([]);
    }
  }, [searchQuery]);

  const loadActiveRfids = async () => {
    const rfids = await rfidLookupService.getActiveRfids();
    setActiveRfids(rfids);
  };

  const loadRecentActivity = async () => {
    const activity = await rfidLookupService.getRecentStaffActivity(10);
    setRecentActivity(activity.filter(a => a.transaction_type === 'deactivate'));
  };

  const performSearch = async () => {
    const results = await rfidLookupService.searchAttendees(searchQuery);
    // Filter to only active RFIDs
    const activeResults = results.filter(r => r.rfid_status === 'active');
    setSearchResults(activeResults);
  };

  const getReasonText = () => {
    if (selectedReason === "other") {
      return customReason.trim() || "Other reason";
    }
    return DEACTIVATION_REASONS.find(r => r.value === selectedReason)?.label || "Other reason";
  };

  const handleRfidScan = async (rfidData: any) => {
    await deactivateSingleRfid(rfidData.uid);
  };

  const deactivateSingleRfid = async (uid: string) => {
    setIsProcessing(true);
    try {
      const reason = getReasonText();
      const result = await rfidLookupService.deactivateRfid(uid, reason, staffId);
      
      if (result.success) {
        const attendee = await rfidLookupService.getRfidWithAttendee(uid);
        toast({
          title: "RFID Deactivated",
          description: attendee ? 
            `${attendee.first_name} ${attendee.last_name} deactivated` :
            "RFID deactivated successfully",
        });
        loadActiveRfids();
        loadRecentActivity();
      } else {
        toast({
          title: "Deactivation Failed",
          description: result.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to deactivate RFID",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleManualDeactivation = async () => {
    if (!manualRfid.trim()) return;
    await deactivateSingleRfid(manualRfid.trim());
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

  const toggleAllSelection = () => {
    if (selectedAttendees.length === activeRfids.length) {
      setSelectedAttendees([]);
    } else {
      setSelectedAttendees([...activeRfids]);
    }
  };

  const processBulkDeactivation = async () => {
    if (selectedAttendees.length === 0) return;

    setIsProcessing(true);
    try {
      const reason = getReasonText();
      const operations: BulkRfidOperation[] = selectedAttendees
        .filter(a => a.rfid_uid)
        .map(a => ({
          rfid_uid: a.rfid_uid!,
          attendee_id: a.id,
          operation: 'deactivate' as const,
          reason: reason
        }));

      const result = await rfidLookupService.processBulkOperations(operations, staffId);
      
      toast({
        title: "Bulk Deactivation Complete",
        description: `${result.processed_count} deactivated, ${result.failed_count} failed`,
        variant: result.success ? "default" : "destructive",
      });

      setSelectedAttendees([]);
      loadActiveRfids();
      loadRecentActivity();
    } catch (error) {
      toast({
        title: "Bulk Operation Failed",
        description: "Failed to process bulk deactivation",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMassDeactivation = async () => {
    setIsProcessing(true);
    try {
      const reason = getReasonText();
      const result = await rfidLookupService.massDeactivateAll(reason, staffId);
      
      toast({
        title: "Mass Deactivation Complete",
        description: result.message,
        variant: result.success ? "default" : "destructive",
      });

      loadActiveRfids();
      loadRecentActivity();
      setShowMassDeactivation(false);
    } catch (error) {
      toast({
        title: "Mass Deactivation Failed",
        description: "Failed to perform mass deactivation",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats and Controls */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-600" />
              <div>
                <p className="text-sm text-muted-foreground">Active RFIDs</p>
                <p className="text-2xl font-bold text-blue-600">{activeRfids.length}</p>
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
                <p className="text-2xl font-bold text-red-600">{recentActivity.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Reason Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Deactivation Reason
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="reason">Select Reason</Label>
            <Select value={selectedReason} onValueChange={setSelectedReason}>
              <SelectTrigger>
                <SelectValue placeholder="Select a reason" />
              </SelectTrigger>
              <SelectContent>
                {DEACTIVATION_REASONS.map((reason) => (
                  <SelectItem key={reason.value} value={reason.value}>
                    {reason.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {selectedReason === "other" && (
            <div className="space-y-2">
              <Label htmlFor="custom-reason">Custom Reason</Label>
              <Textarea
                id="custom-reason"
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                placeholder="Enter custom reason..."
                rows={2}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* RFID Scanner */}
      <RfidScanner
        onScan={handleRfidScan}
        stationType="activation"
        disabled={isProcessing}
        title="Staff RFID Scanner (Deactivation)"
        showAttendeeInfo={true}
        autoTrigger={true}
      />

      {/* Manual RFID Entry */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserMinus className="h-5 w-5" />
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
                onKeyPress={(e) => e.key === 'Enter' && handleManualDeactivation()}
              />
            </div>
            <Button
              onClick={handleManualDeactivation}
              disabled={!manualRfid.trim() || isProcessing}
              variant="destructive"
            >
              Deactivate
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Attendee Search */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Search Active Attendees
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
                        {attendee.ticket_type} • RFID: {attendee.rfid_uid}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => addToSelection(attendee)}
                        disabled={selectedAttendees.find(a => a.id === attendee.id) !== undefined}
                      >
                        Add
                      </Button>
                      <Button 
                        size="sm"
                        variant="destructive"
                        onClick={() => deactivateSingleRfid(attendee.rfid_uid!)}
                        disabled={isProcessing}
                      >
                        Deactivate
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Bulk Operations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Bulk Operations
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="select-all"
                checked={selectedAttendees.length === activeRfids.length && activeRfids.length > 0}
                onCheckedChange={toggleAllSelection}
              />
              <Label htmlFor="select-all">
                Select All Active RFIDs ({activeRfids.length})
              </Label>
            </div>
            <Badge variant="secondary">
              {selectedAttendees.length} selected
            </Badge>
          </div>

          {selectedAttendees.length > 0 && (
            <div className="space-y-2">
              <ScrollArea className="h-32 border rounded p-2">
                <div className="space-y-1">
                  {selectedAttendees.map((attendee) => (
                    <div
                      key={attendee.id}
                      className="flex items-center justify-between text-sm p-1"
                    >
                      <span>
                        {attendee.first_name} {attendee.last_name}
                      </span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeFromSelection(attendee.id)}
                      >
                        <XCircle className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </ScrollArea>
              
              <Button
                onClick={processBulkDeactivation}
                disabled={isProcessing}
                variant="destructive"
                className="w-full"
              >
                {isProcessing ? "Processing..." : `Deactivate ${selectedAttendees.length} RFIDs`}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Mass Deactivation */}
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <PowerOff className="h-5 w-5" />
            Mass Deactivation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            This will deactivate ALL active RFID tags in the system. This action cannot be undone.
          </p>
          
          <AlertDialog open={showMassDeactivation} onOpenChange={setShowMassDeactivation}>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="w-full">
                <PowerOff className="h-4 w-4 mr-2" />
                Mass Deactivate All RFIDs ({activeRfids.length})
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Confirm Mass Deactivation</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to deactivate all {activeRfids.length} active RFID tags? 
                  This action cannot be undone and will affect all active attendees.
                  <br /><br />
                  Reason: <strong>{getReasonText()}</strong>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction 
                  onClick={handleMassDeactivation}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Confirm Deactivation
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Recent Deactivations
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
                    <XCircle className="h-4 w-4 text-red-600" />
                    <span>
                      {(activity.attendee as any)?.first_name} {(activity.attendee as any)?.last_name}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {activity.extra_data?.reason || 'Unknown reason'}
                    </Badge>
                  </div>
                  <div className="text-muted-foreground">
                    {new Date(activity.created_at).toLocaleTimeString()}
                  </div>
                </div>
              ))}
              {recentActivity.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No recent deactivations
                </p>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}