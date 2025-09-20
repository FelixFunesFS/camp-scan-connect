import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Radio } from "lucide-react";
import { toast } from "sonner";
import { UnifiedStationScanner, StationActionProps } from "@/components/UnifiedStationScanner";

export default function WalkieTalkiesStation() {
  return (
    <UnifiedStationScanner
      stationType="walkie_talkies"
      stationTitle="Walkie Talkies Station"
      mode="quick"
      autoTrigger={true}
    >
      {(props) => <WalkieTalkiesContent {...props} />}
    </UnifiedStationScanner>
  );
}

function WalkieTalkiesContent({ 
  selectedRfid, 
  attendeeReadiness, 
  isProcessing, 
  setIsProcessing, 
  executeAction, 
  getLatestStatus, 
  onReset 
}: StationActionProps) {
  const [currentStatus, setCurrentStatus] = useState<string | null>(null);

  const handleWalkieTalkieToggle = useCallback(async () => {
    if (!attendeeReadiness?.isReady || isProcessing || !selectedRfid?.attendee_id) return;

    setIsProcessing(true);

    try {
      const latestStatus = await getLatestStatus('current_status');
      
      let transactionType: 'walkie_talkie_checkout' | 'walkie_talkie_checkin';
      let newStatus: string;

      if (latestStatus === 'checked_out') {
        transactionType = 'walkie_talkie_checkin';
        newStatus = 'checked_in';
      } else {
        transactionType = 'walkie_talkie_checkout';
        newStatus = 'checked_out';
      }

      await executeAction(transactionType, {
        current_status: newStatus
      });

      setCurrentStatus(newStatus);

      const actionMessage = transactionType === 'walkie_talkie_checkout' ? 'checked out' : 'returned';
      toast.success(
        `Walkie talkie ${actionMessage} for ${selectedRfid?.attendee?.first_name}`
      );

      setTimeout(() => {
        onReset();
      }, 1500);
    } catch (error) {
      console.error("Error updating walkie talkie status:", error);
      toast.error("Failed to update walkie talkie status");
    } finally {
      setIsProcessing(false);
    }
  }, [attendeeReadiness, isProcessing, executeAction, selectedRfid, onReset, getLatestStatus]);

  useEffect(() => {
    if (selectedRfid?.attendee_id) {
      getLatestStatus('current_status')
        .then(status => setCurrentStatus(status))
        .catch(error => {
          console.error("Error loading walkie talkie status:", error);
          setCurrentStatus(null);
        });
    } else {
      setCurrentStatus(null);
    }
  }, [selectedRfid?.attendee_id, getLatestStatus]);

  useEffect(() => {
    const handleAutoTrigger = () => {
      if (selectedRfid && attendeeReadiness?.isReady && !isProcessing) {
        handleWalkieTalkieToggle();
      }
    };

    if (selectedRfid && attendeeReadiness?.isReady && !isProcessing) {
      window.addEventListener('autoTrigger', handleAutoTrigger);
      return () => window.removeEventListener('autoTrigger', handleAutoTrigger);
    }
  }, [selectedRfid, attendeeReadiness, isProcessing, handleWalkieTalkieToggle]);

  if (!attendeeReadiness?.isReady) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center p-6 text-muted-foreground">
            {attendeeReadiness ? attendeeReadiness.message : "Ready to scan RFID tag..."}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="text-center space-y-4">
          <div className="p-6 bg-muted rounded-lg">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Radio className={`h-8 w-8 ${
                currentStatus === 'checked_out' ? 'text-orange-500' : 
                currentStatus === 'checked_in' ? 'text-blue-500' : 'text-green-500'
              }`} />
            </div>
            <div className="text-lg font-medium">
              Status: <span className={
                currentStatus === 'checked_out' ? 'text-orange-600' : 
                currentStatus === 'checked_in' ? 'text-blue-600' : 'text-green-600'
              }>
                {currentStatus === 'checked_out' ? 'CHECKED OUT' : 
                 currentStatus === 'checked_in' ? 'CHECKED IN' : 'AVAILABLE'}
              </span>
            </div>
          </div>

          {isProcessing && (
            <div className="p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center justify-center gap-2">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600" />
                 <span className="text-blue-600 font-medium">
                   {currentStatus === 'checked_out' ? 'Checking in walkie talkie...' : 'Checking out walkie talkie...'}
                 </span>
              </div>
            </div>
          )}

          <div className="text-center text-sm text-muted-foreground">
            <p>Communication equipment - automatic checkout/return</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}