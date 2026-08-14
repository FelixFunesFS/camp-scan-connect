import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Camera, Scan, User, CheckCircle, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { rfidService } from "@/services/rfidService";
import { StationTransactionService } from "@/services/stationTransactionService";
import { RfidTag, AttendeeReadiness, StationType, TransactionType } from "@/types/station";
import { StationActivationPrompt } from "@/components/StationActivationPrompt";
import { StationRfidIssueAlert } from "@/components/StationRfidIssueAlert";
import { StaffOverridePanel } from "@/components/StaffOverridePanel";
import { QuickStaffActivation } from "@/components/QuickStaffActivation";
import { GroupActivationResult } from "@/services/phoneActivationService";
import { EnhancedActivationService } from "@/services/enhancedActivationService";
import { LensScanner } from "@/components/LensScanner";

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
  const [showStaffActivation, setShowStaffActivation] = useState(false);
  const [isActivating, setIsActivating] = useState(false);
  const [showLens, setShowLens] = useState(false);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  // Guards against a single scan committing more than one transaction
  const inFlightRef = useRef(false);
  const lastCommitRef = useRef<{ key: string; at: number } | null>(null);
  const COMMIT_WINDOW_MS = 4000;

  const handleRfidFound = async (uid: string) => {
    setError("");
    setIsLookingUp(true);
    // A new code starts a fresh scan: clear the one-commit-per-scan guard
    if (lastCommitRef.current && !lastCommitRef.current.key.startsWith(`${uid}:`)) {
      lastCommitRef.current = null;
    }
    
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

  const handleManualScan = () => {
    if (manualUid.trim()) {
      handleRfidFound(manualUid.trim());
    }
  };

  const executeAction = async (transactionType: TransactionType, extraData?: any) => {
    if (!selectedRfid?.attendee_id) return;

    const key = `${selectedRfid.uid}:${stationType}:${transactionType}`;
    const now = Date.now();

    if (inFlightRef.current) return;
    if (
      lastCommitRef.current &&
      lastCommitRef.current.key === key &&
      now - lastCommitRef.current.at < COMMIT_WINDOW_MS
    ) {
      toast.info("Already recorded for this scan");
      return;
    }

    inFlightRef.current = true;
    const transaction = {
      attendee_id: selectedRfid.attendee_id,
      station_type: stationType,
      transaction_type: transactionType,
      rfid_uid: selectedRfid.uid,
      ...extraData
    };

    try {
      await StationTransactionService.recordTransaction(transaction);
      lastCommitRef.current = { key, at: Date.now() };
    } finally {
      inFlightRef.current = false;
    }
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
    setShowStaffActivation(false);
    lastCommitRef.current = null;
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

  const handleDirectActivation = async () => {
    if (!selectedRfid?.attendee_id) return;
    
    setIsActivating(true);
    try {
      const result = await EnhancedActivationService.activateIndividual(
        selectedRfid.attendee_id,
        'staff'
      );
      
      if (result.success) {
        toast.success(`${selectedRfid.attendee?.first_name} ${selectedRfid.attendee?.last_name} activated successfully!`);
        // Refresh the attendee data to show activated state
        await handleRfidFound(selectedRfid.uid);
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      console.error('Direct activation error:', error);
      toast.error('Failed to activate attendee');
    } finally {
      setIsActivating(false);
    }
  };

  const handleStaffActivation = async (result: GroupActivationResult) => {
    try {
      toast.success(`Successfully activated ${result.activated_count} attendee(s) via staff assistance!`);
      
      // Clear current state and allow normal station flow
      setShowStaffActivation(false);
      setSelectedRfid(null);
      setAttendeeReadiness(null);
      setManualUid("");
      setError("");
      
      // Ready for the next scan
      setShowLens(false);
    } catch (error) {
      console.error("Failed to handle staff activation result:", error);
      toast.error("Failed to process staff activation");
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

        {/* Camera Scanner Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Scan className="h-5 w-5" />
              Scan attendee code
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Primary action: open the in-app camera scanner */}
            <Button
              size="lg"
              className="w-full h-14 text-base"
              onClick={() => setShowLens(true)}
              disabled={isLookingUp}
            >
              <Camera className="h-5 w-5 mr-2" />
              Scan with camera
            </Button>

            {showManualEntry ? (
              <div className="flex gap-2">
                <Input
                  ref={inputRef}
                  autoFocus
                  data-exclude-rfid="true"
                  placeholder="Type the printed code..."
                  value={manualUid}
                  onChange={(e) => setManualUid(e.target.value)}
                  disabled={isLookingUp}
                  className="flex-1 font-mono"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleManualScan();
                    }
                  }}
                />
                <Button
                  onClick={handleManualScan}
                  disabled={isLookingUp || !manualUid.trim()}
                >
                  {isLookingUp ? "Looking up..." : "Look up"}
                </Button>
              </div>
            ) : (
              <Button
                variant="link"
                className="w-full text-muted-foreground"
                onClick={() => setShowManualEntry(true)}
              >
                Code won't scan? Enter it manually
              </Button>
            )}

            {/* Status Indicators */}
            {isLookingUp && (
              <div className="flex items-center gap-2 text-sm">
                <Badge variant="secondary">
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-primary mr-1" />
                  Looking up attendee...
                </Badge>
              </div>
            )}

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

        {/* Quick Staff Activation */}
        {showStaffActivation && (
          <QuickStaffActivation
            onSuccess={handleStaffActivation}
            onCancel={() => setShowStaffActivation(false)}
          />
        )}

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
            onStaffActivation={isActivating ? undefined : handleDirectActivation}
          />
        )}

        {/* RFID Issue Alert for Unassigned/Unreadable RFIDs */}
        {shouldShowRfidIssueAlert() && (
          <StationRfidIssueAlert
            errorMessage={error || attendeeReadiness?.message || "RFID assignment issue detected"}
            onStaffOverride={() => setShowStaffOverride(true)}
          />
        )}

        {/* Station-specific Action Area — rendered only when the camera overlay is
            closed, so the action panel never exists twice at the same time. */}
        {!showLens && selectedRfid?.attendee && (attendeeReadiness?.isReady || showStaffOverride) && children({
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

      {/* Full-screen camera scanner */}
      <LensScanner
        isOpen={showLens}
        onClose={() => setShowLens(false)}
        onScan={handleRfidFound}
        title={stationTitle}
        busy={isLookingUp}
        errorMessage={error || undefined}
      >
        {selectedRfid?.attendee ? (
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold">
                  {selectedRfid.attendee.first_name} {selectedRfid.attendee.last_name}
                </p>
                <p className="text-sm text-muted-foreground">
                  {selectedRfid.attendee.ticket_type}
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={handleReset}>
                Clear
              </Button>
            </div>

            {attendeeReadiness && !attendeeReadiness.isReady && (
              <div className="rounded-lg border border-orange-200 bg-orange-50 p-2 text-sm text-orange-800">
                {attendeeReadiness.message}
              </div>
            )}

            {attendeeReadiness?.isReady || showStaffOverride
              ? children({
                  selectedRfid,
                  attendeeReadiness,
                  isProcessing,
                  setIsProcessing,
                  executeAction,
                  loadDailyCount,
                  getLatestStatus,
                  onReset: handleReset
                })
              : (
                <Button
                  variant="secondary"
                  className="w-full"
                  onClick={() => setShowLens(false)}
                >
                  Resolve on station screen
                </Button>
              )}
          </div>
        ) : null}
      </LensScanner>
    </div>
  );
}