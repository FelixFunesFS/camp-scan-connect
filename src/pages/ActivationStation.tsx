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
    is_veteran?: boolean;
    military_branch?: string;
    veteran_thanked_at?: string;
  };
  status?: 'active' | 'inactive' | 'unissued';
}

export default function ActivationStation() {
  const [selectedRfid, setSelectedRfid] = useState<RfidTag | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activationStatus, setActivationStatus] = useState<'active' | 'inactive' | null>(null);
  const [attendeeDetails, setAttendeeDetails] = useState<any>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (selectedRfid) {
      checkCurrentStatus();
    }
  }, [selectedRfid]);

  const handleRfidScan = async (rfidData: RfidTag) => {
    setSelectedRfid(rfidData);
    
    // Only proceed if RFID is assigned to an attendee
    if (rfidData.attendee_id) {
      // Fetch full attendee details including veteran status
      const { data: attendee } = await supabase
        .from('attendees')
        .select('*')
        .eq('id', rfidData.attendee_id)
        .single();
      
      setAttendeeDetails(attendee);
      await checkCurrentStatus(rfidData.attendee_id);
    } else {
      toast({
        title: "RFID Not Assigned",
        description: "This RFID is not assigned to any attendee. Please assign it first.",
        variant: "destructive",
      });
    }
  };

  const checkCurrentStatus = async (attendeeId?: string) => {
    const targetAttendeeId = attendeeId || selectedRfid?.attendee_id;
    if (!targetAttendeeId) return;

    // Check latest activation status
    const { data: lastTransaction } = await supabase
      .from("station_transactions")
      .select("*")
      .eq("attendee_id", targetAttendeeId)
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

  const handleActivationToggle = async (rfidData?: RfidTag) => {
    const attendeeId = rfidData?.attendee_id || selectedRfid?.attendee_id;
    if (!attendeeId) return;

    setIsProcessing(true);

    const newStatus = activationStatus === 'active' ? 'inactive' : 'active';
    const transactionType = newStatus === 'active' ? 'activate' : 'deactivate';

    try {
      const { error } = await supabase
        .from("station_transactions")
        .insert({
          attendee_id: attendeeId,
          station_type: 'activation',
          transaction_type: transactionType,
          rfid_uid: rfidData?.uid || selectedRfid?.uid,
          current_status: newStatus
        });

      if (error) throw error;

      // Check if veteran and this is their first activation (and we should thank them)
      if (attendeeDetails?.is_veteran && !attendeeDetails?.veteran_thanked_at && transactionType === 'activate') {
        // Update veteran_thanked_at timestamp
        await supabase
          .from('attendees')
          .update({ veteran_thanked_at: new Date().toISOString() })
          .eq('id', attendeeId);

        // Show special veteran message
        toast({
          title: "🇺🇸 Thank You for Your Service!",
          description: `Welcome to Melanated Campout 2025, ${attendeeDetails.first_name}! We honor your dedication to our country.${attendeeDetails.military_branch ? ` Thank you for serving in the ${attendeeDetails.military_branch}.` : ''}`,
          duration: 6000,
        });
      } else {
        toast({
          title: "Success",
          description: `Attendee ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully`,
        });
      }

      setActivationStatus(newStatus);
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
        {selectedRfid && selectedRfid.attendee_id && selectedRfid.attendee && (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <Badge variant={activationStatus === 'active' ? 'default' : 'secondary'} className="text-lg px-4 py-2">
                  Status: {activationStatus === 'active' ? 'ACTIVE' : 'INACTIVE'}
                </Badge>

                <Button
                  onClick={() => handleActivationToggle()}
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