import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Utensils, Clock } from "lucide-react";
import { toast } from "sonner";
import { UnifiedStationScanner, StationActionProps } from "@/components/UnifiedStationScanner";
import { supabase } from "@/integrations/supabase/client";

// Testing mode - set to true to disable time windows for testing
const TESTING_MODE = true;

// Meal windows configuration
const MEAL_WINDOWS = [
  { type: 'breakfast', label: 'Breakfast', start: '07:00', end: '10:00', days: [6, 0] }, // Sat, Sun
  { type: 'lunch', label: 'Lunch', start: '12:00', end: '15:00', days: [6] }, // Sat only
  { type: 'dinner', label: 'Dinner', start: '18:00', end: '21:00', days: [5, 6] } // Fri, Sat
];

export default function MealStation() {
  return (
    <UnifiedStationScanner
      stationType="meal"
      stationTitle="Meal Station"
      mode="confirm"
      autoTrigger={false}
    >
      {(props) => <MealContent {...props} />}
    </UnifiedStationScanner>
  );
}

function MealContent({ 
  selectedRfid, 
  attendeeReadiness, 
  isProcessing, 
  setIsProcessing, 
  executeAction, 
  loadDailyCount, 
  onReset 
}: StationActionProps) {
  const [mealCounts, setMealCounts] = useState({ breakfast: 0, lunch: 0, dinner: 0 });
  const [currentMealWindow, setCurrentMealWindow] = useState<any>(null);
  const [attendeeMealPlan, setAttendeeMealPlan] = useState<string | null>(null);

  useEffect(() => {
    if (selectedRfid && attendeeReadiness?.isReady) {
      loadMealCounts();
      checkCurrentMealWindow();
      checkAttendeeMealPlan();
    }
  }, [selectedRfid, attendeeReadiness]);

  const checkAttendeeMealPlan = async () => {
    if (!selectedRfid?.attendee_id) return;
    
    try {
      const { data, error } = await supabase
        .from('attendees')
        .select('meal_plan')
        .eq('id', selectedRfid.attendee_id)
        .single();
        
      if (!error && data) {
        setAttendeeMealPlan(data.meal_plan);
      }
    } catch (error) {
      console.error('Error checking meal plan:', error);
    }
  };

  const loadMealCounts = async () => {
    const breakfast = await loadDailyCount(['meal_breakfast']);
    const lunch = await loadDailyCount(['meal_lunch']);  
    const dinner = await loadDailyCount(['meal_dinner']);
    
    setMealCounts({ breakfast, lunch, dinner });
  };

  const checkCurrentMealWindow = () => {
    if (TESTING_MODE) {
      // In testing mode, always provide a default breakfast window if no real window is active
      const now = new Date();
      const currentTime = now.toTimeString().slice(0, 5);
      const currentDay = now.getDay();
      
      const activeWindow = MEAL_WINDOWS.find(window => {
        return window.days.includes(currentDay) && 
               currentTime >= window.start && 
               currentTime <= window.end;
      });
      
      // If no real window is active, default to breakfast for testing
      setCurrentMealWindow(activeWindow || { type: 'breakfast', label: 'Breakfast (Testing)', start: '00:00', end: '23:59', days: [0,1,2,3,4,5,6] });
    } else {
      const now = new Date();
      const currentTime = now.toTimeString().slice(0, 5);
      const currentDay = now.getDay();
      
      const activeWindow = MEAL_WINDOWS.find(window => {
        return window.days.includes(currentDay) && 
               currentTime >= window.start && 
               currentTime <= window.end;
      });
      
      setCurrentMealWindow(activeWindow);
    }
  };

  const canGetMeal = (mealType?: string) => {
    // Check if attendee has a meal plan
    if (!attendeeMealPlan || attendeeMealPlan === '0' || attendeeMealPlan === 'none') {
      return { can: false, reason: "No meal plan - meals not included in ticket" };
    }
    
    // For testing mode, allow any meal type
    if (TESTING_MODE && mealType) {
      const hasAlreadyEaten = mealCounts[mealType as keyof typeof mealCounts] > 0;
      if (hasAlreadyEaten) {
        return { can: false, reason: `Already received ${mealType} today` };
      }
      return { can: true, reason: `${mealType} available` };
    }
    
    // Production mode logic
    if (!currentMealWindow) {
      return { can: false, reason: "No active meal window" };
    }
    
    const windowMealType = currentMealWindow.type as keyof typeof mealCounts;
    const hasAlreadyEaten = mealCounts[windowMealType] > 0;
    
    if (hasAlreadyEaten) {
      return { can: false, reason: `Already received ${currentMealWindow.label.toLowerCase()} today` };
    }
    
    return { can: true, reason: `${currentMealWindow.label} available` };
  };

  const handleMealScan = async (mealType?: string) => {
    if (!attendeeReadiness?.isReady) return;

    // For testing mode with specific meal type
    if (TESTING_MODE && mealType) {
      const eligibility = canGetMeal(mealType);
      if (!eligibility.can) {
        toast.error(eligibility.reason);
        return;
      }

      setIsProcessing(true);

      try {
        const transactionType = `meal_${mealType}` as 'meal_breakfast' | 'meal_lunch' | 'meal_dinner';
        
        await executeAction(transactionType, {
          daily_count: mealCounts[mealType as keyof typeof mealCounts] + 1
        });

        // Update local count
        setMealCounts(prev => ({
          ...prev,
          [mealType]: prev[mealType as keyof typeof prev] + 1
        }));

        const mealLabel = mealType.charAt(0).toUpperCase() + mealType.slice(1);
        toast.success(`${mealLabel} recorded for ${selectedRfid?.attendee?.first_name}`);
      } catch (error) {
        console.error("Error recording meal:", error);
        toast.error("Failed to record meal");
      } finally {
        setIsProcessing(false);
      }
      return;
    }

    // Production mode logic
    if (!currentMealWindow) return;

    const eligibility = canGetMeal();
    if (!eligibility.can) {
      toast.error(eligibility.reason);
      return;
    }

    setIsProcessing(true);

    try {
      const transactionType = `meal_${currentMealWindow.type}` as 'meal_breakfast' | 'meal_lunch' | 'meal_dinner';
      
      await executeAction(transactionType, {
        daily_count: mealCounts[currentMealWindow.type as keyof typeof mealCounts] + 1
      });

      // Update local count
      setMealCounts(prev => ({
        ...prev,
        [currentMealWindow.type]: prev[currentMealWindow.type as keyof typeof prev] + 1
      }));

      toast.success(`${currentMealWindow.label} recorded for ${selectedRfid?.attendee?.first_name}`);
    } catch (error) {
      console.error("Error recording meal:", error);
      toast.error("Failed to record meal");
    } finally {
      setIsProcessing(false);
    }
  };

  const resetTodaysMeals = async () => {
    if (!selectedRfid?.attendee_id || !TESTING_MODE) return;

    try {
      setIsProcessing(true);
      
      // Delete today's meal transactions for this attendee
      const { error } = await supabase
        .from('station_transactions')
        .delete()
        .eq('attendee_id', selectedRfid.attendee_id)
        .eq('station_type', 'meal')
        .gte('created_at', new Date().toISOString().split('T')[0]);

      if (error) throw error;

      // Reset local counts
      setMealCounts({ breakfast: 0, lunch: 0, dinner: 0 });
      
      toast.success("Today's meal records cleared for testing");
    } catch (error) {
      console.error("Error clearing meals:", error);
      toast.error("Failed to clear meal records");
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
          {/* Current Meal Window */}
          <div className="p-4 bg-muted rounded-lg">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Clock className="h-5 w-5" />
              {TESTING_MODE && (
                <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded-full font-medium">
                  TESTING MODE
                </span>
              )}
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

          {/* Attendee Meal Plan */}
          {attendeeMealPlan && (
            <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg">
              <p className="text-sm font-medium text-primary">
                Meal Plan: {attendeeMealPlan === '1' ? 'Full Weekend Meals' : 
                           attendeeMealPlan === '2' ? 'Saturday Only' : 
                           attendeeMealPlan === '3' ? 'Sunday Only' : 
                           attendeeMealPlan}
              </p>
            </div>
          )}

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

          {/* Action Buttons */}
          {TESTING_MODE ? (
            <div className="space-y-3">
              <div className="grid grid-cols-1 gap-3">
                {['breakfast', 'lunch', 'dinner'].map((mealType) => {
                  const mealEligibility = canGetMeal(mealType);
                  const isConsumed = mealCounts[mealType as keyof typeof mealCounts] > 0;
                  const mealLabel = mealType.charAt(0).toUpperCase() + mealType.slice(1);
                  
                  return (
                    <Button
                      key={mealType}
                      onClick={() => handleMealScan(mealType)}
                      disabled={isProcessing || !attendeeReadiness?.isReady || !mealEligibility.can}
                      size="lg"
                      variant={isConsumed ? "secondary" : "default"}
                      className="w-full h-14 text-base"
                    >
                      {isProcessing ? (
                        <div className="flex items-center gap-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current" />
                          Processing...
                        </div>
                      ) : !attendeeReadiness?.isReady ? (
                        "Service Not Available"
                      ) : isConsumed ? (
                        <>
                          <Utensils className="h-4 w-4 mr-2" />
                          {mealLabel} ✓ (Already Consumed)
                        </>
                      ) : !mealEligibility.can ? (
                        mealEligibility.reason
                      ) : (
                        <>
                          <Utensils className="h-4 w-4 mr-2" />
                          RECORD {mealLabel.toUpperCase()}
                        </>
                      )}
                    </Button>
                  );
                })}
              </div>
              
              <Button
                onClick={resetTodaysMeals}
                disabled={isProcessing}
                variant="outline"
                size="sm"
                className="w-full"
              >
                Reset Today's Meals (Testing)
              </Button>
            </div>
          ) : (
            <Button
              onClick={() => handleMealScan()}
              disabled={isProcessing || !attendeeReadiness?.isReady || !canGetMeal().can}
              size="lg"
              className="w-full h-16 text-lg"
            >
              {isProcessing ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                  Processing...
                </div>
              ) : !attendeeReadiness?.isReady ? (
                "Service Not Available"
              ) : !currentMealWindow ? (
                "No Active Meal Window"
              ) : !canGetMeal().can ? (
                canGetMeal().reason
              ) : (
                <>
                  <Utensils className="h-5 w-5 mr-2" />
                  RECORD {currentMealWindow.label.toUpperCase()}
                </>
              )}
            </Button>
          )}

          <div className="text-center text-sm text-muted-foreground">
            <p>Fri: 1 dinner • Sat: 3 meals • Sun: 1 breakfast</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}