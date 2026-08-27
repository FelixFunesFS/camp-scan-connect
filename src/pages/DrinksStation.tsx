import { useState, useEffect, useCallback } from "react";
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
      autoTrigger={true}
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

  const loadDrinkCount = useCallback(async () => {
    try {
      const count = await loadDailyCount(['drink']);
      setDrinkCount(count);
    } catch (error) {
      console.error("Error loading drink count:", error);
      setDrinkCount(0);
    }
  }, [loadDailyCount]);

  const handleDrinkScan = useCallback(async () => {
    if (!attendeeReadiness?.isReady || isProcessing) return;

    setIsProcessing(true);

    try {
      await executeAction('drink', {
        daily_count: drinkCount + 1
      });

      // Reload count from database to ensure accuracy
      await loadDrinkCount();

      toast.success(`Drink recorded for ${selectedRfid?.attendee?.first_name}`);
      
      // Auto-reset after successful transaction for quick workflow
      setTimeout(() => {
        onReset();
      }, 1500);
    } catch (error) {
      console.error("Error recording drink:", error);
      toast.error("Failed to record drink");
      // Reload count even on error to ensure UI is accurate
      await loadDrinkCount();
    } finally {
      setIsProcessing(false);
    }
  }, [attendeeReadiness, isProcessing, drinkCount, executeAction, selectedRfid, onReset, loadDrinkCount]);

  useEffect(() => {
    if (selectedRfid && attendeeReadiness?.isReady) {
      loadDrinkCount();
    }
  }, [selectedRfid, attendeeReadiness, loadDrinkCount]);

  // Auto-trigger drink recording when ready
  useEffect(() => {
    const handleAutoTrigger = () => {
      if (selectedRfid && attendeeReadiness?.isReady && !isProcessing) {
        handleDrinkScan();
      }
    };

    if (selectedRfid && attendeeReadiness?.isReady && !isProcessing) {
      window.addEventListener('autoTrigger', handleAutoTrigger);
      return () => window.removeEventListener('autoTrigger', handleAutoTrigger);
    }
  }, [selectedRfid, attendeeReadiness, isProcessing, handleDrinkScan]);

  // Don't render if attendee is not ready
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
          {/* Drink Counter */}
          <div className="p-6 bg-muted rounded-lg">
            <div className="text-4xl font-bold text-primary mb-2">{drinkCount}</div>
            <div className="text-sm text-muted-foreground">
              Drinks served today
            </div>
          </div>

          {/* Auto Status Display */}
          {isProcessing ? (
            <div className="p-6 bg-primary/10 border border-primary/20 rounded-lg">
              <div className="flex items-center justify-center gap-2 text-primary">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary" />
                <span className="font-medium">Recording drink...</span>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center justify-center gap-2 text-green-700">
                <Droplets className="h-5 w-5" />
                <span className="font-medium">Ready - Scan wristband to record drink</span>
              </div>
            </div>
          )}

          <div className="text-center text-sm text-muted-foreground">
            <p>Refreshments and beverages service</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}