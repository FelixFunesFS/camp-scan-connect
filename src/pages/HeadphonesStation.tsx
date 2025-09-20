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
  const [scanCount, setScanCount] = useState<number>(0);

  const handleHeadphoneToggle = useCallback(async () => {
    if (!attendeeReadiness?.isReady || isProcessing) return;

    setIsProcessing(true);

    try {
      // Increment scan count
      const newScanCount = scanCount + 1;
      setScanCount(newScanCount);

      // Determine action based on scan count (odd = checkout, even = checkin)
      let transactionType: 'headphone_checkout' | 'headphone_checkin';
      let newStatus: string;

      if (newScanCount % 2 === 1) {
        // Odd scans: checkout
        transactionType = 'headphone_checkout';
        newStatus = 'checked_out';
      } else {
        // Even scans: checkin
        transactionType = 'headphone_checkin';
        newStatus = 'checked_in';
      }

      await executeAction(transactionType, {
        current_status: newStatus
      });

      const actionMessage = transactionType === 'headphone_checkout' ? 'checked out' : 'returned';
      toast.success(
        `Headphones ${actionMessage} for ${selectedRfid?.attendee?.first_name}`
      );
    } catch (error) {
      console.error("Error updating headphone status:", error);
      toast.error("Failed to update headphone status");
      
      // Revert scan count on failure
      setScanCount(scanCount);
    } finally {
      setIsProcessing(false);
    }
  }, [attendeeReadiness, isProcessing, scanCount, executeAction, selectedRfid, onReset]);

  // Reset scan count when RFID changes
  useEffect(() => {
    setScanCount(0);
  }, [selectedRfid?.uid]);

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
          {/* Current Status */}
          <div className="p-6 bg-muted rounded-lg">
            <div className="flex items-center justify-center gap-2 mb-2">
              <HeadphonesIcon className="h-8 w-8 text-green-500" />
            </div>
            <div className="text-lg font-medium">
              Status: <span className="text-green-600">
                AVAILABLE
              </span>
            </div>
          </div>

          {/* Processing Status */}
          {isProcessing && (
            <div className="p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center justify-center gap-2">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600" />
                 <span className="text-blue-600 font-medium">
                   {scanCount % 2 === 1 ? 'Checking out headphones...' : 'Checking in headphones...'}
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