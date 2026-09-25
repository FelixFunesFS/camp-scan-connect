import { getCurrentEventId } from "@/lib/eventRuntime";
import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Utensils, Clock } from "lucide-react";
import { toast } from "sonner";
import { UnifiedStationScanner, StationActionProps } from "@/components/UnifiedStationScanner";
import { supabase } from "@/integrations/supabase/client";
import { formatMealPlan } from "@/lib/phoneUtils";

// Weekend meal configuration - 6 distinct meals, each with an Eastern Time service window
const WEEKEND_MEALS = [
  { id: 'meal_fri_lunch', label: 'Fri Lunch', day: 'Friday', weekday: 5, startHour: 11, endHour: 15 },
  { id: 'meal_fri_dinner', label: 'Fri Dinner', day: 'Friday', weekday: 5, startHour: 16, endHour: 21 },
  { id: 'meal_sat_breakfast', label: 'Sat Breakfast', day: 'Saturday', weekday: 6, startHour: 6, endHour: 11 },
  { id: 'meal_sat_lunch', label: 'Sat Lunch', day: 'Saturday', weekday: 6, startHour: 11, endHour: 15 },
  { id: 'meal_sat_dinner', label: 'Sat Dinner', day: 'Saturday', weekday: 6, startHour: 16, endHour: 21 },
  { id: 'meal_sun_breakfast', label: 'Sun Breakfast', day: 'Sunday', weekday: 0, startHour: 6, endHour: 11 },
] as const;

type MealId = typeof WEEKEND_MEALS[number]['id'];

/** Current Eastern Time weekday (0=Sun) and hour, independent of the device timezone. */
function getEasternNow() {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    weekday: 'short',
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
  }).formatToParts(new Date());
  const weekdayName = parts.find(p => p.type === 'weekday')?.value ?? 'Sun';
  const hour = parseInt(parts.find(p => p.type === 'hour')?.value ?? '0', 10);
  const minute = parseInt(parts.find(p => p.type === 'minute')?.value ?? '0', 10);
  const weekday = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(weekdayName);
  return { weekday: weekday < 0 ? 0 : weekday, hour, minute };
}

/** The meal currently being served in Eastern Time, if any. */
function getActiveMealId(): MealId | null {
  const { weekday, hour } = getEasternNow();
  const match = WEEKEND_MEALS.find(
    m => m.weekday === weekday && hour >= m.startHour && hour < m.endHour
  );
  return match?.id ?? null;
}

function formatWindow(startHour: number, endHour: number) {
  const fmt = (h: number) => `${((h + 11) % 12) + 1}${h < 12 ? 'am' : 'pm'}`;
  return `${fmt(startHour)}–${fmt(endHour)} ET`;
}

