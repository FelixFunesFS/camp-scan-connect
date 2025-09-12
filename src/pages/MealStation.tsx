import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Utensils, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { RfidScanner } from "@/components/RfidScanner";

interface RfidTag {
  uid: string;
  attendee_id: string | null;
  attendee?: {
    first_name: string;
    last_name: string;
    ticket_type: string;
  };
}

interface MealWindow {
  type: 'breakfast' | 'lunch' | 'dinner';
  label: string;
  start: string;
  end: string;
  days: number[]; // 5 = Friday, 6 = Saturday, 0 = Sunday
}

const MEAL_WINDOWS: MealWindow[] = [
  { type: 'breakfast', label: 'Breakfast', start: '06:00', end: '10:00', days: [6, 0] }, // Saturday, Sunday
  { type: 'lunch', label: 'Lunch', start: '11:00', end: '15:00', days: [6] }, // Saturday only
  { type: 'dinner', label: 'Dinner', start: '17:00', end: '21:00', days: [5, 6] }, // Friday, Saturday
];

const MAX_DAILY_MEALS = 3;

export default function MealStation() {
  const [selectedRfid, setSelectedRfid] = useState<RfidTag | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [mealCount, setMealCount] = useState(0);
  const [currentMealWindow, setCurrentMealWindow] = useState<MealWindow | null>(null);
  const [currentDay, setCurrentDay] = useState<string>("");
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkCurrentMealWindow();
  }, []);

  useEffect(() => {
    if (selectedRfid) {
      loadMealCount();
    }
  }, [selectedRfid]);

  const handleRfidScan = async (rfidData: RfidTag) => {
    setSelectedRfid(rfidData);
    if (rfidData.attendee_id) {
      await loadMealCount(rfidData.attendee_id);
      await handleMealScan(rfidData);
    }
  };

  const checkCurrentMealWindow = () => {
    const now = new Date();
    const currentTime = now.toTimeString().substring(0, 5);
    const dayOfWeek = now.getDay(); // 0 = Sunday, 5 = Friday, 6 = Saturday
    
    // Set current day name
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    setCurrentDay(dayNames[dayOfWeek]);

    const activeMeal = MEAL_WINDOWS.find(meal => 
      meal.days.includes(dayOfWeek) && 
      currentTime >= meal.start && 
      currentTime <= meal.end
    );

    setCurrentMealWindow(activeMeal || null);
  };

  const getAvailableMealsForToday = () => {
    const dayOfWeek = new Date().getDay();
    return MEAL_WINDOWS.filter(meal => meal.days.includes(dayOfWeek));
  };

  const loadMealCount = async (attendeeId?: string) => {
    const targetAttendeeId = attendeeId || selectedRfid?.attendee_id;
    if (!targetAttendeeId) return;

    const { data: transactions, error } = await supabase
      .from("station_transactions")
      .select("*")
      .eq("attendee_id", targetAttendeeId)
      .eq("station_type", "meal")
      .gte("created_at", new Date().toISOString().split('T')[0]);

    if (error) {
      console.error("Error loading meal count:", error);
      return;
    }

    setMealCount(transactions.length);
  };

  const canGetMeal = () => {
    return mealCount < MAX_DAILY_MEALS && currentMealWindow !== null;
  };

  const handleMealScan = async (rfidData?: RfidTag) => {
    const attendeeId = rfidData?.attendee_id || selectedRfid?.attendee_id;
    if (!attendeeId || !currentMealWindow || !canGetMeal()) return;

    setIsProcessing(true);

    try {
      const transactionType = `meal_${currentMealWindow.type}` as 'meal_breakfast' | 'meal_lunch' | 'meal_dinner';
      
      const { error } = await supabase
        .from("station_transactions")
        .insert({
          attendee_id: attendeeId,
          station_type: 'meal',
          transaction_type: transactionType,
          rfid_uid: rfidData?.uid || selectedRfid?.uid,
          daily_count: mealCount + 1,
          extra_data: { meal_type: currentMealWindow.type }
        });

      if (error) throw error;

      setMealCount(prev => prev + 1);
      toast({
        title: "Meal Recorded",
        description: `${currentMealWindow.label} meal recorded successfully`,
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

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button 
            variant="outline" 
            onClick={() => navigate("/ranger")}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Ranger Hub
          </Button>
          <h1 className="text-2xl font-bold">Meal Station</h1>
        </div>

        {/* Meal Window Status */}
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                <span className="font-medium">Today ({currentDay}):</span>
                {currentMealWindow ? (
                  <Badge variant="default">
                    {currentMealWindow.label} ({currentMealWindow.start} - {currentMealWindow.end})
                  </Badge>
                ) : (
                  <Badge variant="secondary">No active meal window</Badge>
                )}
              </div>
              <div className="text-sm text-muted-foreground">
                Available meals today: {getAvailableMealsForToday().map(meal => meal.label).join(', ') || 'None'}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* RFID Scanner */}
        <RfidScanner
          onScan={handleRfidScan}
          stationType="meal"
          disabled={isProcessing}
          title="Meal Distribution"
          placeholder="Select RFID tag..."
        />

        {/* Meal Action */}
        {selectedRfid && selectedRfid.attendee && (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <div className="text-sm text-muted-foreground">
                  Daily meals: <span className="font-bold">{mealCount}/{MAX_DAILY_MEALS}</span>
                </div>
                
                <Button
                  onClick={() => handleMealScan()}
                  disabled={isProcessing || !canGetMeal()}
                  size="lg"
                  className="w-full h-16 text-lg"
                >
                  {isProcessing ? (
                    "Processing..."
                  ) : !currentMealWindow ? (
                    "No Active Meal Window"
                  ) : mealCount >= MAX_DAILY_MEALS ? (
                    "Daily Meal Limit Reached"
                  ) : (
                    <>
                      <Utensils className="h-5 w-5 mr-2" />
                      RECORD {currentMealWindow.label.toUpperCase()}
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Today's Meal Windows */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Today's Meal Schedule</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1 text-sm text-muted-foreground">
              {getAvailableMealsForToday().length > 0 ? (
                getAvailableMealsForToday().map((meal) => (
                  <div key={meal.type} className="flex justify-between">
                    <span>{meal.label}:</span>
                    <span>{meal.start} - {meal.end}</span>
                  </div>
                ))
              ) : (
                <p>No meals available today</p>
              )}
            </div>
            
            {/* Event Schedule Overview */}
            <div className="mt-4 pt-4 border-t">
              <h5 className="font-medium mb-2 text-xs uppercase tracking-wide">Event Schedule</h5>
              <div className="text-xs text-muted-foreground space-y-1">
                <div><strong>Friday:</strong> Dinner (17:00-21:00)</div>
                <div><strong>Saturday:</strong> Breakfast (06:00-10:00), Lunch (11:00-15:00), Dinner (17:00-21:00)</div>
                <div><strong>Sunday:</strong> Breakfast (06:00-10:00)</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}