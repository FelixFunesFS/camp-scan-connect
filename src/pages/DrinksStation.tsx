import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { RfidScanner } from "@/components/RfidScanner";
import { rfidService } from "@/services/rfidService";

interface RfidTag {
  uid: string;
  attendee_id: string | null;
  attendee?: {
    first_name: string;
    last_name: string;
    ticket_type: string;
  };
}

export default function DrinksStation() {
  const [selectedRfid, setSelectedRfid] = useState<RfidTag | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [drinkCount, setDrinkCount] = useState(0);
  const [attendeeReadiness, setAttendeeReadiness] = useState<{ isReady: boolean; message: string } | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (selectedRfid) {
      loadDrinkCount();
    }
  }, [selectedRfid]);

  const handleRfidScan = async (rfidData: RfidTag) => {
    setSelectedRfid(rfidData);
    if (rfidData.attendee_id) {
      // Check if attendee is ready for station services
      const readiness = await rfidService.checkAttendeeReadiness(rfidData.attendee_id);
      setAttendeeReadiness(readiness);
      
      if (readiness.isReady) {
        await loadDrinkCount(rfidData.attendee_id);
      } else {
        toast({
          title: "Service Not Available",
          description: readiness.message,
          variant: "destructive",
        });
      }
    }
  };

  const loadDrinkCount = async (attendeeId?: string) => {
    const targetAttendeeId = attendeeId || selectedRfid?.attendee_id;
    if (!targetAttendeeId) return;

    const { data: transactions, error } = await supabase
      .from("station_transactions")
      .select("*")
      .eq("attendee_id", targetAttendeeId)
      .eq("station_type", "drinks")
      .gte("created_at", new Date().toISOString().split('T')[0]);

    if (error) {
      console.error("Error loading drink count:", error);
      return;
    }

    setDrinkCount(transactions.length);
  };

  const handleDrinkScan = async (rfidData?: RfidTag) => {
    const attendeeId = rfidData?.attendee_id || selectedRfid?.attendee_id;
    if (!attendeeId) return;

    setIsProcessing(true);

    try {
      const { error } = await supabase
        .from("station_transactions")
        .insert({
          attendee_id: attendeeId,
          station_type: 'drinks',
          transaction_type: 'drink',
          rfid_uid: rfidData?.uid || selectedRfid?.uid,
          daily_count: drinkCount + 1
        });

      if (error) throw error;

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
          <h1 className="text-2xl font-bold">Drinks Station</h1>
        </div>

        {/* RFID Scanner */}
        <RfidScanner
          onScan={handleRfidScan}
          stationType="drinks"
          disabled={isProcessing}
          title="Drink Counter"
          placeholder="Select RFID tag..."
        />

        {/* Drink Action */}
        {selectedRfid && selectedRfid.attendee && (
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
                  onClick={() => handleDrinkScan()}
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
        )}
      </div>
    </div>
  );
}