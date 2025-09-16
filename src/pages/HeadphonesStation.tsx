import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Headphones, HeadphonesIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { BaseStationComponent, StationChildProps } from "@/components/BaseStationComponent";

export default function HeadphonesStation() {
  const { toast } = useToast();

  return (
    <BaseStationComponent
      stationType="headphones"
      stationTitle="Headphones Station"
    >
      {({ selectedRfid, attendeeReadiness, isProcessing, setIsProcessing, recordTransaction, getLatestStatus }: StationChildProps) => (
        <HeadphonesContent
          selectedRfid={selectedRfid}
          attendeeReadiness={attendeeReadiness}
          isProcessing={isProcessing}
          setIsProcessing={setIsProcessing}
          recordTransaction={recordTransaction}
          getLatestStatus={getLatestStatus}
          toast={toast}
        />
      )}
    </BaseStationComponent>
  );
}

interface HeadphonesContentProps extends Omit<StationChildProps, 'loadDailyCount'> {
  toast: any;
}

function HeadphonesContent({ 
  selectedRfid, 
  attendeeReadiness, 
  isProcessing, 
  setIsProcessing, 
  recordTransaction, 
  getLatestStatus, 
  toast 
}: HeadphonesContentProps) {
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

      await recordTransaction({
        transaction_type: transactionType,
        current_status: newStatus
      });

      setHeadphoneStatus(newStatus);

      toast({
        title: isCheckedOut ? "Headphones Returned" : "Headphones Checked Out",
        description: `${selectedRfid?.attendee?.first_name} ${isCheckedOut ? 'returned' : 'checked out'} headphones`,
      });
    } catch (error) {
      console.error("Error updating headphone status:", error);
      toast({
        title: "Error",
        description: "Failed to update headphone status",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="text-center space-y-4">
          {!attendeeReadiness?.isReady && attendeeReadiness && (
            <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg mb-4">
              <p className="text-sm text-destructive font-medium">
                {attendeeReadiness.message}
              </p>
            </div>
          )}

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
            disabled={isProcessing || !attendeeReadiness?.isReady}
            size="lg"
            className="w-full h-16 text-lg"
            variant={headphoneStatus === 'checked_out' ? "secondary" : "default"}
          >
            {isProcessing ? (
              "Processing..."
            ) : !attendeeReadiness?.isReady ? (
              "Service Not Available"
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