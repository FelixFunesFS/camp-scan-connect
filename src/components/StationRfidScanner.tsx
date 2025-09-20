import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Scan, User, AlertCircle } from "lucide-react";
import { rfidService } from "@/services/rfidService";
import { useRfidCapture } from "@/hooks/useRfidCapture";
import { toast } from "sonner";

interface AttendeeInfo {
  id: string;
  first_name: string;
  last_name: string;
  ticket_type: string;
  email?: string;
  phone?: string;
}

interface StationRfidScannerProps {
  onScan: (attendee: AttendeeInfo, rfidUid: string) => void;
  stationType: string;
  disabled?: boolean;
  title?: string;
  isProcessing?: boolean;
  showTicketType?: boolean;
}

export const StationRfidScanner = ({ 
  onScan, 
  stationType, 
  disabled = false, 
  title = "RFID Scanner",
  isProcessing = false,
  showTicketType = true
}: StationRfidScannerProps) => {
  const [manualUid, setManualUid] = useState("");
  const [lastScannedUid, setLastScannedUid] = useState("");
  const [attendeeInfo, setAttendeeInfo] = useState<AttendeeInfo | null>(null);
  const [error, setError] = useState("");
  

  const handleRfidFound = useCallback(async (uid: string) => {
    if (!uid.trim()) return;

    setError("");
    setLastScannedUid(uid);
    
    try {
      const rfidData = await rfidService.findAttendeeByRfid(uid);
      
      if (!rfidData || !rfidData.attendee) {
        setError(`RFID ${uid} not found or not assigned to any attendee`);
        setAttendeeInfo(null);
        return;
      }

      const attendee = rfidData.attendee as AttendeeInfo;
      setAttendeeInfo(attendee);
      setError("");
      
      // Trigger the scan callback
      onScan(attendee, uid);
      
    } catch (error) {
      console.error('Error processing RFID scan:', error);
      setError('Failed to process RFID scan. Please try again.');
      setAttendeeInfo(null);
    }
  }, [onScan]);

  // Auto-capture RFID from USB reader
  const { isCapturing } = useRfidCapture({
    onCapture: handleRfidFound,
    enabled: !disabled && !isProcessing
  });

  const handleManualScan = () => {
    if (manualUid.trim()) {
      handleRfidFound(manualUid.trim());
      setManualUid("");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Scan className="h-5 w-5" />
          {title}
          {(isCapturing || isProcessing) && (
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent" />
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Manual input for RFID UID */}
        <div className="flex gap-2">
          <Input
            type="text"
            value={manualUid}
            onChange={(e) => setManualUid(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleManualScan()}
            placeholder="Scan or enter RFID UID"
            className="font-mono"
            disabled={disabled || isProcessing}
            data-rfid-input="true"
          />
          <Button
            onClick={handleManualScan}
            disabled={!manualUid.trim() || disabled || isProcessing}
            size="sm"
          >
            <Scan className="h-4 w-4" />
          </Button>
        </div>

        {/* Status indicator */}
        {isCapturing && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="animate-pulse w-2 h-2 bg-green-500 rounded-full" />
            Waiting for RFID scan...
          </div>
        )}

        {isProcessing && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent" />
            Processing...
          </div>
        )}

        {/* Error display */}
        {error && (
          <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-lg">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {/* Attendee info display */}
        {attendeeInfo && lastScannedUid && (
          <div className="p-3 bg-muted rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4" />
                <span className="font-medium">
                  {attendeeInfo.first_name} {attendeeInfo.last_name}
                </span>
              </div>
              {showTicketType && (
                <Badge variant="outline">
                  {attendeeInfo.ticket_type.replace('_', ' ').toUpperCase()}
                </Badge>
              )}
            </div>
            
            {attendeeInfo.email && (
              <div className="text-sm text-muted-foreground">
                Email: {attendeeInfo.email}
              </div>
            )}
            
            <div className="text-xs text-muted-foreground font-mono">
              RFID: {lastScannedUid}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};