export default function MealStation() {
  return (
    <UnifiedStationScanner
      stationType="meal"
      stationTitle="Meal Station"
      mode="confirm"
      autoTrigger={false}
      enableAttendeeSearch={true}
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
}: StationActionProps) {
  const [mealStatuses, setMealStatuses] = useState<Record<string, boolean>>({});
  const [attendeeMealPlan, setAttendeeMealPlan] = useState<string | null>(null);
  const [activeMealId, setActiveMealId] = useState<MealId | null>(() => getActiveMealId());

  // Keep the "now serving" meal in sync as the day progresses
  useEffect(() => {
    const interval = setInterval(() => setActiveMealId(getActiveMealId()), 60_000);
    return () => clearInterval(interval);
  }, []);

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

  // Load every weekend meal already served to this attendee for this event
  // (not just today) so Friday's meals stay marked on Saturday and Sunday.
  const loadMealStatuses = async () => {
    if (!selectedRfid?.attendee_id) return;

    try {
      const { data, error } = await supabase
        .from('station_transactions')
        .select('transaction_type')
        .eq('event_id', getCurrentEventId())
        .eq('attendee_id', selectedRfid.attendee_id)
        .eq('station_type', 'meal');

      if (error) throw error;

      const statuses: Record<string, boolean> = {};
      WEEKEND_MEALS.forEach(meal => {
        statuses[meal.id] = (data ?? []).some(row => row.transaction_type === meal.id);
      });
      setMealStatuses(statuses);
    } catch (error) {
      console.error('Error loading meal statuses:', error);
    }
  };

  const hasMealPlan = useMemo(() => {
    const value = (attendeeMealPlan ?? '').toLowerCase();
    return !!value && value !== 'none' && value !== '0';
  }, [attendeeMealPlan]);

  const canGetMeal = (mealId: string) => {
    if (!hasMealPlan) {
      return { can: false, reason: "No meal plan on this ticket" };
    }
    if (mealStatuses[mealId]) {
      return { can: false, reason: "Already served" };
    }
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
      await executeAction(mealId as any, { daily_count: 1 });

      setMealStatuses(prev => ({ ...prev, [mealId]: true }));

      const meal = WEEKEND_MEALS.find(m => m.id === mealId);
      toast.success(`${meal?.label} recorded for ${selectedRfid?.attendee?.first_name}`);
    } catch (error) {
      console.error("Error recording meal:", error);
      toast.error("Failed to record meal");
    } finally {
      setIsProcessing(false);
    }
  };

  const consumedCount = Object.values(mealStatuses).filter(Boolean).length;
  const totalMeals = WEEKEND_MEALS.length;
  const activeMeal = WEEKEND_MEALS.find(m => m.id === activeMealId);

  if (!attendeeReadiness?.isReady) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center space-y-3">
            <Utensils className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="font-medium">Meal Service</p>
            {activeMeal ? (
              <Badge className="bg-primary text-primary-foreground">
                Now serving: {activeMeal.label}
              </Badge>
            ) : (
              <Badge variant="outline">No meal service right now</Badge>
            )}
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
        <div className="space-y-4">
          {/* Which meal is being served right now */}
          <div className="p-4 rounded-lg border bg-primary/10 border-primary/20 text-center space-y-1">
            <div className="flex items-center justify-center gap-2 text-sm font-medium">
              <Clock className="h-4 w-4 text-primary" />
              {activeMeal ? (
                <span>
                  Now serving: <strong>{activeMeal.label}</strong> ({formatWindow(activeMeal.startHour, activeMeal.endHour)})
                </span>
              ) : (
                <span>Outside meal service hours — pick a meal manually if needed</span>
              )}
            </div>
            <p className="text-2xl font-bold text-primary">
              {consumedCount}/{totalMeals} meals served
            </p>
          </div>

          {/* Attendee meal plan */}
          <div className={`p-3 rounded-lg text-center text-sm font-medium ${hasMealPlan ? 'bg-muted' : 'bg-destructive/10 text-destructive'}`}>
            {hasMealPlan
              ? `Meal Plan: ${formatMealPlan(attendeeMealPlan)}`
              : 'No meal plan — meals are not included on this ticket'}
          </div>

          {/* 6-meal grid, current meal highlighted first */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {WEEKEND_MEALS.map((meal) => {
              const eligibility = canGetMeal(meal.id);
              const isConsumed = mealStatuses[meal.id];
              const isActive = meal.id === activeMealId;

              return (
                <Button
                  key={meal.id}
                  onClick={() => handleMealScan(meal.id)}
                  disabled={isProcessing || !eligibility.can}
                  size="lg"
                  variant={isConsumed ? "secondary" : eligibility.can ? "default" : "outline"}
                  className={`min-h-16 h-auto py-3 text-sm font-medium flex flex-col items-center justify-center gap-0.5 ${isActive ? 'ring-2 ring-primary ring-offset-2' : ''}`}
                >
                  <div className="font-semibold">
                    {meal.label}{isActive ? ' • Now' : ''}
                  </div>
                  <div className="text-[11px] opacity-80">
                    {formatWindow(meal.startHour, meal.endHour)}
                  </div>
                  <div className="text-xs opacity-90">
                    {isConsumed ? '✓ Served' : eligibility.reason}
                  </div>
                </Button>
              );
            })}
          </div>

          <p className="text-center text-sm text-muted-foreground">
            Weekend meals: Fri (2) • Sat (3) • Sun (1). Each meal can only be served once per person.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
