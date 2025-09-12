import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, UserCheck, UserX } from "lucide-react";
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
  status: 'active' | 'inactive' | 'unissued';
}

export default function ActivationStation() {
  const [selectedRfid, setSelectedRfid] = useState<string>("");
  const [availableRfids, setAvailableRfids] = useState<RfidTag[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activationStatus, setActivationStatus] = useState<'active' | 'inactive' | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    loadAvailableRfids();
  }, []);

  const loadAvailableRfids = async () => {
    const { data: rfids, error } = await supabase
      .from("rfid_tags")
      .select(`
        uid,
        attendee_id,
        status,
        attendee:attendees(first_name, last_name, ticket_type)
      `)
      .eq("status", "active");

    if (error) {
      console.error("Error loading RFIDs:", error);
      return;
    }

    setAvailableRfids(rfids as RfidTag[]);
  };

  useEffect(() => {
    if (selectedRfid) {
      checkCurrentStatus();
    }
  }, [selectedRfid]);

  const checkCurrentStatus = async () => {
    if (!selectedRfid) return;

    const selectedTag = availableRfids.find(tag => tag.uid === selectedRfid);
    if (!selectedTag?.attendee_id) return;

    // Check latest activation status
    const { data: lastTransaction } = await supabase
      .from("station_transactions")
      .select("*")
      .eq("attendee_id", selectedTag.attendee_id)
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
    if (!selectedRfid) return;

    const selectedTag = availableRfids.find(tag => tag.uid === selectedRfid);
    if (!selectedTag?.attendee_id) return;

    setIsProcessing(true);

    const newStatus = activationStatus === 'active' ? 'inactive' : 'active';
    const transactionType = newStatus === 'active' ? 'activate' : 'deactivate';

    try {
      const { error } = await supabase
        .from("station_transactions")
        .insert({
          attendee_id: selectedTag.attendee_id,
          station_type: 'activation',
          transaction_type: transactionType,
          rfid_uid: selectedRfid,
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
            Back to Ranger Hub
          </Button>
          <h1 className="text-2xl font-bold">Activation Station</h1>
        </div>

        {/* Main Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5" />
              Attendee Activation Control
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* RFID Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Select RFID Tag:</label>
              <Select value={selectedRfid} onValueChange={setSelectedRfid}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose an RFID tag to activate/deactivate" />
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
                  <Badge variant={activationStatus === 'active' ? 'default' : 'secondary'}>
                    Status: {activationStatus === 'active' ? 'ACTIVE' : 'INACTIVE'}
                  </Badge>
                </div>
              </div>
            )}

            {/* Action Button */}
            {selectedRfid && (
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
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}