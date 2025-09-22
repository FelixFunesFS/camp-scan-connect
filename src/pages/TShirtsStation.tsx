import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Shirt } from "lucide-react";
import { toast } from "sonner";
import { UnifiedStationScanner, StationActionProps } from "@/components/UnifiedStationScanner";
import { TShirtService } from "@/services/tshirtService";

export default function TShirtsStation() {
  return (
    <UnifiedStationScanner
      stationType="tshirts"
      stationTitle="T-Shirts Station"
      mode="quick"
      autoTrigger={true}
    >
      {(props) => <TShirtsContent {...props} />}
    </UnifiedStationScanner>
  );
}

function TShirtsContent({ 
  selectedRfid, 
  attendeeReadiness, 
  isProcessing, 
  setIsProcessing, 
  executeAction, 
  getLatestStatus, 
  onReset 
}: StationActionProps) {
  const [tshirtInfo, setTShirtInfo] = useState<{
    hasTShirt: boolean;
    size: string | null;
    type: string | null;
    alreadyPickedUp: boolean;
  } | null>(null);

  const handleTShirtPickup = useCallback(async () => {
    if (!attendeeReadiness?.isReady || isProcessing || !selectedRfid?.attendee_id || !tshirtInfo?.hasTShirt) return;

    if (tshirtInfo.alreadyPickedUp) {
      toast.info(`T-shirt already picked up by ${selectedRfid?.attendee?.first_name}`);
      setTimeout(() => onReset(), 1500);
      return;
    }

    setIsProcessing(true);

    try {
      await executeAction('tshirt_pickup', {
        current_status: 'picked_up',
        tshirt_size: tshirtInfo.size,
        tshirt_type: tshirtInfo.type
      });

      setTShirtInfo(prev => prev ? { ...prev, alreadyPickedUp: true } : null);

      const sizeInfo = tshirtInfo.size ? ` (${tshirtInfo.type} ${tshirtInfo.size})` : '';
      toast.success(
        `T-shirt picked up by ${selectedRfid?.attendee?.first_name}${sizeInfo}`
      );

      setTimeout(() => onReset(), 1500);
    } catch (error) {
      console.error("Error recording t-shirt pickup:", error);
      toast.error("Failed to record t-shirt pickup");
    } finally {
      setIsProcessing(false);
    }
  }, [attendeeReadiness, isProcessing, executeAction, selectedRfid, tshirtInfo, onReset]);

  // Load t-shirt info when attendee changes
  useEffect(() => {
    if (selectedRfid?.attendee_id) {
      const loadTShirtInfo = async () => {
        try {
          const info = await TShirtService.checkAttendeeHasTShirt(selectedRfid.attendee_id);
          
          // Check if already picked up
          const latestStatus = await getLatestStatus('current_status');
          const alreadyPickedUp = latestStatus === 'picked_up';

          setTShirtInfo({
            ...info,
            alreadyPickedUp
          });
        } catch (error) {
          console.error("Error loading t-shirt info:", error);
          setTShirtInfo({
            hasTShirt: false,
            size: null,
            type: null,
            alreadyPickedUp: false
          });
        }
      };

      loadTShirtInfo();
    } else {
      setTShirtInfo(null);
    }
  }, [selectedRfid?.attendee_id, getLatestStatus]);

  // Auto-trigger t-shirt pickup when ready
  useEffect(() => {
    const handleAutoTrigger = () => {
      if (selectedRfid && attendeeReadiness?.isReady && !isProcessing && tshirtInfo?.hasTShirt) {
        handleTShirtPickup();
      }
    };

    if (selectedRfid && attendeeReadiness?.isReady && !isProcessing && tshirtInfo?.hasTShirt) {
      window.addEventListener('autoTrigger', handleAutoTrigger);
      return () => window.removeEventListener('autoTrigger', handleAutoTrigger);
    }
  }, [selectedRfid, attendeeReadiness, isProcessing, tshirtInfo, handleTShirtPickup]);

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

  // Handle case where attendee doesn't have a t-shirt
  if (tshirtInfo && !tshirtInfo.hasTShirt) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center p-6">
            <Shirt className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <div className="text-lg font-medium text-muted-foreground mb-2">
              No T-Shirt Ordered
            </div>
            <div className="text-sm text-muted-foreground">
              {selectedRfid?.attendee?.first_name} {selectedRfid?.attendee?.last_name} did not purchase a t-shirt
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="text-center space-y-4">
          {/* T-Shirt Status */}
          <div className="p-6 bg-muted rounded-lg">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Shirt className={`h-8 w-8 ${
                tshirtInfo?.alreadyPickedUp ? 'text-green-500' : 'text-primary'
              }`} />
            </div>
            <div className="text-lg font-medium">
              Status: <span className={
                tshirtInfo?.alreadyPickedUp ? 'text-green-600' : 'text-primary'
              }>
                {tshirtInfo?.alreadyPickedUp ? 'PICKED UP' : 'READY FOR PICKUP'}
              </span>
            </div>
            {tshirtInfo && (
              <div className="text-sm text-muted-foreground mt-2">
                {tshirtInfo.type} {tshirtInfo.size}
              </div>
            )}
          </div>

          {/* Processing Status */}
          {isProcessing && (
            <div className="p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center justify-center gap-2">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600" />
                <span className="text-blue-600 font-medium">
                  Recording t-shirt pickup...
                </span>
              </div>
            </div>
          )}

          <div className="text-center text-sm text-muted-foreground">
            <p>Souvenir 2025 T-Shirt Distribution</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}