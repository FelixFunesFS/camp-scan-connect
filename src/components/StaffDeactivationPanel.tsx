import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  UserMinus, 
  Scan, 
  Search, 
  Users,
  Activity,
  AlertTriangle,
  Clock
} from "lucide-react";
import { toast } from "sonner";
import { RfidScanner } from "@/components/RfidScanner";
import { rfidLookupService, AttendeeSearchResult } from "@/services/rfidLookupService";
import { formatStandardDateTime, formatWithRelativeTime } from "@/utils/dateTimeUtils";

interface StaffDeactivationPanelProps {
  staffId?: string;
}

const DEACTIVATION_REASONS = [
  { value: "lost", label: "Lost credential" },
  { value: "damaged", label: "Damaged credential" },
  { value: "replaced", label: "Replaced with new credential" },
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
  const [selectedReason, setSelectedReason] = useState("other");
  const [customReason, setCustomReason] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeRfids, setActiveRfids] = useState<AttendeeSearchResult[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  

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
    try {
      const rfids = await rfidLookupService.getActiveRfids();
      setActiveRfids(rfids);
    } catch (error) {
      console.error('Error loading active RFIDs:', error);
    }
  };

  const loadRecentActivity = async () => {
    try {
      const activity = await rfidLookupService.getRecentStaffActivity(10);
      setRecentActivity(activity.filter(a => a.transaction_type === 'deactivate'));
    } catch (error) {
      console.error('Error loading recent activity:', error);
    }
  };

  const performSearch = async () => {
    try {
      const results = await rfidLookupService.searchAttendees(searchQuery);
      // Filter to only active RFIDs
      const activeResults = results.filter(r => r.rfid_status === 'active');
      setSearchResults(activeResults);
    } catch (error) {
      console.error('Error searching attendees:', error);
    }
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
        const toastMessage = attendee ? 
          `RFID Deactivated - ${attendee.first_name} ${attendee.last_name} deactivated` :
          "RFID Deactivated - Credential deactivated successfully";
        toast.success(toastMessage);
        loadActiveRfids();
        loadRecentActivity();
      } else {
        toast.error(`Deactivation Failed - ${result.message}`);
      }
    } catch (error) {
      toast.error("Error - Failed to deactivate credential");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleManualDeactivation = async () => {
    if (!manualRfid.trim()) return;
    await deactivateSingleRfid(manualRfid.trim());
    setManualRfid("");
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-600" />
              <div>
                <p className="text-sm text-muted-foreground">Active credentials</p>
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

      {/* Scanner */}
      <RfidScanner
        onScan={handleRfidScan}
        stationType="activation"
        disabled={isProcessing}
        title="Staff Scanner (Individual Deactivation)"
        showAttendeeInfo={true}
        autoTrigger={true}
      />

      {/* Manual code entry */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserMinus className="h-5 w-5" />
            Manual code entry
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <div className="flex-1">
              <Label htmlFor="manual-rfid" className="sr-only">Code</Label>
              <Input
                id="manual-rfid"
                value={manualRfid}
                onChange={(e) => setManualRfid(e.target.value)}
                placeholder="Enter Code..."
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
                          <Badge variant="veteran" className="ml-2">Veteran</Badge>
                        )}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {attendee.ticket_type} • Code: {attendee.rfid_uid}
                      </p>
                    </div>
                    <Button 
                      size="sm"
                      variant="destructive"
                      onClick={() => deactivateSingleRfid(attendee.rfid_uid!)}
                      disabled={isProcessing}
                    >
                      Deactivate
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
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
          <ScrollArea className="h-64">
            <div className="space-y-2">
              {recentActivity.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-center justify-between p-2 border rounded-lg"
                >
                  <div className="flex-1">
                    <p className="font-medium text-sm">
                      {(activity.attendee as any)?.first_name} {(activity.attendee as any)?.last_name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Code: {activity.rfid_uid}
                    </p>
                    {activity.extra_data?.reason && (
                      <Badge variant="outline" className="text-xs mt-1">
                        {activity.extra_data.reason}
                      </Badge>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {formatStandardDateTime(activity.created_at, { compact: true })}
                    </div>
                  </div>
                </div>
              ))}
              {recentActivity.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No recent deactivations
                </p>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Info Box */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <UserMinus className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <h4 className="font-semibold text-blue-900 mb-1">Individual Deactivation Only</h4>
              <p className="text-sm text-blue-800">
                This panel handles individual RFID deactivations. For bulk operations or mass deactivations, 
                use the Bulk Operations section in the Credential Assignment tab.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}