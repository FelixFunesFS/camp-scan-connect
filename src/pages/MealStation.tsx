import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Utensils, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { BaseStationComponent, StationChildProps } from "@/components/BaseStationComponent";

// Meal windows configuration
const MEAL_WINDOWS = [
  { type: 'breakfast', label: 'Breakfast', start: '07:00', end: '10:00', days: [5, 6, 0] }, // Fri, Sat, Sun
  { type: 'lunch', label: 'Lunch', start: '12:00', end: '15:00', days: [5, 6, 0] },
  { type: 'dinner', label: 'Dinner', start: '18:00', end: '21:00', days: [5, 6, 0] }
];

export default function MealStation() {
  const { toast } = useToast();

  return (
    <BaseStationComponent
      stationType="meal"
      stationTitle="Meal Station"
    >
      {({ selectedRfid, attendeeReadiness, isProcessing, setIsProcessing, recordTransaction, loadDailyCount }: StationChildProps) => (
        <MealContent
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

interface MealContentProps extends Omit<StationChildProps, 'getLatestStatus'> {
  toast: any;
}

function MealContent({ 
  selectedRfid, 
  attendeeReadiness, 
  isProcessing, 
  setIsProcessing, 
  recordTransaction, 
  loadDailyCount, 
  toast 
}: MealContentProps) {
  const [mealCounts, setMealCounts] = useState({ breakfast: 0, lunch: 0, dinner: 0 });
  const [currentMealWindow, setCurrentMealWindow] = useState<any>(null);

  useEffect(() => {
    if (selectedRfid && attendeeReadiness?.isReady) {
      loadMealCounts();
      checkCurrentMealWindow();
    }
  }, [selectedRfid, attendeeReadiness]);

  const loadMealCounts = async () => {
    const breakfast = await loadDailyCount(['meal_breakfast']);
    const lunch = await loadDailyCount(['meal_lunch']);  
    const dinner = await loadDailyCount(['meal_dinner']);
    
    setMealCounts({ breakfast, lunch, dinner });
  };

  const checkCurrentMealWindow = () => {
    const now = new Date();
    const currentTime = now.toTimeString().slice(0, 5);
    const currentDay = now.getDay();
    
    const activeWindow = MEAL_WINDOWS.find(window => {
      return window.days.includes(currentDay) && 
             currentTime >= window.start && 
             currentTime <= window.end;
    });
    
    setCurrentMealWindow(activeWindow);
  };

  const canGetMeal = () => {
    if (!currentMealWindow) return { can: false, reason: "No active meal window" };
    
    const mealType = currentMealWindow.type as keyof typeof mealCounts;
    const hasAlreadyEaten = mealCounts[mealType] > 0;
    
    if (hasAlreadyEaten) {
      return { can: false, reason: `Already received ${currentMealWindow.label.toLowerCase()} today` };
    }
    
    return { can: true, reason: `${currentMealWindow.label} available` };
  };

  const handleMealScan = async () => {
    if (!attendeeReadiness?.isReady || !currentMealWindow) return;

    const eligibility = canGetMeal();
    if (!eligibility.can) {
      toast({
        title: "Meal Not Available",
        description: eligibility.reason,
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);

    try {
      const transactionType = `meal_${currentMealWindow.type}` as const;
      
      await recordTransaction({
        transaction_type: transactionType,
        daily_count: mealCounts[currentMealWindow.type as keyof typeof mealCounts] + 1
      });

      // Update local count
      setMealCounts(prev => ({
        ...prev,
        [currentMealWindow.type]: prev[currentMealWindow.type as keyof typeof prev] + 1
      }));

      toast({
        title: "Meal Recorded",
        description: `${currentMealWindow.label} recorded for ${selectedRfid?.attendee?.first_name}`,
      });
    } catch (error) {
      console.error("Error recording meal:", error);
      toast({
        title: "Error",
        description: "Failed to record meal",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const eligibility = canGetMeal();

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

          {/* Current Meal Window */}
          <div className="p-4 bg-muted rounded-lg">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Clock className="h-5 w-5" />
            </div>
            {currentMealWindow ? (
              <div>
                <p className="font-medium text-lg">{currentMealWindow.label} Window</p>
                <p className="text-sm text-muted-foreground">
                  {currentMealWindow.start} - {currentMealWindow.end}
                </p>
              </div>
            ) : (
              <p className="text-muted-foreground">No active meal window</p>
            )}
          </div>

          {/* Meal Counts */}
          <div className="grid grid-cols-3 gap-2">
            {Object.entries(mealCounts).map(([meal, count]) => (
              <div key={meal} className="p-3 bg-muted rounded-lg text-center">
                <div className="text-2xl font-bold text-primary">{count}</div>
                <div className="text-xs text-muted-foreground capitalize">
                  {meal}
                </div>
              </div>
            ))}
          </div>

          {/* Action Button */}
          <Button
            onClick={handleMealScan}
            disabled={isProcessing || !attendeeReadiness?.isReady || !eligibility.can}
            size="lg"
            className="w-full h-16 text-lg"
          >
            {isProcessing ? (
              "Processing..."
            ) : !attendeeReadiness?.isReady ? (
              "Service Not Available"
            ) : !currentMealWindow ? (
              "No Active Meal Window"
            ) : !eligibility.can ? (
              eligibility.reason
            ) : (
              <>
                <Utensils className="h-5 w-5 mr-2" />
                RECORD {currentMealWindow.label.toUpperCase()}
              </>
            )}
          </Button>

          <div className="text-center text-sm text-muted-foreground">
            <p>One meal per window - breakfast, lunch, and dinner</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}