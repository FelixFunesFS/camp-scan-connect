import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Scan, Check, X, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface RfidAssignmentCellProps {
  attendeeId: string;
  currentRfidUid?: string;
  currentRfidStatus?: string;
  attendeeName: string;
  onAssignmentComplete: () => void;
}

export const RfidAssignmentCell = ({ 
  attendeeId, 
  currentRfidUid, 
  currentRfidStatus,
  attendeeName,
  onAssignmentComplete 
}: RfidAssignmentCellProps) => {
  const [uid, setUid] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [validationError, setValidationError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Auto-focus input when component mounts
  useEffect(() => {
    if (inputRef.current && !currentRfidUid) {
      inputRef.current.focus();
    }
  }, [currentRfidUid]);

  // Listen for RFID reader input (typically ends with Enter)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target === inputRef.current && e.key === 'Enter' && uid.trim()) {
        e.preventDefault();
        handleAssignRfid();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [uid]);

  const validateRfidUid = async (rfidUid: string): Promise<boolean> => {
    if (!rfidUid.trim()) {
      setValidationError("RFID UID cannot be empty");
      return false;
    }

    // Check if UID already exists and is assigned to another attendee
    const { data: existingTag } = await supabase
      .from('rfid_tags')
      .select('attendee_id, attendee:attendees(first_name, last_name)')
      .eq('uid', rfidUid.trim())
      .single();

    if (existingTag && existingTag.attendee_id && existingTag.attendee_id !== attendeeId) {
      const assignedAttendee = existingTag.attendee as any;
      setValidationError(`Already assigned to ${assignedAttendee?.first_name} ${assignedAttendee?.last_name}`);
      return false;
    }

    setValidationError("");
    return true;
  };

  const handleAssignRfid = async () => {
    if (!uid.trim()) return;

    const isValid = await validateRfidUid(uid);
    if (!isValid) return;

    setIsProcessing(true);
    
    try {
      // Check if attendee already has an active RFID
      const { data: existingRfid } = await supabase
        .from('rfid_tags')
        .select('uid, status')
        .eq('attendee_id', attendeeId)
        .eq('status', 'active')
        .single();

      if (existingRfid) {
        // Deactivate old RFID first
        await supabase
          .from('rfid_tags')
          .update({ 
            status: 'replaced',
            deactivated_at: new Date().toISOString(),
            reason: 'Manual reassignment'
          })
          .eq('uid', existingRfid.uid);
      }

      // Check if the new RFID UID exists in the system
      const { data: tagExists } = await supabase
        .from('rfid_tags')
        .select('uid')
        .eq('uid', uid.trim())
        .single();

      if (!tagExists) {
        // Create new RFID tag entry
        await supabase
          .from('rfid_tags')
          .insert({
            uid: uid.trim(),
            attendee_id: attendeeId,
            status: 'active',
            issued_at: new Date().toISOString()
          });
      } else {
        // Update existing tag
        await supabase
          .from('rfid_tags')
          .update({
            attendee_id: attendeeId,
            status: 'active',
            issued_at: new Date().toISOString(),
            deactivated_at: null,
            reason: null
          })
          .eq('uid', uid.trim());
      }

      // Log the assignment transaction
      const { error: transactionError } = await supabase
        .from('station_transactions')
        .insert({
          attendee_id: attendeeId,
          rfid_uid: uid.trim(),
          station_type: 'activation',
          transaction_type: 'activate',
          current_status: 'active',
          extra_data: {
            assignment_method: 'manual',
            previous_rfid: existingRfid?.uid || null
          }
        });

      if (transactionError) {
        console.error('Transaction logging error:', transactionError);
      }

      toast({
        title: "RFID Assigned",
        description: `UID ${uid.trim()} assigned to ${attendeeName}`,
      });

      setUid("");
      onAssignmentComplete();
    } catch (error) {
      console.error('RFID assignment error:', error);
      toast({
        title: "Assignment Failed",
        description: "Failed to assign RFID. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeactivateRfid = async () => {
    if (!currentRfidUid) return;

    setIsProcessing(true);
    try {
      await supabase
        .from('rfid_tags')
        .update({
          status: 'deactivated',
          deactivated_at: new Date().toISOString(),
          reason: 'Manual deactivation'
        })
        .eq('uid', currentRfidUid);

      // Log deactivation transaction
      const { error: transactionError } = await supabase
        .from('station_transactions')
        .insert({
          attendee_id: attendeeId,
          rfid_uid: currentRfidUid,
          station_type: 'activation',
          transaction_type: 'deactivate',
          current_status: 'inactive',
          extra_data: {
            deactivation_method: 'manual'
          }
        });

      if (transactionError) {
        console.error('Transaction logging error:', transactionError);
      }

      toast({
        title: "RFID Deactivated",
        description: `UID ${currentRfidUid} has been deactivated`,
      });

      onAssignmentComplete();
    } catch (error) {
      console.error('RFID deactivation error:', error);
      toast({
        title: "Deactivation Failed",
        description: "Failed to deactivate RFID. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const getRfidStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'active': return 'default';
      case 'unissued': return 'secondary';
      case 'lost': return 'destructive';
      case 'replaced': return 'outline';
      case 'deactivated': return 'destructive';
      default: return 'outline';
    }
  };

  if (currentRfidUid && currentRfidStatus === 'active') {
    return (
      <div className="flex items-center gap-2">
        <div className="flex flex-col">
          <span className="font-mono text-sm">{currentRfidUid}</span>
          <Badge variant={getRfidStatusColor(currentRfidStatus)} className="text-xs w-fit">
            {currentRfidStatus}
          </Badge>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleDeactivateRfid}
          disabled={isProcessing}
          className="h-8 px-2"
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 min-w-[200px]">
      <div className="flex-1">
        <Input
          ref={inputRef}
          type="text"
          value={uid}
          onChange={(e) => setUid(e.target.value)}
          onBlur={() => uid.trim() && validateRfidUid(uid)}
          placeholder="Scan or enter UID"
          className={`font-mono text-sm ${validationError ? 'border-destructive' : ''}`}
          disabled={isProcessing}
        />
        {validationError && (
          <div className="flex items-center gap-1 mt-1 text-xs text-destructive">
            <AlertCircle className="h-3 w-3" />
            {validationError}
          </div>
        )}
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={handleAssignRfid}
        disabled={!uid.trim() || isProcessing || !!validationError}
        className="h-8 px-2"
      >
        {isProcessing ? (
          <div className="animate-spin rounded-full h-3 w-3 border-2 border-primary border-t-transparent" />
        ) : (
          <Check className="h-3 w-3" />
        )}
      </Button>
    </div>
  );
};