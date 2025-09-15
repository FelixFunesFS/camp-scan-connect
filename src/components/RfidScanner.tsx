import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Scan, User } from "lucide-react";
import { useRfidCapture } from "@/hooks/useRfidCapture";

interface RfidTag {
  uid: string;
  attendee_id: string | null;
  attendee?: {
    first_name: string;
    last_name: string;
    ticket_type: string;
  };
}

interface RfidScannerProps {
  onScan: (rfidData: RfidTag) => void;
  stationType: string;
  disabled?: boolean;
  placeholder?: string;
  title?: string;
  showAttendeeInfo?: boolean;
  autoTrigger?: boolean;
  isProcessing?: boolean;
}

export const RfidScanner = ({ 
  onScan, 
  stationType, 
  disabled = false, 
  placeholder = "Select RFID tag...",
  title = "RFID Scanner",
  showAttendeeInfo = true,
  autoTrigger = false,
  isProcessing = false
}: RfidScannerProps) => {
  const [selectedRfid, setSelectedRfid] = useState<string>("");
  const [availableRfids, setAvailableRfids] = useState<RfidTag[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadAvailableRfids();
  }, []);

  const loadAvailableRfids = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('rfid_tags')
        .select(`
          uid,
          attendee_id,
          attendee:attendees(first_name, last_name, ticket_type)
        `)
        .eq('status', 'active');

      if (error) throw error;
      setAvailableRfids(data || []);
    } catch (error) {
      console.error('Error loading RFID tags:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleScan = () => {
    const rfidData = availableRfids.find(rfid => rfid.uid === selectedRfid);
    if (rfidData) {
      onScan(rfidData);
    }
  };

  const handleRfidChange = (uid: string) => {
    setSelectedRfid(uid);
    if (autoTrigger && uid) {
      const rfidData = availableRfids.find(rfid => rfid.uid === uid);
      if (rfidData) {
        onScan(rfidData);
      }
    }
  };

  // Enhanced RFID scanning with actual RFID reader support
  const handleDirectRfidScan = async (scannedUid: string) => {
    if (!scannedUid.trim()) return;
    
    // Find the RFID in available list or query database
    let rfidData = availableRfids.find(rfid => rfid.uid === scannedUid);
    
    if (!rfidData) {
      // If not in dropdown list, query database directly
      try {
        const { data, error } = await supabase
          .from('rfid_tags')
          .select(`
            uid,
            attendee_id,
            attendee:attendees(first_name, last_name, ticket_type)
          `)
          .eq('uid', scannedUid)
          .eq('status', 'active')
          .single();

        if (data && !error) {
          rfidData = data;
        }
      } catch (error) {
        console.error('Error querying RFID:', error);
      }
    }

    if (rfidData) {
      setSelectedRfid(scannedUid);
      onScan(rfidData);
    }
  };

  // Use RFID capture hook for auto-scanning
  const { isCapturing } = useRfidCapture({
    onCapture: handleDirectRfidScan,
    enabled: !disabled && !isProcessing
  });

  const selectedRfidData = availableRfids.find(rfid => rfid.uid === selectedRfid);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Scan className="h-5 w-5" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Auto-capture indicator */}
        {isCapturing && (
          <div className="flex items-center justify-center p-2 bg-green-50 border border-green-200 rounded-lg">
            <div className="animate-pulse w-2 h-2 bg-green-500 rounded-full mr-2"></div>
            <span className="text-sm text-green-700">Waiting for RFID scan...</span>
          </div>
        )}

        <div className="space-y-2">
          <Select value={selectedRfid} onValueChange={handleRfidChange} disabled={disabled || isLoading || isProcessing}>
            <SelectTrigger>
              <SelectValue placeholder={isProcessing ? "Processing..." : placeholder} />
            </SelectTrigger>
            <SelectContent className="bg-card border border-border shadow-lg z-50">
              {availableRfids.map((rfid) => (
                <SelectItem key={rfid.uid} value={rfid.uid}>
                  <div className="flex flex-col">
                    <span className="font-mono text-sm">{rfid.uid}</span>
                    {rfid.attendee && (
                      <span className="text-xs text-muted-foreground">
                        {rfid.attendee.first_name} {rfid.attendee.last_name}
                      </span>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedRfidData && showAttendeeInfo && selectedRfidData.attendee && (
          <div className="p-3 bg-muted rounded-lg space-y-2">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span className="font-medium">
                {selectedRfidData.attendee.first_name} {selectedRfidData.attendee.last_name}
              </span>
            </div>
            <Badge variant="outline">
              {selectedRfidData.attendee.ticket_type.replace('_', ' ').toUpperCase()}
            </Badge>
          </div>
        )}

{!autoTrigger && (
          <Button 
            onClick={handleScan}
            disabled={!selectedRfid || disabled}
            className="w-full"
            size="lg"
          >
            <Scan className="h-4 w-4 mr-2" />
            Scan
          </Button>
        )}

        {autoTrigger && isProcessing && (
          <div className="flex items-center justify-center p-4 text-muted-foreground">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent mr-2"></div>
            Processing...
          </div>
        )}
      </CardContent>
    </Card>
  );
};