import React, { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, X, AlertCircle, Loader2, Edit3, Save, XCircle, Camera, Usb } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useRfidCaptureContext } from "@/contexts/RfidCaptureContext";
import { CameraBraceletScanner } from "@/components/CameraBraceletScanner";

interface EnhancedRfidAssignmentCellProps {
  attendeeId: string;
  currentRfidUid?: string | null;
  currentRfidStatus?: string | null;
  attendeeName: string;
  onAssignmentComplete: () => void;
  onOptimisticUpdate?: (attendeeId: string, rfidUid: string | null, rfidStatus: string) => void;
}

export const EnhancedRfidAssignmentCell = ({ 
  attendeeId, 
  currentRfidUid, 
  currentRfidStatus,
  attendeeName,
  onAssignmentComplete,
  onOptimisticUpdate
}: EnhancedRfidAssignmentCellProps) => {
  const [uid, setUid] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [validationError, setValidationError] = useState("");
  const [isValidating, setIsValidating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState("");
  const [isCameraScannerOpen, setIsCameraScannerOpen] = useState(false);
  const [scannerMode, setScannerMode] = useState<'usb' | 'camera'>('usb');
  const inputRef = useRef<HTMLInputElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);
  const { registerInput, unregisterInput, triggerCapture } = useRfidCaptureContext();

  // Register main input with centralized RFID capture
  useEffect(() => {
    const input = inputRef.current;
    if (!input || isEditing) return;

    const onCapture = (capturedUid: string) => {
      setUid(capturedUid);
    };

    registerInput(input, onCapture);
    
    return () => {
      unregisterInput(input);
    };
  }, [registerInput, unregisterInput, isEditing]);

  // Register edit input with centralized RFID capture
  useEffect(() => {
    const editInput = editInputRef.current;
    if (!editInput || !isEditing) return;

    const onCapture = (capturedUid: string) => {
      setEditValue(capturedUid);
    };

    registerInput(editInput, onCapture);
    
    return () => {
      unregisterInput(editInput);
    };
  }, [registerInput, unregisterInput, isEditing]);
  


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
      const result = await validateRfidUid(uid.trim());
    }, 300); // Debounce validation

    return () => clearTimeout(validateTimeout);
  }, [uid, attendeeId, isEditing]);

  // Real-time validation for edit input
  useEffect(() => {
    if (!editValue.trim() || !isEditing) {
      return;
    }

    const validateTimeout = setTimeout(async () => {
      const result = await validateRfidUid(editValue.trim(), true);
    }, 300); // Debounce validation

    return () => clearTimeout(validateTimeout);
  }, [editValue, attendeeId, isEditing]);

  const validateRfidUid = async (rfidUid: string, isEdit: boolean = false): Promise<{ isValid: boolean; duplicateAttendee?: any }> => {
    if (!rfidUid) {
      setValidationError("");
      return { isValid: false };
    }

    setIsValidating(true);
    
    try {
      // Check if UID already exists and is assigned to another attendee
      const { data: existingTag } = await supabase
        .from('rfid_tags')
        .select('attendee_id, status, issued_at, attendee:attendees(first_name, last_name)')
        .eq('uid', rfidUid)
        .in('status', ['assigned', 'active'])
        .single();

      if (existingTag && existingTag.attendee_id && existingTag.attendee_id !== attendeeId) {
        const assignedAttendee = existingTag.attendee as any;
        const issueDate = existingTag.issued_at ? new Date(existingTag.issued_at).toLocaleDateString() : 'Unknown';
        setValidationError(`DUPLICATE: Already assigned to ${assignedAttendee?.first_name} ${assignedAttendee?.last_name} on ${issueDate}. To reassign, first clear it from the original attendee.`);
        return { isValid: false, duplicateAttendee: assignedAttendee };
      }

      setValidationError("");
      return { isValid: true };
    } catch (error) {
      // No existing record found - UID is available
      setValidationError("");
      return { isValid: true };
    } finally {
      setIsValidating(false);
    }
  };

  const handleAssignRfid = async () => {
    if (!uid.trim() || validationError || isProcessing) return;

    setIsProcessing(true);
    
    try {
      // Validate one more time before assignment to prevent duplicates
      const validationResult = await validateRfidUid(uid.trim());
      if (!validationResult.isValid) {
        toast.error("Assignment Blocked - RFID is already assigned to another attendee.");
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

      // Check if the new RFID UID exists in the system but only allow unissued tags
      const { data: tagExists } = await supabase
        .from('rfid_tags')
        .select('uid, status, attendee_id')
        .eq('uid', uid.trim())
        .single();

      if (tagExists && tagExists.attendee_id && tagExists.attendee_id !== attendeeId) {
        // This should not happen due to validation, but double-check for safety
        toast.error("Assignment Blocked - RFID is assigned to another attendee.");
        return;
      }

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
        // Update existing tag (only if unissued or deactivated)
        await supabase
          .from('rfid_tags')
          .update({
            attendee_id: attendeeId,
            status: 'assigned',
            issued_at: new Date().toISOString(),
            deactivated_at: null,
            reason: null
          })
          .eq('uid', uid.trim())
          .in('status', ['unissued', 'deactivated', 'replaced']);
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

      toast.success(`RFID Assigned Successfully: ${uid.trim()} → ${attendeeName}`);

      // Optimistic update first
      if (onOptimisticUpdate) {
        onOptimisticUpdate(attendeeId, uid.trim(), 'assigned');
      }

      setUid("");
      
      // Debounce the full refresh
      const refreshTimeout = setTimeout(() => {
        onAssignmentComplete();
      }, 300);

    } catch (error) {
      console.error('RFID assignment error:', error);
      toast.error("Assignment Failed - Failed to assign RFID. Please try again.");
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
      const validationResult = await validateRfidUid(editValue.trim(), true);
      if (!validationResult.isValid) {
        toast.error("Edit Blocked - RFID is already assigned to another attendee.");
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

      toast.success(`RFID Updated Successfully: ${editValue.trim()} → ${attendeeName}`);

      // Optimistic update first
      if (onOptimisticUpdate) {
        onOptimisticUpdate(attendeeId, editValue.trim(), 'assigned');
      }

      setIsEditing(false);
      setEditValue("");
      
      // Debounce the full refresh
      const refreshTimeout = setTimeout(() => {
        onAssignmentComplete();
      }, 300);

    } catch (error) {
      console.error('RFID edit error:', error);
      toast.error("Edit Failed - Failed to update RFID assignment. Please try again.");
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

      toast.success(`RFID Cleared: ${currentRfidUid} has been unassigned from ${attendeeName}`);

      // Optimistic update first
      if (onOptimisticUpdate) {
        onOptimisticUpdate(attendeeId, null, 'unissued');
      }

      // Debounce the full refresh
      const refreshTimeout = setTimeout(() => {
        onAssignmentComplete();
      }, 300);
    } catch (error) {
      console.error('RFID clear error:', error);
      toast.error("Clear Failed - Failed to clear RFID assignment.");
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
        <div className="flex gap-1 mb-2">
          <Button
            variant={scannerMode === 'usb' ? "default" : "outline"}
            size="sm"
            onClick={() => setScannerMode('usb')}
            className="h-7 px-2 text-xs"
          >
            <Usb className="h-3 w-3 mr-1" />
            USB
          </Button>
          <Button
            variant={scannerMode === 'camera' ? "default" : "outline"}
            size="sm"
            onClick={() => setIsCameraScannerOpen(true)}
            className="h-7 px-2 text-xs"
          >
            <Camera className="h-3 w-3 mr-1" />
            Camera
          </Button>
        </div>
        
        <Input
          ref={inputRef}
          type="text"
          value={uid}
          onChange={(e) => setUid(e.target.value)}
          placeholder={scannerMode === 'usb' ? "Scan RFID or enter UID" : "Enter UID or use camera"}
          className={`font-mono text-sm rfid-input ${validationError ? 'border-destructive' : ''}`}
          disabled={isProcessing}
          data-rfid-input="true"
          data-attendee-id={attendeeId}
        />
        {(validationError || isValidating) && (
          <div className="flex items-center gap-1 mt-1 text-xs max-w-[300px]">
            {isValidating ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                <span className="text-muted-foreground">Validating...</span>
              </>
            ) : (
              <>
                <AlertCircle className="h-3 w-3 text-destructive flex-shrink-0" />
                <span className="text-destructive font-medium">{validationError}</span>
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
        className="h-8 px-3 mt-7"
      >
        {isProcessing ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <Check className="h-3 w-3" />
        )}
      </Button>

      <CameraBraceletScanner
        isOpen={isCameraScannerOpen}
        onClose={() => setIsCameraScannerOpen(false)}
        onScan={(code) => {
          triggerCapture(code, inputRef.current || undefined);
          setIsCameraScannerOpen(false);
        }}
      />
    </div>
  );
};