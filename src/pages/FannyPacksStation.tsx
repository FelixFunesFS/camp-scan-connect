import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Package } from "lucide-react";
import { toast } from "sonner";
import { UnifiedStationScanner, StationActionProps } from "@/components/UnifiedStationScanner";

export default function FannyPacksStation() {
  return (
    <UnifiedStationScanner
      stationType="fanny_packs"
      stationTitle="Fanny Packs Station"
      mode="quick"
      autoTrigger={true}
    >
      {(props) => <FannyPacksContent {...props} />}
    </UnifiedStationScanner>
  );
}

function FannyPacksContent({ 
  selectedRfid, 
  attendeeReadiness, 
  isProcessing, 
  setIsProcessing, 
  executeAction, 
  getLatestStatus, 
  onReset 
}: StationActionProps) {
  const [currentStatus, setCurrentStatus] = useState<string | null>(null);

  const handleFannyPackToggle = useCallback(async () => {
    if (!attendeeReadiness?.isReady || isProcessing || !selectedRfid?.attendee_id) return;

    setIsProcessing(true);

    try {
      const latestStatus = await getLatestStatus('current_status');
      
      let transactionType: 'fanny_pack_checkout' | 'fanny_pack_checkin';
      let newStatus: string;

      if (latestStatus === 'checked_out') {
        transactionType = 'fanny_pack_checkin';
        newStatus = 'checked_in';
      } else {
        transactionType = 'fanny_pack_checkout';
        newStatus = 'checked_out';
      }

      await executeAction(transactionType, {
        current_status: newStatus
      });

      setCurrentStatus(newStatus);

      const actionMessage = transactionType === 'fanny_pack_checkout' ? 'checked out' : 'returned';
      toast.success(
        `Fanny pack ${actionMessage} for ${selectedRfid?.attendee?.first_name}`
      );

      setTimeout(() => {
        onReset();
      }, 1500);
    } catch (error) {
      console.error("Error updating fanny pack status:", error);
      toast.error("Failed to update fanny pack status");
    } finally {
      setIsProcessing(false);
    }
  }, [attendeeReadiness, isProcessing, executeAction, selectedRfid, onReset, getLatestStatus]);

  useEffect(() => {
    if (selectedRfid?.attendee_id) {
      getLatestStatus('current_status')
        .then(status => setCurrentStatus(status))
        .catch(error => {
          console.error("Error loading fanny pack status:", error);
          setCurrentStatus(null);
        });
    } else {
      setCurrentStatus(null);
    }
  }, [selectedRfid?.attendee_id, getLatestStatus]);

  useEffect(() => {
    const handleAutoTrigger = () => {
      if (selectedRfid && attendeeReadiness?.isReady && !isProcessing) {
        handleFannyPackToggle();
      }
    };

    if (selectedRfid && attendeeReadiness?.isReady && !isProcessing) {
      window.addEventListener('autoTrigger', handleAutoTrigger);
      return () => window.removeEventListener('autoTrigger', handleAutoTrigger);
    }
  }, [selectedRfid, attendeeReadiness, isProcessing, handleFannyPackToggle]);

  if (!attendeeReadiness?.isReady) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center p-6 text-muted-foreground">
            {attendeeReadiness ? attendeeReadiness.message : "Ready to scan code..."}
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
              <Package className={`h-8 w-8 ${
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
                   {currentStatus === 'checked_out' ? 'Checking in fanny pack...' : 'Checking out fanny pack...'}
                 </span>
              </div>
            </div>
          )}

          <div className="text-center text-sm text-muted-foreground">
            <p>Storage equipment - automatic checkout/return</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}