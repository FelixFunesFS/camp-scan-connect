import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Power, PowerOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { BaseStationComponent, StationChildProps } from "@/components/BaseStationComponent";

export default function ActivationStation() {
  const { toast } = useToast();

  return (
    <BaseStationComponent
      stationType="activation"
      stationTitle="Activation Station"
    >
      {({ selectedRfid, attendeeReadiness, isProcessing, setIsProcessing, recordTransaction, getLatestStatus }: StationChildProps) => (
        <ActivationContent
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

interface ActivationContentProps extends Omit<StationChildProps, 'loadDailyCount'> {
  toast: any;
}

function ActivationContent({ 
  selectedRfid, 
  attendeeReadiness, 
  isProcessing, 
  setIsProcessing, 
  recordTransaction, 
  getLatestStatus, 
  toast 
}: ActivationContentProps) {
  const [activationStatus, setActivationStatus] = useState<string>('inactive');

  useEffect(() => {
    if (selectedRfid && attendeeReadiness?.isReady) {
      loadActivationStatus();
    }
  }, [selectedRfid, attendeeReadiness]);

  const loadActivationStatus = async () => {
    const status = await getLatestStatus('current_status');
    setActivationStatus(status || 'inactive');
  };

  const handleActivationToggle = async () => {
    if (!selectedRfid?.attendee_id || !attendeeReadiness?.isReady) return;

    setIsProcessing(true);

    try {
      const newStatus = activationStatus === 'active' ? 'inactive' : 'active';
      const transactionType = newStatus === 'active' ? 'activate' : 'deactivate';

      await recordTransaction({
        transaction_type: transactionType,
        current_status: newStatus
      });

      setActivationStatus(newStatus);

      // Special message for veterans
      const isVeteran = selectedRfid.attendee?.is_veteran;
      const message = newStatus === 'active' 
        ? `${selectedRfid.attendee?.first_name} activated successfully${isVeteran ? ' - Thank you for your service!' : ''}` 
        : `${selectedRfid.attendee?.first_name} deactivated successfully`;

      toast({
        title: newStatus === 'active' ? "Activated" : "Deactivated",
        description: message,
      });
    } catch (error) {
      console.error("Error toggling activation:", error);
      toast({
        title: "Error",
        description: "Failed to update activation status",
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

          {/* Attendee Info */}
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">
              {selectedRfid?.attendee?.first_name} {selectedRfid?.attendee?.last_name}
            </h3>
            <Badge variant="outline">
              {selectedRfid?.attendee?.ticket_type?.replace('_', ' ').toUpperCase()}
            </Badge>
            {selectedRfid?.attendee?.is_veteran && (
              <Badge className="bg-primary/10 text-primary">
                VETERAN
              </Badge>
            )}
          </div>

          {/* Current Status */}
          <div className="p-6 bg-muted rounded-lg">
            <div className="flex items-center justify-center gap-2 mb-2">
              {activationStatus === 'active' ? (
                <Power className="h-8 w-8 text-green-500" />
              ) : (
                <PowerOff className="h-8 w-8 text-muted-foreground" />
              )}
            </div>
            <div className="text-lg font-medium">
              Status: <span className={activationStatus === 'active' ? 'text-green-600' : 'text-muted-foreground'}>
                {activationStatus === 'active' ? 'ACTIVE' : 'INACTIVE'}
              </span>
            </div>
          </div>

          {/* Action Button */}
          <Button
            onClick={handleActivationToggle}
            disabled={isProcessing || !attendeeReadiness?.isReady}
            size="lg"
            className="w-full h-16 text-lg"
            variant={activationStatus === 'active' ? "destructive" : "default"}
          >
            {isProcessing ? (
              "Processing..."
            ) : !attendeeReadiness?.isReady ? (
              "Service Not Available"
            ) : activationStatus === 'active' ? (
              <>
                <PowerOff className="h-5 w-5 mr-2" />
                DEACTIVATE
              </>
            ) : (
              <>
                <Power className="h-5 w-5 mr-2" />
                ACTIVATE
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}