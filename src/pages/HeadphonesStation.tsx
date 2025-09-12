import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Headphones, LogIn, LogOut, CheckCircle, XCircle } from "lucide-react";
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

export default function HeadphonesStation() {
  const [selectedRfid, setSelectedRfid] = useState<RfidTag | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [headphoneStatus, setHeadphoneStatus] = useState<'checked_out' | 'available' | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (selectedRfid) {
      checkHeadphoneStatus();
    }
  }, [selectedRfid]);

  const handleRfidScan = (rfidData: RfidTag) => {
    setSelectedRfid(rfidData);
  };

  const checkHeadphoneStatus = async () => {
    if (!selectedRfid?.attendee_id) return;

    // Get the latest headphone transaction
    const { data: lastTransaction } = await supabase
      .from("station_transactions")
      .select("*")
      .eq("attendee_id", selectedRfid.attendee_id)
      .eq("station_type", "headphones")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (lastTransaction && lastTransaction.transaction_type === 'headphone_checkout') {
      setHeadphoneStatus('checked_out');
    } else {
      setHeadphoneStatus('available');
    }
  };

  const handleHeadphoneToggle = async () => {
    if (!selectedRfid?.attendee_id) return;

    setIsProcessing(true);

    try {
      const isCheckingOut = headphoneStatus === 'available';
      const transactionType = isCheckingOut ? 'headphone_checkout' : 'headphone_checkin';
      const newStatus = isCheckingOut ? 'checked_out' : 'available';

      const { error } = await supabase
        .from("station_transactions")
        .insert({
          attendee_id: selectedRfid.attendee_id,
          station_type: 'headphones',
          transaction_type: transactionType,
          rfid_uid: selectedRfid.uid,
          current_status: newStatus
        });

      if (error) throw error;

      setHeadphoneStatus(newStatus as 'checked_out' | 'available');
      toast({
        title: "Success",
        description: `Headphones ${isCheckingOut ? 'checked out' : 'returned'} successfully`,
      });
    } catch (error) {
      console.error("Error updating headphone status:", error);
      toast({
        title: "Error",
        description: "Failed to update headphone status",
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
          <h1 className="text-2xl font-bold">Headphones Station</h1>
        </div>

        {/* RFID Scanner */}
        <RfidScanner
          onScan={handleRfidScan}
          stationType="headphones"
          disabled={isProcessing}
          title="Headphone Check-Out/In"
          placeholder="Select RFID tag..."
        />

        {/* Headphones Action */}
        {selectedRfid && selectedRfid.attendee && (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                {/* Status Display */}
                <div className="p-8 bg-muted rounded-lg">
                  <Headphones className={`mx-auto h-16 w-16 mb-4 ${
                    headphoneStatus === 'checked_out' ? 'text-destructive' : 'text-primary'
                  }`} />
                  <p className="text-lg font-semibold">
                    {headphoneStatus === 'checked_out' ? 'Headphones Checked Out' : 'Headphones Available'}
                  </p>
                </div>

                <Button
                  onClick={handleHeadphoneToggle}
                  disabled={isProcessing}
                  size="lg"
                  className="w-full h-16 text-lg"
                  variant={headphoneStatus === 'checked_out' ? 'default' : 'secondary'}
                >
                  {isProcessing ? (
                    "Processing..."
                  ) : headphoneStatus === 'checked_out' ? (
                    <>
                      <LogIn className="h-5 w-5 mr-2" />
                      CHECK IN HEADPHONES
                    </>
                  ) : (
                    <>
                      <LogOut className="h-5 w-5 mr-2" />
                      CHECK OUT HEADPHONES
                    </>
                  )}
                </Button>

                <div className="text-sm text-muted-foreground">
                  {headphoneStatus === 'checked_out' ? (
                    <div className="flex items-center justify-center gap-2 text-green-600">
                      <CheckCircle className="h-4 w-4" />
                      Headphones currently checked out
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-2 text-gray-600">
                      <XCircle className="h-4 w-4" />
                      No headphones checked out
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}