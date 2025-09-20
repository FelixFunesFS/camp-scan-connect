import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Headphones, HeadphonesIcon } from "lucide-react";
import { toast } from "sonner";
import { UnifiedStationScanner, StationActionProps } from "@/components/UnifiedStationScanner";

export default function HeadphonesStation() {
  return (
    <UnifiedStationScanner
      stationType="headphones"
      stationTitle="Headphones Station"
      mode="quick"
      autoTrigger={false}
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
  const [headphoneStatus, setHeadphoneStatus] = useState<string>('available');

  useEffect(() => {
    if (selectedRfid && attendeeReadiness?.isReady) {
      checkHeadphoneStatus();
    }
  }, [selectedRfid, attendeeReadiness]);

  const checkHeadphoneStatus = async () => {
    const latestTransaction = await getLatestStatus('transaction_type');
    
    if (latestTransaction === 'headphone_checkout') {
      setHeadphoneStatus('checked_out');
    } else {
      setHeadphoneStatus('available');
    }
  };

  const handleHeadphoneToggle = async () => {
    if (!attendeeReadiness?.isReady) return;

    setIsProcessing(true);

    try {
      const isCheckedOut = headphoneStatus === 'checked_out';
      const transactionType = isCheckedOut ? 'headphone_checkin' : 'headphone_checkout';
      const newStatus = isCheckedOut ? 'available' : 'checked_out';

      await executeAction(transactionType, {
        current_status: newStatus
      });

      setHeadphoneStatus(newStatus);

      toast.success(
        `${isCheckedOut ? 'Headphones returned' : 'Headphones checked out'} for ${selectedRfid?.attendee?.first_name}`
      );
      
      // Auto-reset after successful transaction
      setTimeout(() => {
        onReset();
      }, 1500);
    } catch (error) {
      console.error("Error updating headphone status:", error);
      toast.error("Failed to update headphone status");
    } finally {
      setIsProcessing(false);
    }
  };

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
              <HeadphonesIcon className={`h-8 w-8 ${
                headphoneStatus === 'checked_out' ? 'text-orange-500' : 'text-green-500'
              }`} />
            </div>
            <div className="text-lg font-medium">
              Status: <span className={
                headphoneStatus === 'checked_out' ? 'text-orange-600' : 'text-green-600'
              }>
                {headphoneStatus === 'checked_out' ? 'CHECKED OUT' : 'AVAILABLE'}
              </span>
            </div>
          </div>

          {/* Action Button */}
          <Button
            onClick={handleHeadphoneToggle}
            disabled={isProcessing}
            size="lg"
            className="w-full h-16 text-lg"
            variant={headphoneStatus === 'checked_out' ? "secondary" : "default"}
          >
            {isProcessing ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                Processing...
              </div>
            ) : headphoneStatus === 'checked_out' ? (
              <>
                <Headphones className="h-5 w-5 mr-2" />
                CHECK IN HEADPHONES
              </>
            ) : (
              <>
                <Headphones className="h-5 w-5 mr-2" />
                CHECK OUT HEADPHONES
              </>
            )}
          </Button>

          <div className="text-center text-sm text-muted-foreground">
            <p>Silent disco equipment checkout and return</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}