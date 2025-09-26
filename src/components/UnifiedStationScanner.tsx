import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Scan, User, CheckCircle, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useRfidCapture } from "@/hooks/useRfidCapture";
import { rfidService } from "@/services/rfidService";
import { StationTransactionService } from "@/services/stationTransactionService";
import { RfidTag, AttendeeReadiness, StationType, TransactionType } from "@/types/station";
import { StationActivationPrompt } from "@/components/StationActivationPrompt";
import { StationRfidIssueAlert } from "@/components/StationRfidIssueAlert";
import { StaffOverridePanel } from "@/components/StaffOverridePanel";

interface UnifiedStationScannerProps {
  stationType: StationType;
  stationTitle: string;
  children: (props: StationActionProps) => React.ReactNode;
  mode?: 'quick' | 'confirm'; // quick = auto-execute, confirm = show preview
  autoTrigger?: boolean; // auto-trigger action after successful scan
}

export interface StationActionProps {
  selectedRfid: RfidTag | null;
  attendeeReadiness: AttendeeReadiness | null;
  isProcessing: boolean;
  setIsProcessing: (processing: boolean) => void;
  executeAction: (transactionType: TransactionType, extraData?: any) => Promise<void>;
  loadDailyCount: (transactionTypes?: TransactionType[]) => Promise<number>;
  getLatestStatus: (statusField?: string) => Promise<string | null>;
  onReset: () => void;
}

