import React, { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, X, AlertCircle, Loader2, Edit3, Save, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface EnhancedRfidAssignmentCellProps {
  attendeeId: string;
  currentRfidUid?: string | null;
  currentRfidStatus?: string | null;
  attendeeName: string;
  onAssignmentComplete: () => void;
}

export const EnhancedRfidAssignmentCell = ({ 
  attendeeId, 
  currentRfidUid, 
  currentRfidStatus,
  attendeeName,
  onAssignmentComplete
}: EnhancedRfidAssignmentCellProps) => {
  const [uid, setUid] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [validationError, setValidationError] = useState("");
  const [isValidating, setIsValidating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Auto-focus input when component mounts or when becomes active
  useEffect(() => {
    if (inputRef.current && !currentRfidUid && !isEditing) {
      // Only auto-focus on initial mount, not during view switches
      const timer = setTimeout(() => {
        inputRef.current?.focus({ preventScroll: true });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [currentRfidUid, isEditing]);

  // Auto-focus edit input when entering edit mode
  useEffect(() => {
    if (isEditing && editInputRef.current) {
      const timer = setTimeout(() => {
        editInputRef.current?.focus();
        editInputRef.current?.select();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isEditing]);

  // Enhanced keyboard handling with better navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target === inputRef.current && !isEditing) {
        switch (e.key) {
          case 'Enter':
            if (uid.trim() && !validationError && !isProcessing) {
              e.preventDefault();
              handleAssignRfid();
            }
            break;
          case 'ArrowUp':
          case 'ArrowDown':
            // Let arrow navigation be handled by parent component
            break;
          case 'Escape':
            e.preventDefault();
            setUid("");
            setValidationError("");
            inputRef.current?.blur();
            break;
        }
      } else if (e.target === editInputRef.current && isEditing) {
        switch (e.key) {
          case 'Enter':
            if (editValue.trim() && !validationError && !isProcessing) {
              e.preventDefault();
              handleSaveEdit();
            }
            break;
          case 'Escape':
            e.preventDefault();
            handleCancelEdit();
            break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [uid, editValue, validationError, isProcessing, isEditing]);

  // Real-time validation with debouncing for assignment input
  useEffect(() => {
    if (!uid.trim() || isEditing) {
      setValidationError("");
      return;
    }

    const validateTimeout = setTimeout(async () => {
      await validateRfidUid(uid.trim());
    }, 300); // Debounce validation

    return () => clearTimeout(validateTimeout);
  }, [uid, attendeeId, isEditing]);

  // Real-time validation for edit input
  useEffect(() => {
    if (!editValue.trim() || !isEditing) {
      return;
    }

    const validateTimeout = setTimeout(async () => {
      await validateRfidUid(editValue.trim(), true);
    }, 300); // Debounce validation

    return () => clearTimeout(validateTimeout);
  }, [editValue, attendeeId, isEditing]);

  const validateRfidUid = async (rfidUid: string, isEdit: boolean = false): Promise<boolean> => {
    if (!rfidUid) {
      setValidationError("");
      return false;
    }

    setIsValidating(true);
    
    try {
      // Check if UID already exists and is assigned to another attendee
      const { data: existingTag } = await supabase
        .from('rfid_tags')
        .select('attendee_id, attendee:attendees(first_name, last_name)')
        .eq('uid', rfidUid)
        .single();

      if (existingTag && existingTag.attendee_id && existingTag.attendee_id !== attendeeId) {
        const assignedAttendee = existingTag.attendee as any;
        setValidationError(`Already assigned to ${assignedAttendee?.first_name} ${assignedAttendee?.last_name}`);
        return false;
      }

      setValidationError("");
      return true;
    } catch (error) {
      // No existing record found - UID is available
      setValidationError("");
      return true;
    } finally {
      setIsValidating(false);
    }
  };

  const handleAssignRfid = async () => {
    if (!uid.trim() || validationError || isProcessing) return;

    setIsProcessing(true);
    
    try {
      // Validate one more time before assignment
      const isValid = await validateRfidUid(uid.trim());
      if (!isValid && validationError) {
        return;
      }

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
            reason: 'Manual reassignment via assignment station'
          })
          .eq('uid', existingRfid.uid);
      }

      // Check if the new RFID UID exists in the system
      const { data: tagExists } = await supabase
        .from('rfid_tags')
        .select('uid, status')
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

      // Log assignment transaction
      await supabase
        .from('station_transactions')
        .insert({
          attendee_id: attendeeId,
          rfid_uid: uid.trim(),
          station_type: 'activation',
          transaction_type: 'activate',
          activation_method: 'pre_assignment',
          extra_data: {
            assignment_source: 'assignment_station',
            previous_rfid: existingRfid?.uid || null
          }
        });

      toast({
        title: "RFID Assigned Successfully",
        description: `${uid.trim()} → ${attendeeName}`,
      });

      setUid("");
      onAssignmentComplete();
      
      // Auto-focus next unassigned field after brief delay
      setTimeout(() => {
        const nextInput = document.querySelector('input[data-rfid-input="true"]:not([value])') as HTMLInputElement;
        if (nextInput) {
          nextInput.focus();
          nextInput.select();
        }
      }, 200);

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

  // Edit mode functions
  const handleStartEdit = () => {
    setEditValue(currentRfidUid || "");
    setIsEditing(true);
    setValidationError("");
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditValue("");
    setValidationError("");
  };

  const handleSaveEdit = async () => {
    if (!editValue.trim() || validationError || isProcessing) return;

    setIsProcessing(true);
    
    try {
      // Validate the new UID
      const isValid = await validateRfidUid(editValue.trim(), true);
      if (!isValid && validationError) {
        return;
      }

      // Clear the old RFID assignment
      if (currentRfidUid && currentRfidUid !== editValue.trim()) {
        await supabase
          .from('rfid_tags')
          .update({
            status: 'replaced',
            attendee_id: null,
            deactivated_at: new Date().toISOString(),
            reason: 'Manual reassignment via edit'
          })
          .eq('uid', currentRfidUid);
      }

      // Check if the new RFID UID exists in the system
      const { data: tagExists } = await supabase
        .from('rfid_tags')
        .select('uid, status')
        .eq('uid', editValue.trim())
        .single();

      if (!tagExists) {
        // Create new RFID tag entry
        await supabase
          .from('rfid_tags')
          .insert({
            uid: editValue.trim(),
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
          .eq('uid', editValue.trim());
      }

      // Log the edit transaction
      await supabase
        .from('station_transactions')
        .insert({
          attendee_id: attendeeId,
          rfid_uid: editValue.trim(),
          station_type: 'activation',
          transaction_type: 'activate',
          activation_method: 'edit_assignment',
          extra_data: {
            assignment_source: 'assignment_station_edit',
            previous_rfid: currentRfidUid || null,
            edit_action: true
          }
        });

      toast({
        title: "RFID Updated Successfully",
        description: `${editValue.trim()} → ${attendeeName}`,
      });

      setIsEditing(false);
      setEditValue("");
      onAssignmentComplete();

    } catch (error) {
      console.error('RFID edit error:', error);
      toast({
        title: "Edit Failed",
        description: "Failed to update RFID assignment. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClearRfid = async () => {
    if (!currentRfidUid) return;

    setIsProcessing(true);
    try {
      // Set RFID back to unissued state and clear attendee assignment
      await supabase
        .from('rfid_tags')
        .update({
          status: 'unissued',
          attendee_id: null,
          deactivated_at: new Date().toISOString(),
          reason: 'Cleared via assignment station'
        })
        .eq('uid', currentRfidUid);

      // Reset attendee activation status
      await supabase
        .from('attendees')
        .update({ activated_at: null })
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
            deactivation_method: 'assignment_station_clear'
          }
        });

      toast({
        title: "RFID Cleared",
        description: `${currentRfidUid} has been unassigned from ${attendeeName}`,
      });

      onAssignmentComplete();
    } catch (error) {
      console.error('RFID clear error:', error);
      toast({
        title: "Clear Failed",
        description: "Failed to clear RFID assignment.",
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

  // Show assigned RFID with edit/clear buttons or edit input
  if (currentRfidUid && (currentRfidStatus === 'active' || currentRfidStatus === 'assigned')) {
    if (isEditing) {
      return (
        <div className="flex items-start gap-2 min-w-[280px]">
          <div className="flex-1">
            <Input
              ref={editInputRef}
              type="text"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              placeholder="Enter new RFID UID"
              className={`font-mono text-sm ${validationError ? 'border-destructive' : ''}`}
              disabled={isProcessing}
              data-rfid-input="true"
              data-attendee-id={attendeeId}
            />
            {(validationError || isValidating) && (
              <div className="flex items-center gap-1 mt-1 text-xs">
                {isValidating ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                    <span className="text-muted-foreground">Validating...</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-3 w-3 text-destructive" />
                    <span className="text-destructive">{validationError}</span>
                  </>
                )}
              </div>
            )}
          </div>
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSaveEdit}
              disabled={!editValue.trim() || !!validationError || isProcessing || isValidating}
              className="h-8 px-3"
              title="Save changes"
            >
              {isProcessing ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Save className="h-3 w-3" />
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCancelEdit}
              disabled={isProcessing}
              className="h-8 px-3"
              title="Cancel edit"
            >
              <XCircle className="h-3 w-3" />
            </Button>
          </div>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-2 min-w-[280px]">
        <div className="flex flex-col flex-1">
          <span className="font-mono text-sm font-medium">{currentRfidUid}</span>
          <Badge variant={getRfidStatusColor(currentRfidStatus)} className="text-xs w-fit mt-1">
            {currentRfidStatus}
          </Badge>
        </div>
        <div className="flex gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={handleStartEdit}
            disabled={isProcessing}
            className="h-8 px-3"
            title="Edit RFID assignment"
          >
            <Edit3 className="h-3 w-3" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleClearRfid}
            disabled={isProcessing}
            className="h-8 px-3"
            title="Clear RFID assignment"
          >
            {isProcessing ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <X className="h-3 w-3" />
            )}
          </Button>
        </div>
      </div>
    );
  }

  // Show assignment input for unassigned attendees
  return (
    <div className="flex items-start gap-2 min-w-[250px]">
      <div className="flex-1">
        <Input
          ref={inputRef}
          type="text"
          value={uid}
          onChange={(e) => setUid(e.target.value)}
          placeholder="Scan RFID or enter UID"
          className={`font-mono text-sm rfid-input ${validationError ? 'border-destructive' : ''}`}
          disabled={isProcessing}
          data-rfid-input="true"
          data-attendee-id={attendeeId}
        />
        {(validationError || isValidating) && (
          <div className="flex items-center gap-1 mt-1 text-xs">
            {isValidating ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                <span className="text-muted-foreground">Validating...</span>
              </>
            ) : (
              <>
                <AlertCircle className="h-3 w-3 text-destructive" />
                <span className="text-destructive">{validationError}</span>
              </>
            )}
          </div>
        )}
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={handleAssignRfid}
        disabled={!uid.trim() || !!validationError || isProcessing || isValidating}
        className="h-8 px-3"
      >
        {isProcessing ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <Check className="h-3 w-3" />
        )}
      </Button>
    </div>
  );
};