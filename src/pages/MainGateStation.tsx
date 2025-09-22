import { useCallback, useEffect, useState } from "react";
import { UnifiedStationScanner } from "@/components/UnifiedStationScanner";
import { StationActionProps } from "@/components/UnifiedStationScanner";
import { toast } from "sonner";
import { DoorOpen, Building } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const MainGateStation = () => {
  return (
    <UnifiedStationScanner 
      stationType="main_gate"
      stationTitle="Main Gate Access Control"
      mode="quick"
      autoTrigger={true}
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
  getLatestStatus, 
  onReset 
}: MainGateContentProps) => {
  const [currentStatus, setCurrentStatus] = useState<string>("");

  // Load current gate status when RFID is scanned
  useEffect(() => {
    if (selectedRfid?.uid && attendeeReadiness?.isReady) {
      const loadStatus = async () => {
        try {
          const status = await getLatestStatus('current_status');
          setCurrentStatus(status || 'off_site');
        } catch (error) {
          console.error('Error loading gate status:', error);
          setCurrentStatus('off_site');
        }
      };
      
      loadStatus();
    }
  }, [selectedRfid?.uid, attendeeReadiness?.isReady, getLatestStatus]);

  const handleGateToggle = useCallback(async () => {
    if (!selectedRfid?.attendee_id || isProcessing) return;
    
    setIsProcessing(true);
    
    try {
      const isCurrentlyOnSite = currentStatus === 'on_site' || currentStatus === 'gate_entry';
      const transactionType = isCurrentlyOnSite ? 'gate_exit' : 'gate_entry';
      const newStatus = isCurrentlyOnSite ? 'off_site' : 'on_site';
      const actionText = isCurrentlyOnSite ? 'exit' : 'entry';
      
      await executeAction(transactionType, {
        current_status: newStatus,
        extra_data: {
          timestamp: new Date().toISOString(),
          action: actionText
        }
      });

      setCurrentStatus(newStatus);
      
      const attendeeName = selectedRfid.attendee 
        ? `${selectedRfid.attendee.first_name} ${selectedRfid.attendee.last_name}`
        : 'Attendee';
      
      toast.success(`✅ ${attendeeName} ${actionText} recorded successfully`, {
        duration: 2000,
      });
      
      // Reset after short delay
      setTimeout(() => {
        onReset();
      }, 1500);
      
    } catch (error) {
      console.error('Gate access error:', error);
      toast.error('Failed to record gate access. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  }, [selectedRfid, isProcessing, currentStatus, executeAction, setIsProcessing, onReset]);

  // Auto-trigger gate toggle when conditions are met
  useEffect(() => {
    const handleAutoTrigger = () => {
      if (attendeeReadiness?.isReady && selectedRfid && !isProcessing) {
        handleGateToggle();
      }
    };

    // Listen for auto-trigger event
    document.addEventListener('autoTrigger', handleAutoTrigger);
    
    return () => {
      document.removeEventListener('autoTrigger', handleAutoTrigger);
    };
  }, [attendeeReadiness?.isReady, selectedRfid, isProcessing, handleGateToggle]);

  if (!attendeeReadiness?.isReady) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">
            {attendeeReadiness ? attendeeReadiness.message : "Ready to scan RFID tag..."}
          </div>
        </CardContent>
      </Card>
    );
  }

  const getStatusDisplay = () => {
    switch (currentStatus) {
      case 'on_site':
      case 'gate_entry':
        return {
          icon: <Building className="w-8 h-8 text-green-600" />,
          text: 'ON SITE',
          subtitle: 'Tap to record exit',
          bgColor: 'bg-green-50 border-green-200',
          textColor: 'text-green-800'
        };
      case 'off_site':
      case 'gate_exit':
      default:
        return {
          icon: <DoorOpen className="w-8 h-8 text-blue-600" />,
          text: 'OFF SITE',
          subtitle: 'Tap to record entry',
          bgColor: 'bg-blue-50 border-blue-200',
          textColor: 'text-blue-800'
        };
    }
  };

  const statusDisplay = getStatusDisplay();

  return (
    <Card>
      <CardContent className="pt-6">
        <div className={`text-center p-6 rounded-lg border-2 ${statusDisplay.bgColor}`}>
          <div className="flex justify-center mb-4">
            {statusDisplay.icon}
          </div>
          
          <h3 className={`text-2xl font-bold mb-2 ${statusDisplay.textColor}`}>
            {statusDisplay.text}
          </h3>
          
          <p className="text-muted-foreground mb-4">
            {statusDisplay.subtitle}
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