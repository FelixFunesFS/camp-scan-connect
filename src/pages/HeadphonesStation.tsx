import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { HeadphonesIcon } from "lucide-react";
import { toast } from "sonner";
import { UnifiedStationScanner, StationActionProps } from "@/components/UnifiedStationScanner";

export default function HeadphonesStation() {
  return (
    <UnifiedStationScanner
      stationType="headphones"
      stationTitle="Headphones Station"
      mode="quick"
      autoTrigger={true}
    >
      {(props) => <HeadphonesContent {...props} />}
    </UnifiedStationScanner>
  );
}

function HeadphonesContent({ 
  selectedRfid, 
  attendeeReadiness, 
  isProcessing, 
  setIsProcessing, 
  executeAction, 
  getLatestStatus, 
  onReset 
}: StationActionProps) {
  const [currentStatus, setCurrentStatus] = useState<string | null>(null);

  const handleHeadphoneToggle = useCallback(async () => {
    if (!attendeeReadiness?.isReady || isProcessing || !selectedRfid?.attendee_id) return;

    setIsProcessing(true);

    try {
      // Get the latest status from database to determine next action
      const latestStatus = await getLatestStatus('current_status');
      
      // Determine action based on current database status
      let transactionType: 'headphone_checkout' | 'headphone_checkin';
      let newStatus: string;

      if (latestStatus === 'checked_out') {
        // If currently checked out, next action is checkin
        transactionType = 'headphone_checkin';
        newStatus = 'checked_in';
      } else {
        // If not checked out (checked_in or null), next action is checkout
        transactionType = 'headphone_checkout';
        newStatus = 'checked_out';
      }

      await executeAction(transactionType, {
        current_status: newStatus
      });

      setCurrentStatus(newStatus);

      const actionMessage = transactionType === 'headphone_checkout' ? 'checked out' : 'returned';
      toast.success(
        `Headphones ${actionMessage} for ${selectedRfid?.attendee?.first_name}`
      );

      // Auto-reset after brief delay to refocus input for next scan
      setTimeout(() => {
        onReset();
      }, 1500);
    } catch (error) {
      console.error("Error updating headphone status:", error);
      toast.error("Failed to update headphone status");
    } finally {
      setIsProcessing(false);
    }
  }, [attendeeReadiness, isProcessing, executeAction, selectedRfid, onReset, getLatestStatus]);

  // Load current status when attendee changes
  useEffect(() => {
    if (selectedRfid?.attendee_id) {
      getLatestStatus('current_status')
        .then(status => setCurrentStatus(status))
        .catch(error => {
          console.error("Error loading headphone status:", error);
          setCurrentStatus(null);
        });
    } else {
      setCurrentStatus(null);
    }
  }, [selectedRfid?.attendee_id, getLatestStatus]);

  // Auto-trigger headphone checkout/checkin when ready
  useEffect(() => {
    const handleAutoTrigger = () => {
      if (selectedRfid && attendeeReadiness?.isReady && !isProcessing) {
        handleHeadphoneToggle();
      }
    };

    if (selectedRfid && attendeeReadiness?.isReady && !isProcessing) {
      window.addEventListener('autoTrigger', handleAutoTrigger);
      return () => window.removeEventListener('autoTrigger', handleAutoTrigger);
    }
  }, [selectedRfid, attendeeReadiness, isProcessing, handleHeadphoneToggle]);

  // Don't render if attendee is not ready
  if (!attendeeReadiness?.isReady) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center space-y-3">
            <HeadphonesIcon className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="font-medium">Headphones</p>
            <p className="text-sm text-muted-foreground">
              {attendeeReadiness ? attendeeReadiness.message : "Scan a wristband to check out or return headphones."}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="text-center space-y-4">
          {/* Current Status */}
          <div className="p-6 bg-muted rounded-lg">
            <div className="flex items-center justify-center gap-2 mb-2">
              <HeadphonesIcon className={`h-8 w-8 ${
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

          {/* Processing Status */}
          {isProcessing && (
            <div className="p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center justify-center gap-2">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600" />
                 <span className="text-blue-600 font-medium">
                   {currentStatus === 'checked_out' ? 'Checking in headphones...' : 'Checking out headphones...'}
                 </span>
              </div>
            </div>
          )}

          <div className="text-center text-sm text-muted-foreground">
            <p>Silent disco equipment - automatic checkout/return</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}