export function UnifiedStationScanner({
  stationType,
  stationTitle,
  children,
  mode = 'confirm',
  autoTrigger = false
}: UnifiedStationScannerProps) {
  const [manualUid, setManualUid] = useState("");
  const [selectedRfid, setSelectedRfid] = useState<RfidTag | null>(null);
  const [attendeeReadiness, setAttendeeReadiness] = useState<AttendeeReadiness | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [error, setError] = useState<string>("");
  const [autoTriggered, setAutoTriggered] = useState(false);
  const [showStaffOverride, setShowStaffOverride] = useState(false);
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus input on mount and after reset
  useEffect(() => {
    const focusInput = () => {
      if (inputRef.current) {
        inputRef.current.focus();
      }
    };
    
    focusInput();
    // Also focus after a short delay to ensure it works after page transitions
    const timeout = setTimeout(focusInput, 100);
    return () => clearTimeout(timeout);
  }, []);

  // Auto-focus after reset
  useEffect(() => {
    if (!selectedRfid && inputRef.current) {
      inputRef.current.focus();
    }
  }, [selectedRfid]);

  const handleRfidFound = async (uid: string) => {
    setError("");
    setIsLookingUp(true);
    
    try {
      // Find attendee by RFID
      const rfidData = await rfidService.findAttendeeByRfid(uid);
      
      if (rfidData && rfidData.attendee) {
        setSelectedRfid(rfidData);
        
        // Check attendee readiness
        const readiness = await rfidService.checkAttendeeReadiness(rfidData.attendee.id);
        setAttendeeReadiness(readiness);
        
        // Clear manual input
        setManualUid("");
        setAutoTriggered(false);
        
      } else {
        setError("RFID tag not found or not assigned to an attendee");
        setSelectedRfid(null);
        setAttendeeReadiness(null);
      }
    } catch (error) {
      console.error("Error looking up RFID:", error);
      setError("Failed to lookup RFID. Please try again.");
      setSelectedRfid(null);
      setAttendeeReadiness(null);
    } finally {
      setIsLookingUp(false);
    }
  };

  // RFID capture hook for hardware scanners
  const { capturedUid, isCapturing } = useRfidCapture({
    onCapture: handleRfidFound,
    enabled: true
  });

  const handleManualScan = () => {
    if (manualUid.trim()) {
      handleRfidFound(manualUid.trim());
    }
  };

  const executeAction = async (transactionType: TransactionType, extraData?: any) => {
    if (!selectedRfid?.attendee_id) return;
    
    const transaction = {
      attendee_id: selectedRfid.attendee_id,
      station_type: stationType,
      transaction_type: transactionType,
      rfid_uid: selectedRfid.uid,
      ...extraData
    };

    await StationTransactionService.recordTransaction(transaction);
  };

  const loadDailyCount = async (transactionTypes?: TransactionType[]) => {
    if (!selectedRfid?.attendee_id) return 0;
    return await StationTransactionService.getDailyCount(
      selectedRfid.attendee_id, 
      stationType, 
      transactionTypes
    );
  };

  const getLatestStatus = async (statusField?: string) => {
    if (!selectedRfid?.attendee_id) return null;
    return await StationTransactionService.getLatestStatus(
      selectedRfid.attendee_id, 
      stationType, 
      statusField
    );
  };

  const handleReset = () => {
    setSelectedRfid(null);
    setAttendeeReadiness(null);
    setManualUid("");
    setError("");
    setAutoTriggered(false);
    setShowStaffOverride(false);
  };

  const handleStaffOverride = async (notes: string) => {
    if (!selectedRfid?.attendee) return;
    
    try {
      // Record staff override transaction using activate with special extra_data
      await executeAction('activate', {
        is_staff_override: true,
        override_reason: getOverrideIssueType(),
        staff_notes: notes,
        attendee_name: `${selectedRfid.attendee.first_name} ${selectedRfid.attendee.last_name}`,
        original_error: error || attendeeReadiness?.message,
        activation_method: 'staff_override'
      });
      
      toast.success("Staff override recorded successfully");
      setShowStaffOverride(false);
      
      // Allow station to proceed despite RFID issues
      setAttendeeReadiness({
        isReady: true,
        message: "Staff override applied - service authorized",
        hasAssignment: true,
        hasActivation: true
      });
      
    } catch (error) {
      console.error("Failed to record staff override:", error);
      toast.error("Failed to record staff override");
    }
  };

  const getOverrideIssueType = (): 'unactivated' | 'unassigned' | 'other' => {
    if (selectedRfid && !attendeeReadiness?.hasActivation) {
      return 'unactivated';
    } else if (!selectedRfid || error.includes("not found") || error.includes("not assigned")) {
      return 'unassigned';
    }
    return 'other';
  };

  const shouldShowActivationPrompt = () => {
    return selectedRfid?.attendee && 
           attendeeReadiness && 
           !attendeeReadiness.isReady && 
           attendeeReadiness.hasAssignment && 
           !attendeeReadiness.hasActivation &&
           !showStaffOverride;
  };

  const shouldShowRfidIssueAlert = () => {
    return (error && (error.includes("not found") || error.includes("not assigned"))) ||
           (selectedRfid?.attendee && 
            attendeeReadiness && 
            !attendeeReadiness.isReady && 
            !attendeeReadiness.hasAssignment &&
            !showStaffOverride);
  };

  // Auto-trigger logic for quick mode stations
  useEffect(() => {
    if (autoTrigger && selectedRfid && attendeeReadiness?.isReady && !autoTriggered && !isProcessing) {
      setAutoTriggered(true);
      // Trigger auto-action - this will be handled by the child component
      const event = new CustomEvent('autoTrigger', { 
        detail: { selectedRfid, attendeeReadiness } 
      });
      window.dispatchEvent(event);
    }
  }, [autoTrigger, selectedRfid, attendeeReadiness, autoTriggered, isProcessing]);

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button 
            variant="outline" 
            onClick={() => navigate("/")}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Main Hub
          </Button>
          <h1 className="text-2xl font-bold">{stationTitle}</h1>
        </div>

        {/* RFID Scanner Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Scan className="h-5 w-5" />
              Scan RFID Tag
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Manual RFID Input */}
            <div className="flex gap-2">
              <Input
                ref={inputRef}
                data-rfid-input="true"
                placeholder="Scan RFID or type manually..."
                value={manualUid}
                onChange={(e) => setManualUid(e.target.value)}
                disabled={isLookingUp}
                className="flex-1"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleManualScan();
                  }
                }}
              />
              <Button 
                onClick={handleManualScan}
                disabled={isLookingUp || !manualUid.trim()}
                size="default"
              >
                {isLookingUp ? "Looking up..." : "Scan"}
              </Button>
            </div>

            {/* Status Indicators */}
            <div className="flex items-center gap-2 text-sm">
              {isCapturing && (
                <Badge variant="secondary" className="animate-pulse">
                  <Scan className="h-3 w-3 mr-1" />
                  Capturing: {capturedUid}
                </Badge>
              )}
              {isLookingUp && (
                <Badge variant="secondary">
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-primary mr-1" />
                  Looking up attendee...
                </Badge>
              )}
            </div>

            {/* Error Display */}
            {error && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                <div className="flex items-center gap-2 text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-sm font-medium">{error}</span>
                </div>
              </div>
            )}

            {/* Attendee Info Display */}
            {selectedRfid?.attendee && (
              <div className="p-4 bg-muted rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <User className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">
                        {selectedRfid.attendee.first_name} {selectedRfid.attendee.last_name}
                      </p>
                      {stationType === 'activation' && (
                        <p className="text-sm text-muted-foreground">
                          Ticket: {selectedRfid.attendee.ticket_type}
                        </p>
                      )}
                      {selectedRfid.attendee.is_veteran && (
                        <Badge variant="secondary" className="ml-2 text-xs">
                          Veteran
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {attendeeReadiness?.isReady ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-orange-600" />
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleReset}
                    >
                      Clear
                    </Button>
                  </div>
                </div>

                {/* Readiness Status */}
                {attendeeReadiness && !attendeeReadiness.isReady && (
                  <div className="mt-3 p-2 bg-orange-50 border border-orange-200 rounded text-sm text-orange-800">
                    {attendeeReadiness.message}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Staff Override Panel */}
        {showStaffOverride && selectedRfid?.attendee && (
          <StaffOverridePanel
            attendeeName={`${selectedRfid.attendee.first_name} ${selectedRfid.attendee.last_name}`}
            issueType={getOverrideIssueType()}
            onOverride={handleStaffOverride}
            onCancel={() => setShowStaffOverride(false)}
          />
        )}

        {/* Activation Prompt for Assigned but Unactivated RFIDs */}
        {shouldShowActivationPrompt() && (
          <StationActivationPrompt
            attendeeName={`${selectedRfid!.attendee.first_name} ${selectedRfid!.attendee.last_name}`}
            attendeeReadiness={attendeeReadiness!}
            onStaffOverride={() => setShowStaffOverride(true)}
          />
        )}

        {/* RFID Issue Alert for Unassigned/Unreadable RFIDs */}
        {shouldShowRfidIssueAlert() && (
          <StationRfidIssueAlert
            errorMessage={error || attendeeReadiness?.message || "RFID assignment issue detected"}
            onStaffOverride={() => setShowStaffOverride(true)}
          />
        )}

        {/* Station-specific Action Area */}
        {selectedRfid?.attendee && (attendeeReadiness?.isReady || showStaffOverride) && children({
          selectedRfid,
          attendeeReadiness,
          isProcessing,
          setIsProcessing,
          executeAction,
          loadDailyCount,
          getLatestStatus,
          onReset: handleReset
        })}
      </div>
    </div>
  );
}