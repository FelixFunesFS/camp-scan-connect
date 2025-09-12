import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, UserCheck, UserX } from "lucide-react";
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
  status?: 'active' | 'inactive' | 'unissued';
}

export default function ActivationStation() {
  const [selectedRfid, setSelectedRfid] = useState<RfidTag | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activationStatus, setActivationStatus] = useState<'active' | 'inactive' | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (selectedRfid) {
      checkCurrentStatus();
    }
  }, [selectedRfid]);

  const handleRfidScan = (rfidData: RfidTag) => {
    setSelectedRfid(rfidData);
  };

  const checkCurrentStatus = async () => {
    if (!selectedRfid?.attendee_id) return;

    // Check latest activation status
    const { data: lastTransaction } = await supabase
      .from("station_transactions")
      .select("*")
      .eq("attendee_id", selectedRfid.attendee_id)
      .eq("station_type", "activation")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (lastTransaction) {
      setActivationStatus(lastTransaction.transaction_type === 'activate' ? 'active' : 'inactive');
    } else {
      setActivationStatus('inactive');
    }
  };

  const handleActivationToggle = async () => {
    if (!selectedRfid?.attendee_id) return;

    setIsProcessing(true);

    const newStatus = activationStatus === 'active' ? 'inactive' : 'active';
    const transactionType = newStatus === 'active' ? 'activate' : 'deactivate';

    try {
      const { error } = await supabase
        .from("station_transactions")
        .insert({
          attendee_id: selectedRfid.attendee_id,
          station_type: 'activation',
          transaction_type: transactionType,
          rfid_uid: selectedRfid.uid,
          current_status: newStatus
        });

      if (error) throw error;

      setActivationStatus(newStatus);
      toast({
        title: "Success",
        description: `Attendee ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully`,
      });
    } catch (error) {
      console.error("Error updating activation:", error);
      toast({
        title: "Error",
        description: "Failed to update activation status",
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
          <h1 className="text-2xl font-bold">Activation Station</h1>
        </div>

        {/* RFID Scanner */}
        <RfidScanner
          onScan={handleRfidScan}
          stationType="activation"
          disabled={isProcessing}
          title="Attendee Activation Control"
          placeholder="Select RFID tag..."
        />

        {/* Activation Action */}
        {selectedRfid && selectedRfid.attendee && (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <Badge variant={activationStatus === 'active' ? 'default' : 'secondary'} className="text-lg px-4 py-2">
                  Status: {activationStatus === 'active' ? 'ACTIVE' : 'INACTIVE'}
                </Badge>

                <Button
                  onClick={handleActivationToggle}
                  disabled={isProcessing}
                  size="lg"
                  className="w-full h-16 text-lg"
                  variant={activationStatus === 'active' ? 'destructive' : 'default'}
                >
                  {isProcessing ? (
                    "Processing..."
                  ) : activationStatus === 'active' ? (
                    <>
                      <UserX className="h-5 w-5 mr-2" />
                      DEACTIVATE
                    </>
                  ) : (
                    <>
                      <UserCheck className="h-5 w-5 mr-2" />
                      ACTIVATE
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}