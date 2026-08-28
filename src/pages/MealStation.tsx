import { getCurrentEventId } from "@/lib/eventRuntime";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Utensils, Clock } from "lucide-react";
import { toast } from "sonner";
import { UnifiedStationScanner, StationActionProps } from "@/components/UnifiedStationScanner";
import { supabase } from "@/integrations/supabase/client";
import { TransactionType } from "@/types/station";

// Testing mode - set to true to disable time windows for testing
const TESTING_MODE = true;

// Weekend meal configuration - 6 distinct meals
const WEEKEND_MEALS = [
  { 
    id: 'meal_fri_lunch', 
    label: 'Fri Lunch', 
    day: 'Friday', 
    meal: 'Lunch',
    dayOrder: 1,
    mealOrder: 1
  },
  { 
    id: 'meal_fri_dinner', 
    label: 'Fri Dinner', 
    day: 'Friday', 
    meal: 'Dinner',
    dayOrder: 1,
    mealOrder: 2
  },
  { 
    id: 'meal_sat_breakfast', 
    label: 'Sat Breakfast', 
    day: 'Saturday', 
    meal: 'Breakfast',
    dayOrder: 2,
    mealOrder: 1
  },
  { 
    id: 'meal_sat_lunch', 
    label: 'Sat Lunch', 
    day: 'Saturday', 
    meal: 'Lunch',
    dayOrder: 2,
    mealOrder: 2
  },
  { 
    id: 'meal_sat_dinner', 
    label: 'Sat Dinner', 
    day: 'Saturday', 
    meal: 'Dinner',
    dayOrder: 2,
    mealOrder: 3
  },
  { 
    id: 'meal_sun_breakfast', 
    label: 'Sun Breakfast', 
    day: 'Sunday', 
    meal: 'Breakfast',
    dayOrder: 3,
    mealOrder: 1
  }
] as const;

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
  const [mealStatuses, setMealStatuses] = useState<Record<string, boolean>>({});
  const [attendeeMealPlan, setAttendeeMealPlan] = useState<string | null>(null);

  useEffect(() => {
    if (selectedRfid && attendeeReadiness?.isReady) {
      loadMealStatuses();
      checkAttendeeMealPlan();
    }
  }, [selectedRfid, attendeeReadiness]);

  const checkAttendeeMealPlan = async () => {
    if (!selectedRfid?.attendee_id) return;
    
    try {
      const { data, error } = await supabase
        .from('attendees')
        .select('meal_plan')
        .eq('event_id', getCurrentEventId())
        .eq('id', selectedRfid.attendee_id)
        .maybeSingle();
        
      if (!error && data) {
        setAttendeeMealPlan(data.meal_plan);
      }
    } catch (error) {
      console.error('Error checking meal plan:', error);
    }
  };

  const loadMealStatuses = async () => {
    if (!selectedRfid?.attendee_id) return;
    
    const statuses: Record<string, boolean> = {};
    
    for (const meal of WEEKEND_MEALS) {
      try {
        const { data, error } = await supabase
          .from('station_transactions')
          .select('id')
        .eq('event_id', getCurrentEventId())
          .eq('attendee_id', selectedRfid.attendee_id)
          .eq('station_type', 'meal')
          .eq('transaction_type', meal.id)
          .gte('created_at', new Date().toISOString().split('T')[0]);

        if (!error) {
          statuses[meal.id] = data.length > 0;
        }
      } catch (error) {
        console.error(`Error loading ${meal.id} status:`, error);
        statuses[meal.id] = false;
      }
    }
    
    setMealStatuses(statuses);
  };

  const canGetMeal = (mealId: string) => {
    // Check if attendee has a meal plan
    if (!attendeeMealPlan || attendeeMealPlan === '0' || attendeeMealPlan === 'none') {
      return { can: false, reason: "No meal plan - meals not included in ticket" };
    }
    
    // Check if meal already consumed
    if (mealStatuses[mealId]) {
      return { can: false, reason: "Already consumed" };
    }

    // Meal plan validation - simplified for testing
    // In a real implementation, you'd check which meals are included in each plan
    return { can: true, reason: "Available" };
  };

  const handleMealScan = async (mealId: string) => {
    if (!attendeeReadiness?.isReady) return;

    const eligibility = canGetMeal(mealId);
    if (!eligibility.can) {
      toast.error(eligibility.reason);
      return;
    }

    setIsProcessing(true);

    try {
      await executeAction(mealId as any, {
        daily_count: 1
      });

      // Update local status
      setMealStatuses(prev => ({
        ...prev,
        [mealId]: true
      }));

      const meal = WEEKEND_MEALS.find(m => m.id === mealId);
      toast.success(`${meal?.label} recorded for ${selectedRfid?.attendee?.first_name}`);
    } catch (error) {
      console.error("Error recording meal:", error);
      toast.error("Failed to record meal");
    } finally {
      setIsProcessing(false);
    }
  };

  const resetWeekendMeals = async () => {
    if (!selectedRfid?.attendee_id || !TESTING_MODE) return;

    try {
      setIsProcessing(true);
      
      const mealIds = WEEKEND_MEALS.map(m => m.id);
      
      // Delete weekend meal transactions for this attendee
      const { error } = await supabase
        .from('station_transactions')
        .delete()
        .eq('attendee_id', selectedRfid.attendee_id)
        .eq('station_type', 'meal')
        .in('transaction_type', mealIds as any);

      if (error) throw error;

      // Reset local statuses
      const resetStatuses: Record<string, boolean> = {};
      WEEKEND_MEALS.forEach(meal => {
        resetStatuses[meal.id] = false;
      });
      setMealStatuses(resetStatuses);
      
      toast.success("Weekend meal records cleared for testing");
    } catch (error) {
      console.error("Error clearing meals:", error);
      toast.error("Failed to clear meal records");
    } finally {
      setIsProcessing(false);
    }
  };

  const consumedCount = Object.values(mealStatuses).filter(Boolean).length;
  const totalMeals = WEEKEND_MEALS.length;

  // Don't render if attendee is not ready
  if (!attendeeReadiness?.isReady) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center space-y-3">
            <Utensils className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="font-medium">Meal Service</p>
            <p className="text-sm text-muted-foreground">
              {attendeeReadiness ? attendeeReadiness.message : "Scan a wristband to serve a meal."}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="text-center space-y-4">
          {/* Progress Counter */}
          <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Utensils className="h-5 w-5 text-primary" />
              {TESTING_MODE && (
                <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded-full font-medium">
                  TESTING MODE
                </span>
              )}
            </div>
            <p className="text-2xl font-bold text-primary">
              {consumedCount}/{totalMeals} meals consumed
            </p>
          </div>

          {/* Attendee Meal Plan */}
          {attendeeMealPlan && (
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm font-medium">
                Meal Plan: {attendeeMealPlan === '1' ? 'Full Weekend Meals' : 
                           attendeeMealPlan === '2' ? 'Saturday Only' : 
                           attendeeMealPlan === '3' ? 'Sunday Only' : 
                           attendeeMealPlan}
              </p>
            </div>
          )}

          {/* 6-Meal Grid */}
          <div className="grid grid-cols-2 gap-3">
            {WEEKEND_MEALS.map((meal) => {
              const eligibility = canGetMeal(meal.id);
              const isConsumed = mealStatuses[meal.id];
              
              return (
                <Button
                  key={meal.id}
                  onClick={() => handleMealScan(meal.id)}
                  disabled={isProcessing || !attendeeReadiness?.isReady || !eligibility.can}
                  size="lg"
                  variant={isConsumed ? "secondary" : eligibility.can ? "default" : "destructive"}
                  className="h-16 text-sm font-medium flex flex-col items-center justify-center"
                >
                  <div className="font-semibold">{meal.label}</div>
                  <div className="text-xs opacity-80">
                    {isConsumed ? '✓ Consumed' : eligibility.can ? 'Available' : eligibility.reason}
                  </div>
                </Button>
              );
            })}
          </div>

          {TESTING_MODE && (
            <Button
              onClick={resetWeekendMeals}
              disabled={isProcessing}
              variant="outline"
              size="sm"
              className="w-full"
            >
              Reset Weekend Meals (Testing)
            </Button>
          )}

          <div className="text-center text-sm text-muted-foreground">
            <p>Weekend Event: Fri (2 meals) • Sat (3 meals) • Sun (1 meal)</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}