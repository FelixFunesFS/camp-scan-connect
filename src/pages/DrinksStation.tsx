import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Beer, Plus } from "lucide-react";
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

export default function DrinksStation() {
  const [selectedRfid, setSelectedRfid] = useState<string>("");
  const [availableRfids, setAvailableRfids] = useState<RfidTag[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [drinkCount, setDrinkCount] = useState(0);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    loadAvailableRfids();
  }, []);

  useEffect(() => {
    if (selectedRfid) {
      loadDrinkCount();
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

  const loadDrinkCount = async () => {
    if (!selectedRfid) return;

    const selectedTag = availableRfids.find(tag => tag.uid === selectedRfid);
    if (!selectedTag?.attendee_id) return;

    const { data: transactions, error } = await supabase
      .from("station_transactions")
      .select("*")
      .eq("attendee_id", selectedTag.attendee_id)
      .eq("station_type", "drinks")
      .gte("created_at", new Date().toISOString().split('T')[0]);

    if (error) {
      console.error("Error loading drink count:", error);
      return;
    }

    setDrinkCount(transactions.length);
  };

  const handleDrinkScan = async () => {
    if (!selectedRfid) return;

    const selectedTag = availableRfids.find(tag => tag.uid === selectedRfid);
    if (!selectedTag?.attendee_id) return;

    setIsProcessing(true);

    try {
      const { error } = await supabase
        .from("station_transactions")
        .insert({
          attendee_id: selectedTag.attendee_id,
          station_type: 'drinks',
          transaction_type: 'drink',
          rfid_uid: selectedRfid,
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
          <h1 className="text-2xl font-bold">Drinks Station</h1>
        </div>

        {/* Main Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Beer className="h-5 w-5" />
              Drink Counter
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
                <div className="mt-2">
                  <Badge variant="default">
                    Daily Drinks: {drinkCount}
                  </Badge>
                </div>
              </div>
            )}

            {/* Drink Counter Display */}
            {selectedRfid && (
              <div className="text-center p-8 bg-muted rounded-lg">
                <div className="text-6xl font-bold text-primary mb-2">
                  {drinkCount}
                </div>
                <p className="text-lg text-muted-foreground">
                  Drinks Today
                </p>
              </div>
            )}

            {/* Scan Button */}
            {selectedRfid && (
              <Button
                onClick={handleDrinkScan}
                disabled={isProcessing}
                size="lg"
                className="w-full h-16 text-lg"
              >
                {isProcessing ? (
                  "Processing..."
                ) : (
                  <>
                    <Plus className="h-5 w-5 mr-2" />
                    ADD DRINK
                  </>
                )}
              </Button>
            )}

            {/* Info */}
            <div className="pt-4 border-t text-center text-sm text-muted-foreground">
              <p>No daily limits - tap to record each drink served</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}