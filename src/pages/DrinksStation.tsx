import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Droplets } from "lucide-react";
import { toast } from "sonner";
import { UnifiedStationScanner } from "@/components/UnifiedStationScanner";
import { StationActionProps } from "@/components/UnifiedStationScanner";

export default function DrinksStation() {
  return (
    <UnifiedStationScanner
      stationType="drinks"
      stationTitle="Drinks Station"
      mode="quick"
      autoTrigger={false}
    >
      {(props) => <DrinksContent {...props} />}
    </UnifiedStationScanner>
  );
}

function DrinksContent({ 
  selectedRfid, 
  attendeeReadiness, 
  isProcessing, 
  setIsProcessing, 
  executeAction, 
  loadDailyCount, 
  onReset 
}: StationActionProps) {
  const [drinkCount, setDrinkCount] = useState(0);

  useEffect(() => {
    if (selectedRfid && attendeeReadiness?.isReady) {
      loadDrinkCount();
    }
  }, [selectedRfid, attendeeReadiness]);

  const loadDrinkCount = async () => {
    const count = await loadDailyCount(['drink']);
    setDrinkCount(count);
  };

  const handleDrinkScan = async () => {
    if (!attendeeReadiness?.isReady) return;

    setIsProcessing(true);

    try {
      await executeAction('drink', {
        daily_count: drinkCount + 1
      });

      // Update local count
      setDrinkCount(prev => prev + 1);

      toast.success(`Drink recorded for ${selectedRfid?.attendee?.first_name}`);
      
      // Auto-reset after successful transaction for quick workflow
      setTimeout(() => {
        onReset();
      }, 1500);
    } catch (error) {
      console.error("Error recording drink:", error);
      toast.error("Failed to record drink");
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
          {/* Drink Counter */}
          <div className="p-6 bg-muted rounded-lg">
            <div className="text-4xl font-bold text-primary mb-2">{drinkCount}</div>
            <div className="text-sm text-muted-foreground">
              Drinks served today
            </div>
          </div>

          {/* Action Button */}
          <Button
            onClick={handleDrinkScan}
            disabled={isProcessing}
            size="lg"
            className="w-full h-16 text-lg"
          >
            {isProcessing ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                Recording...
              </div>
            ) : (
              <>
                <Droplets className="h-6 w-6 mr-2" />
                ADD DRINK
              </>
            )}
          </Button>

          <div className="text-center text-sm text-muted-foreground">
            <p>Refreshments and beverages service</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}