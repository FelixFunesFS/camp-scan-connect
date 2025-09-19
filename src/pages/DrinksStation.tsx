import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { BaseStationComponent, StationChildProps } from "@/components/BaseStationComponent";

export default function DrinksStation() {
  const { toast } = useToast();

  return (
    <BaseStationComponent
      stationType="drinks"
      stationTitle="Drinks Station"
    >
      {({ selectedRfid, attendeeReadiness, isProcessing, setIsProcessing, recordTransaction, loadDailyCount }: StationChildProps) => (
        <DrinksContent
          selectedRfid={selectedRfid}
          attendeeReadiness={attendeeReadiness}
          isProcessing={isProcessing}
          setIsProcessing={setIsProcessing}
          recordTransaction={recordTransaction}
          loadDailyCount={loadDailyCount}
          toast={toast}
        />
      )}
    </BaseStationComponent>
  );
}

interface DrinksContentProps extends Omit<StationChildProps, 'getLatestStatus'> {
  toast: any;
}

function DrinksContent({ 
  selectedRfid, 
  attendeeReadiness, 
  isProcessing, 
  setIsProcessing, 
  recordTransaction, 
  loadDailyCount, 
  toast 
}: DrinksContentProps) {
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
      await recordTransaction({
        transaction_type: 'drink',
        daily_count: drinkCount + 1
      });

      setDrinkCount(prev => prev + 1);
      toast({
        title: "Drink Recorded",
        description: `Drink #${drinkCount + 1} recorded successfully`,
      });
    } catch (error) {
      console.error("Error recording drink:", error);
      toast({
        title: "Error",
        description: "Failed to record drink",
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
          
          {/* Drink Counter Display */}
          <div className="p-8 bg-muted rounded-lg">
            <div className="text-6xl font-bold text-primary mb-2">
              {drinkCount}
            </div>
            <p className="text-lg text-muted-foreground">
              Drinks Today
            </p>
          </div>

          <Button
            onClick={handleDrinkScan}
            disabled={isProcessing || !attendeeReadiness?.isReady}
            size="lg"
            className="w-full h-16 text-lg"
          >
            {isProcessing ? (
              "Processing..."
            ) : !attendeeReadiness?.isReady ? (
              "Service Not Available"
            ) : (
              <>
                <Plus className="h-5 w-5 mr-2" />
                ADD DRINK
              </>
            )}
          </Button>

          <div className="text-center text-sm text-muted-foreground">
            <p>No daily limits - tap to record each drink served</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}