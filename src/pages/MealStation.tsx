import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Utensils, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

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
}

const MEAL_WINDOWS: MealWindow[] = [
  { type: 'breakfast', label: 'Breakfast', start: '06:00', end: '10:00' },
  { type: 'lunch', label: 'Lunch', start: '11:00', end: '15:00' },
  { type: 'dinner', label: 'Dinner', start: '17:00', end: '21:00' },
];

const MAX_DAILY_MEALS = 3;

export default function MealStation() {
  const [selectedRfid, setSelectedRfid] = useState<string>("");
  const [availableRfids, setAvailableRfids] = useState<RfidTag[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [mealCount, setMealCount] = useState(0);
  const [currentMealWindow, setCurrentMealWindow] = useState<MealWindow | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    loadAvailableRfids();
    checkCurrentMealWindow();
  }, []);

  useEffect(() => {
    if (selectedRfid) {
      loadMealCount();
    }
  }, [selectedRfid]);

  const loadAvailableRfids = async () => {
    const { data: rfids, error } = await supabase
      .from("rfid_tags")
      .select(`
        uid,
        attendee_id,
        attendee:attendees(first_name, last_name, ticket_type)
      `)
      .eq("status", "active");

    if (error) {
      console.error("Error loading RFIDs:", error);
      return;
    }

    setAvailableRfids(rfids as RfidTag[]);
  };

  const checkCurrentMealWindow = () => {
    const now = new Date();
    const currentTime = now.toTimeString().substring(0, 5);

    const activeMeal = MEAL_WINDOWS.find(meal => 
      currentTime >= meal.start && currentTime <= meal.end
    );

    setCurrentMealWindow(activeMeal || null);
  };

  const loadMealCount = async () => {
    if (!selectedRfid) return;

    const selectedTag = availableRfids.find(tag => tag.uid === selectedRfid);
    if (!selectedTag?.attendee_id) return;

    const { data: transactions, error } = await supabase
      .from("station_transactions")
      .select("*")
      .eq("attendee_id", selectedTag.attendee_id)
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

  const handleMealScan = async () => {
    if (!selectedRfid || !currentMealWindow || !canGetMeal()) return;

    const selectedTag = availableRfids.find(tag => tag.uid === selectedRfid);
    if (!selectedTag?.attendee_id) return;

    setIsProcessing(true);

    try {
      const transactionType = `meal_${currentMealWindow.type}` as 'meal_breakfast' | 'meal_lunch' | 'meal_dinner';
      
      const { error } = await supabase
        .from("station_transactions")
        .insert({
          attendee_id: selectedTag.attendee_id,
          station_type: 'meal',
          transaction_type: transactionType,
          rfid_uid: selectedRfid,
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

  const selectedTag = availableRfids.find(tag => tag.uid === selectedRfid);

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
            Back to Ranger
          </Button>
          <h1 className="text-2xl font-bold">Meal Station</h1>
        </div>

        {/* Meal Window Status */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              <span className="font-medium">Current Meal Window:</span>
              {currentMealWindow ? (
                <Badge variant="default">
                  {currentMealWindow.label} ({currentMealWindow.start} - {currentMealWindow.end})
                </Badge>
              ) : (
                <Badge variant="secondary">No active meal window</Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Main Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Utensils className="h-5 w-5" />
              Meal Distribution
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* RFID Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Select RFID Tag:</label>
              <Select value={selectedRfid} onValueChange={setSelectedRfid}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose an RFID tag" />
                </SelectTrigger>
                <SelectContent>
                  {availableRfids.map((rfid) => (
                    <SelectItem key={rfid.uid} value={rfid.uid}>
                      {rfid.uid} - {rfid.attendee?.first_name} {rfid.attendee?.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Attendee Info */}
            {selectedTag?.attendee && (
              <div className="p-4 bg-muted rounded-lg">
                <h3 className="font-semibold text-lg">
                  {selectedTag.attendee.first_name} {selectedTag.attendee.last_name}
                </h3>
                <p className="text-muted-foreground">Ticket: {selectedTag.attendee.ticket_type}</p>
                <div className="mt-2 flex gap-2">
                  <Badge variant={mealCount < MAX_DAILY_MEALS ? 'default' : 'destructive'}>
                    Daily Meals: {mealCount}/{MAX_DAILY_MEALS}
                  </Badge>
                </div>
              </div>
            )}

            {/* Scan Button */}
            {selectedRfid && (
              <Button
                onClick={handleMealScan}
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
            )}

            {/* Meal Windows Info */}
            <div className="pt-4 border-t">
              <h4 className="font-medium mb-2">Meal Windows</h4>
              <div className="space-y-1 text-sm text-muted-foreground">
                {MEAL_WINDOWS.map((meal) => (
                  <div key={meal.type} className="flex justify-between">
                    <span>{meal.label}:</span>
                    <span>{meal.start} - {meal.end}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}