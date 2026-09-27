import { useCallback, useEffect, useState } from "react";
import { UnifiedStationScanner } from "@/components/UnifiedStationScanner";
import { StationActionProps } from "@/components/UnifiedStationScanner";
import { toast } from "sonner";
import { DoorOpen, PartyPopper } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

/**
 * The Main Gate is entry-only. Campers never scan out, so a scan always
 * records an arrival. A band scanned twice in quick succession (lingering in
 * front of the camera) is ignored instead of double-counted.
 */
const DUPLICATE_GUARD_MS = 15_000;
const RECENT_GATE_SCANS = new Map<string, number>();


const MainGateStation = () => {
  return (
    <UnifiedStationScanner 
      stationType="main_gate"
      stationTitle="Main Gate Entry"
      mode="quick"
      autoTrigger={true}
      enableAttendeeSearch={true}
    >
      {(props) => <MainGateContent {...props} />}
    </UnifiedStationScanner>
  );
};

interface MainGateContentProps extends StationActionProps {}

const MainGateContent = ({ 
  selectedRfid, 
  attendeeReadiness, 
  isProcessing, 
  setIsProcessing, 
  executeAction, 
  onReset 
}: MainGateContentProps) => {
  const [welcomed, setWelcomed] = useState(false);

  const handleGateEntry = useCallback(async () => {
    if (!selectedRfid?.attendee_id || isProcessing) return;
    
    setIsProcessing(true);
    
    try {
      // A band lingering in front of the camera would otherwise log the same
      // arrival over and over. Ignore repeat scans of the same band within
      // 15 seconds of the one just recorded.
      const recent = RECENT_GATE_SCANS.get(selectedRfid.uid);
      if (recent && Date.now() - recent < DUPLICATE_GUARD_MS) {
        toast.info("Already welcomed in — entry logged a moment ago.", {
          duration: 2500,
        });
        setTimeout(() => onReset(), 1200);
        return;
      }
      RECENT_GATE_SCANS.set(selectedRfid.uid, Date.now());
      
      await executeAction('gate_entry', {
        current_status: 'on_site',
        extra_data: {
          timestamp: new Date().toISOString(),
          action: 'entry'
        }
      });

      setWelcomed(true);
      
      const attendeeName = selectedRfid.attendee 
        ? `${selectedRfid.attendee.first_name} ${selectedRfid.attendee.last_name}`
        : 'Attendee';
      
      toast.success(`✅ Welcome, ${attendeeName}! Entry recorded.`, {
        duration: 2000,
      });
      
      // Reset after short delay
      setTimeout(() => {
        setWelcomed(false);
        onReset();
      }, 1500);
      
    } catch (error) {
      console.error('Gate entry error:', error);
      toast.error('Failed to record entry. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  }, [selectedRfid, isProcessing, executeAction, setIsProcessing, onReset]);

  // Auto-trigger gate entry when conditions are met
  useEffect(() => {
    const handleAutoTrigger = () => {
      if (attendeeReadiness?.isReady && selectedRfid && !isProcessing) {
        handleGateEntry();
      }
    };

    // Listen for auto-trigger event
    window.addEventListener('autoTrigger', handleAutoTrigger);
    
    return () => {
      window.removeEventListener('autoTrigger', handleAutoTrigger);
    };
  }, [attendeeReadiness?.isReady, selectedRfid, isProcessing, handleGateEntry]);

  if (!attendeeReadiness?.isReady) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center space-y-3">
            <DoorOpen className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="font-medium">Main Gate</p>
            <p className="text-sm text-muted-foreground">
              {attendeeReadiness ? attendeeReadiness.message : "Scan a wristband to welcome someone in."}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <div className={`text-center p-6 rounded-lg border-2 ${welcomed ? 'bg-green-50 border-green-200' : 'bg-blue-50 border-blue-200'}`}>
          <div className="flex justify-center mb-4">
            {welcomed
              ? <PartyPopper className="w-8 h-8 text-green-600" />
              : <DoorOpen className="w-8 h-8 text-blue-600" />}
          </div>
          
          <h3 className={`text-2xl font-bold mb-2 ${welcomed ? 'text-green-800' : 'text-blue-800'}`}>
            {welcomed ? 'WELCOME IN!' : 'READY TO ENTER'}
          </h3>
          
          <p className="text-muted-foreground mb-4">
            {welcomed ? 'Entry recorded — enjoy!' : 'Recording entry...'}
          </p>
          
          {isProcessing && (
            <div className="flex items-center justify-center gap-2 text-primary">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
              <span>Processing...</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default MainGateStation;
