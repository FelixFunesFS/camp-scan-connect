import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Headphones, LogIn, LogOut } from "lucide-react";
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

export default function HeadphonesStation() {
  const [selectedRfid, setSelectedRfid] = useState<string>("");
  const [availableRfids, setAvailableRfids] = useState<RfidTag[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [headphoneStatus, setHeadphoneStatus] = useState<'checked_out' | 'available' | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    loadAvailableRfids();
  }, []);

  useEffect(() => {
    if (selectedRfid) {
      checkHeadphoneStatus();
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

  const checkHeadphoneStatus = async () => {
    if (!selectedRfid) return;

    const selectedTag = availableRfids.find(tag => tag.uid === selectedRfid);
    if (!selectedTag?.attendee_id) return;

    // Get the latest headphone transaction
    const { data: lastTransaction } = await supabase
      .from("station_transactions")
      .select("*")
      .eq("attendee_id", selectedTag.attendee_id)
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
    if (!selectedRfid) return;

    const selectedTag = availableRfids.find(tag => tag.uid === selectedRfid);
    if (!selectedTag?.attendee_id) return;

    setIsProcessing(true);

    try {
      const isCheckingOut = headphoneStatus === 'available';
      const transactionType = isCheckingOut ? 'headphone_checkout' : 'headphone_checkin';
      const newStatus = isCheckingOut ? 'checked_out' : 'available';

      const { error } = await supabase
        .from("station_transactions")
        .insert({
          attendee_id: selectedTag.attendee_id,
          station_type: 'headphones',
          transaction_type: transactionType,
          rfid_uid: selectedRfid,
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
          <h1 className="text-2xl font-bold">Headphones Station</h1>
        </div>

        {/* Main Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Headphones className="h-5 w-5" />
              Headphone Check-Out/In
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
                  <Badge variant={headphoneStatus === 'checked_out' ? 'destructive' : 'default'}>
                    Status: {headphoneStatus === 'checked_out' ? 'CHECKED OUT' : 'AVAILABLE'}
                  </Badge>
                </div>
              </div>
            )}

            {/* Status Display */}
            {selectedRfid && (
              <div className="text-center p-8 bg-muted rounded-lg">
                <Headphones className={`mx-auto h-16 w-16 mb-4 ${
                  headphoneStatus === 'checked_out' ? 'text-destructive' : 'text-primary'
                }`} />
                <p className="text-lg font-semibold">
                  {headphoneStatus === 'checked_out' ? 'Headphones Checked Out' : 'Headphones Available'}
                </p>
              </div>
            )}

            {/* Action Button */}
            {selectedRfid && (
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
            )}

            {/* Info */}
            <div className="pt-4 border-t text-center text-sm text-muted-foreground">
              <p>Track headphone check-out and return for event attendees</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}