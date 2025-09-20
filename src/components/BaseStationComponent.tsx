import { useState, useEffect, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { RfidScanner } from "@/components/RfidScanner";
import { rfidService } from "@/services/rfidService";
import { StationTransactionService } from "@/services/stationTransactionService";
import { RfidTag, AttendeeReadiness, StationType } from "@/types/station";

interface BaseStationProps {
  stationType: StationType;
  stationTitle: string;
  children: (props: StationChildProps) => ReactNode;
}

export interface StationChildProps {
  selectedRfid: RfidTag | null;
  attendeeReadiness: AttendeeReadiness | null;
  isProcessing: boolean;
  setIsProcessing: (processing: boolean) => void;
  recordTransaction: (transaction: any) => Promise<void>;
  loadDailyCount: (transactionTypes?: string[]) => Promise<number>;
  getLatestStatus: (statusField?: string) => Promise<string | null>;
}

export function BaseStationComponent({ stationType, stationTitle, children }: BaseStationProps) {
  const [selectedRfid, setSelectedRfid] = useState<RfidTag | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [attendeeReadiness, setAttendeeReadiness] = useState<AttendeeReadiness | null>(null);
  const navigate = useNavigate();
  

  const handleRfidScan = async (rfidData: RfidTag) => {
    setSelectedRfid(rfidData);
    if (rfidData.attendee_id) {
      // Use proper attendee readiness check instead of simplified logic
      const readiness = await rfidService.checkAttendeeReadiness(rfidData.attendee_id);
      setAttendeeReadiness(readiness);
    }
  };

  const recordTransaction = async (transaction: any) => {
    if (!selectedRfid?.attendee_id) return;
    
    const fullTransaction = {
      ...transaction,
      attendee_id: selectedRfid.attendee_id,
      station_type: stationType,
      rfid_uid: selectedRfid.uid,
    };

    await StationTransactionService.recordTransaction(fullTransaction);
  };

  const loadDailyCount = async (transactionTypes?: string[]) => {
    if (!selectedRfid?.attendee_id) return 0;
    return await StationTransactionService.getDailyCount(
      selectedRfid.attendee_id, 
      stationType, 
      transactionTypes as any
    );
  };

  const getLatestStatus = async (statusField?: string) => {
    if (!selectedRfid?.attendee_id) return null;
    return await StationTransactionService.getLatestStatus(
      selectedRfid.attendee_id, 
      stationType, 
      statusField
    );
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button 
            variant="outline" 
            onClick={() => navigate("/")}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Main Hub
          </Button>
          <h1 className="text-2xl font-bold">{stationTitle}</h1>
        </div>

        {/* RFID Scanner */}
        <RfidScanner
          onScan={handleRfidScan}
          stationType={stationType}
          disabled={isProcessing}
          title={stationTitle}
          placeholder="Select RFID tag..."
          showTicketType={!['meal', 'drinks', 'headphones'].includes(stationType)}
        />

        {/* Station-specific content */}
        {selectedRfid && selectedRfid.attendee && attendeeReadiness?.isReady && children({
          selectedRfid,
          attendeeReadiness,
          isProcessing,
          setIsProcessing,
          recordTransaction,
          loadDailyCount,
          getLatestStatus
        })}
      </div>
    </div>
  );
}