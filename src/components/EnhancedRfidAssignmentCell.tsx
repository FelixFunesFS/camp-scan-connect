import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Scan, Check, X, AlertCircle, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useGroupRfid } from "@/components/GroupRfidProvider";

interface EnhancedRfidAssignmentCellProps {
  attendeeId: string;
  currentRfidUid?: string;
  currentRfidStatus?: string;
  attendeeName: string;
  onAssignmentComplete: () => void;
  isGroupProcessing?: boolean;
}

export const EnhancedRfidAssignmentCell = ({ 
  attendeeId, 
  currentRfidUid, 
  currentRfidStatus,
  attendeeName,
  onAssignmentComplete,
  isGroupProcessing = false
}: EnhancedRfidAssignmentCellProps) => {
  const [uid, setUid] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [validationError, setValidationError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { isCapturingRfid, focusNextUnassigned, navigateToRow } = useGroupRfid();

  // Auto-focus input when component mounts or when processing starts
  useEffect(() => {
    if (inputRef.current && !currentRfidUid && (isGroupProcessing || !currentRfidUid)) {
      inputRef.current.focus();
    }
  }, [currentRfidUid, isGroupProcessing]);

  // Enhanced keyboard navigation with shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target === inputRef.current) {
        if (e.key === 'Enter' && uid.trim()) {
          e.preventDefault();
          handleAssignRfid();
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          navigateToRow('up');
        } else if (e.key === 'ArrowDown') {
          e.preventDefault();
          navigateToRow('down');
        } else if ((e.ctrlKey || e.metaKey) && e.key === 'g') {
          e.preventDefault();
          focusNextUnassigned();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          setUid("");
          setValidationError("");
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [uid, navigateToRow, focusNextUnassigned]);

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
      // Check if attendee already has an assigned or active RFID
      const { data: existingRfid } = await supabase
        .from('rfid_tags')
        .select('uid, status')
        .eq('attendee_id', attendeeId)
        .in('status', ['assigned', 'active'])
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
            status: 'assigned',
            issued_at: new Date().toISOString()
          });
      } else {
        // Update existing tag
        await supabase
          .from('rfid_tags')
          .update({
            attendee_id: attendeeId,
            status: 'assigned',
            issued_at: new Date().toISOString(),
            deactivated_at: null,
            reason: null
          })
          .eq('uid', uid.trim());
      }

      toast({
        title: "RFID Assigned Successfully",
        description: `UID ${uid.trim()} assigned to ${attendeeName}`,
        duration: 1500
      });

      setUid("");
      onAssignmentComplete();
      
      // In group processing mode, auto-advance immediately
      if (isGroupProcessing) {
        setTimeout(focusNextUnassigned, 200);
      }
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
      // Set RFID back to unissued state and clear attendee assignment
      await supabase
        .from('rfid_tags')
        .update({
          status: 'unissued',
          attendee_id: null,
          deactivated_at: null,
          reason: null,
          activated_at: null,
          activation_method: null
        })
        .eq('uid', currentRfidUid);

      // Reset attendee activation status since they no longer have an RFID
      await supabase
        .from('attendees')
        .update({
          activated_at: null
        })
        .eq('id', attendeeId);

      // Log deactivation transaction
      await supabase
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

      toast({
        title: "RFID Cleared",
        description: `UID ${currentRfidUid} has been cleared and is now unassigned`,
      });

      onAssignmentComplete();
    } catch (error) {
      console.error('RFID deactivation error:', error);
      toast({
        title: "Clear Failed",
        description: "Failed to clear RFID. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const getRfidStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'active': return 'default';
      case 'assigned': return 'secondary';
      case 'unissued': return 'outline';
      case 'lost': return 'destructive';
      case 'replaced': return 'outline';
      case 'deactivated': return 'destructive';
      default: return 'outline';
    }
  };

  if (currentRfidUid && (currentRfidStatus === 'active' || currentRfidStatus === 'assigned')) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex flex-col">
          <span className="font-mono text-sm">{currentRfidUid}</span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleDeactivateRfid}
          disabled={isProcessing}
          className="h-8 px-2"
          title="Remove RFID assignment"
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 min-w-[200px] ${isGroupProcessing ? 'bg-primary/5 rounded-md p-1' : ''}`}>
      <div className="flex-1">
        <Input
          ref={inputRef}
          type="text"
          value={uid}
          onChange={(e) => setUid(e.target.value)}
          onBlur={() => uid.trim() && validateRfidUid(uid)}
          placeholder={isGroupProcessing ? "Scan RFID (Ctrl+G: next)" : "Scan or enter UID (↑↓ navigate)"}
          className={`font-mono text-sm rfid-input ${validationError ? 'border-destructive' : ''} ${isGroupProcessing ? 'border-primary/30' : ''}`}
          disabled={isProcessing}
          data-rfid-input="true"
          data-attendee-id={attendeeId}
        />
        {validationError && (
          <div className="flex items-center gap-1 mt-1 text-xs text-destructive">
            <AlertCircle className="h-3 w-3" />
            {validationError}
          </div>
        )}
      </div>
      <Button
        variant={isGroupProcessing ? "default" : "outline"}
        size="sm"
        onClick={handleAssignRfid}
        disabled={!uid.trim() || isProcessing || !!validationError}
        className={`h-8 px-2 ${isGroupProcessing ? 'bg-primary hover:bg-primary/90' : ''}`}
      >
        {isProcessing ? (
          <div className="animate-spin rounded-full h-3 w-3 border-2 border-primary border-t-transparent" />
        ) : isGroupProcessing ? (
          <Zap className="h-3 w-3" />
        ) : (
          <Check className="h-3 w-3" />
        )}
      </Button>
      {isCapturingRfid && (
        <div className="absolute -top-1 -right-1">
          <Badge variant="default" className="text-xs animate-pulse">
            <Scan className="h-2 w-2 mr-1" />
            Scanning
          </Badge>
        </div>
      )}
    </div>
  );
};