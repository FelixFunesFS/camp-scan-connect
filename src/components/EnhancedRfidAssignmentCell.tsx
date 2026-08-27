import { getCurrentEventId } from "@/lib/eventRuntime";
import React, { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, X, AlertCircle, Loader2, Edit3, Save, XCircle, Camera, Usb, RefreshCw } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useRfidCaptureContext } from "@/contexts/RfidCaptureContext";
import { CameraBraceletScanner } from "@/components/CameraBraceletScanner";
import { inferCredentialType, normalizeCredential } from "@/lib/credentialFormat";

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
  const [isReplacing, setIsReplacing] = useState(false);
  const [replaceValue, setReplaceValue] = useState("");
  const [replaceReason, setReplaceReason] = useState("");
  const [isCameraScannerOpen, setIsCameraScannerOpen] = useState(false);
  const [scannerMode, setScannerMode] = useState<'usb' | 'camera'>('usb');
  const inputRef = useRef<HTMLInputElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);
  const { registerInput, unregisterInput, triggerCapture } = useRfidCaptureContext();

  // Register main input with centralized code capture
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

  // Register edit input with centralized code capture
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
            if (normalizeCredential(uid) && !validationError && !isProcessing) {
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
            if (normalizeCredential(editValue) && !validationError && !isProcessing) {
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
    if (!normalizeCredential(uid) || isEditing) {
      setValidationError("");
      return;
    }

    const validateTimeout = setTimeout(async () => {
      const result = await validateRfidUid(normalizeCredential(uid));
    }, 300); // Debounce validation

    return () => clearTimeout(validateTimeout);
  }, [uid, attendeeId, isEditing]);

  // Real-time validation for edit input
  useEffect(() => {
    if (!normalizeCredential(editValue) || !isEditing) {
      return;
    }

    const validateTimeout = setTimeout(async () => {
      const result = await validateRfidUid(normalizeCredential(editValue), true);
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
        .eq('event_id', getCurrentEventId())
        .eq('uid', normalizeCredential(rfidUid))
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
    if (!normalizeCredential(uid) || validationError || isProcessing) return;

    setIsProcessing(true);
    
    try {
      // Validate one more time before assignment to prevent duplicates
      const validationResult = await validateRfidUid(normalizeCredential(uid));
      if (!validationResult.isValid) {
        toast.error("Assignment blocked - this wristband is already assigned to another attendee.");
        return;
      }

      // Check if attendee already has an assigned or active RFID
      const { data: existingRfid } = await supabase
        .from('rfid_tags')
        .select('uid, status')
        .eq('event_id', getCurrentEventId())
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

      // Check if the new Code exists in the system but only allow unissued tags
      const { data: tagExists } = await supabase
        .from('rfid_tags')
        .select('uid, status, attendee_id')
        .eq('event_id', getCurrentEventId())
        .eq('uid', normalizeCredential(uid))
        .single();

      if (tagExists && tagExists.attendee_id && tagExists.attendee_id !== attendeeId) {
        // This should not happen due to validation, but double-check for safety
        toast.error("Assignment blocked - this wristband is assigned to another attendee.");
        return;
      }

      if (!tagExists) {
        // Create new credential entry
        await supabase
          .from('rfid_tags')
          .insert({
            uid: normalizeCredential(uid),
            attendee_id: attendeeId,
            status: 'assigned',
            issued_at: new Date().toISOString(),
            event_id: getCurrentEventId(),
            credential_type: inferCredentialType(uid)
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
          .eq('uid', normalizeCredential(uid))
          .in('status', ['unissued', 'deactivated', 'replaced']);
      }

      // Log assignment transaction
      await supabase
        .from('station_transactions')
        .insert({
          attendee_id: attendeeId,
          rfid_uid: normalizeCredential(uid),
          station_type: 'rfid_assignment',
          transaction_type: 'rfid_assign' as any,
          event_id: getCurrentEventId(),
          extra_data: {
            assignment_context: 'pre_assignment',
            assignment_source: 'assignment_station',
            previous_rfid: existingRfid?.uid || null
          }
        });

      toast.success(`Assigned Successfully: ${normalizeCredential(uid)} → ${attendeeName}`);

      // Optimistic update first
      if (onOptimisticUpdate) {
        onOptimisticUpdate(attendeeId, normalizeCredential(uid), 'assigned');
      }

      setUid("");
      
      // Debounce the full refresh
      const refreshTimeout = setTimeout(() => {
        onAssignmentComplete();
      }, 300);

    } catch (error) {
      console.error('credential assignment error:', error);
      toast.error("Assignment Failed - Failed to assign credential. Please try again.");
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
    if (!normalizeCredential(editValue) || validationError || isProcessing) return;

    setIsProcessing(true);
    
    try {
      // Validate the new UID
      const validationResult = await validateRfidUid(normalizeCredential(editValue), true);
      if (!validationResult.isValid) {
        toast.error("Edit blocked - this wristband is already assigned to another attendee.");
        return;
      }

      // Clear the old credential assignment
      if (currentRfidUid && currentRfidUid !== normalizeCredential(editValue)) {
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

      // Check if the new Code exists in the system
      const { data: tagExists } = await supabase
        .from('rfid_tags')
        .select('uid, status')
        .eq('event_id', getCurrentEventId())
        .eq('uid', normalizeCredential(editValue))
        .single();

      if (!tagExists) {
        // Create new credential entry
        await supabase
          .from('rfid_tags')
          .insert({
            uid: normalizeCredential(editValue),
            attendee_id: attendeeId,
            status: 'assigned',
            issued_at: new Date().toISOString(),
            credential_type: inferCredentialType(editValue)
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
          .eq('uid', normalizeCredential(editValue));
      }

      // Log the edit transaction
      await supabase
        .from('station_transactions')
        .insert({
          attendee_id: attendeeId,
          rfid_uid: normalizeCredential(editValue),
          station_type: 'rfid_assignment',
          transaction_type: 'rfid_assign' as any,
          event_id: getCurrentEventId(),
          extra_data: {
            assignment_context: 'edit_assignment',
            assignment_source: 'assignment_station_edit',
            previous_rfid: currentRfidUid || null,
            edit_action: true
          }
        });

      toast.success(`Wristband updated: ${normalizeCredential(editValue)} → ${attendeeName}`);

      // Optimistic update first
      if (onOptimisticUpdate) {
        onOptimisticUpdate(attendeeId, normalizeCredential(editValue), 'assigned');
      }

      setIsEditing(false);
      setEditValue("");
      
      // Debounce the full refresh
      const refreshTimeout = setTimeout(() => {
        onAssignmentComplete();
      }, 300);

    } catch (error) {
      console.error('RFID edit error:', error);
      toast.error("Edit Failed - Failed to update credential assignment. Please try again.");
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
          event_id: getCurrentEventId(),
          extra_data: {
            deactivation_method: 'assignment_station_clear'
          }
        });

      toast.success(`Credential cleared: ${currentRfidUid} has been unassigned from ${attendeeName}`);

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
      toast.error("Clear Failed - Failed to clear credential assignment.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Lost-band replacement: retire the old band as 'lost' (with a required
  // reason), assign the new code, and carry over activation if the old band
  // was already active.
  const handleStartReplace = () => {
    setReplaceValue("");
    setReplaceReason("");
    setValidationError("");
    setIsReplacing(true);
  };

  const handleCancelReplace = () => {
    setIsReplacing(false);
    setReplaceValue("");
    setReplaceReason("");
    setValidationError("");
  };

  const handleConfirmReplace = async () => {
    const newUid = replaceValue.trim();
    const reason = replaceReason.trim();
    if (!newUid || !reason || validationError || isProcessing || !currentRfidUid) return;

    setIsProcessing(true);
    const wasActive = currentRfidStatus === 'active';
    const now = new Date().toISOString();

    try {
      const validationResult = await validateRfidUid(newUid, true);
      if (!validationResult.isValid) {
        toast.error("Replacement blocked - this wristband is already assigned to another attendee.");
        return;
      }

      // 1. Retire the old band as lost
      await supabase
        .from('rfid_tags')
        .update({
          status: 'lost',
          attendee_id: null,
          deactivated_at: now,
          reason: `Lost: ${reason}`
        })
        .eq('uid', currentRfidUid);

      // 2. Assign the new band (active straight away if the old one was)
      const { data: tagExists } = await supabase
        .from('rfid_tags')
        .select('uid, status, attendee_id')
        .eq('event_id', getCurrentEventId())
        .eq('uid', normalizeCredential(newUid))
        .single();

      if (tagExists?.attendee_id && tagExists.attendee_id !== attendeeId) {
        toast.error("Replacement blocked - this wristband is assigned to another attendee.");
        return;
      }

      const newStatus: 'active' | 'assigned' = wasActive ? 'active' : 'assigned';
      const newTagFields: Database['public']['Tables']['rfid_tags']['Update'] = {
        attendee_id: attendeeId,
        status: newStatus,
        issued_at: now,
        deactivated_at: null,
        reason: null,
        ...(wasActive
          ? { activated_at: now, activation_method: 'staff_assisted' }
          : {})
      };

      if (!tagExists) {
        await supabase
          .from('rfid_tags')
          .insert({
            uid: newUid,
            event_id: getCurrentEventId(),
            credential_type: inferCredentialType(newUid),
            ...newTagFields
          } as any);
      } else {
        await supabase
          .from('rfid_tags')
          .update(newTagFields)
          .eq('uid', normalizeCredential(newUid));
      }

      // 3. Keep attendee check-in state in sync when activation carries over
      if (wasActive) {
        await supabase
          .from('attendees')
          .update({
            activated_at: now,
            most_recent_activation_at: now,
            most_recent_activation_method: 'staff_assisted',
            checked_in_at: now
          })
          .eq('id', attendeeId);
      }

      // 4. Audit trail: assignment + lifecycle transactions
      await supabase
        .from('station_transactions')
        .insert({
          attendee_id: attendeeId,
          rfid_uid: newUid,
          station_type: 'rfid_assignment',
          transaction_type: 'rfid_assign' as any,
          event_id: getCurrentEventId(),
          extra_data: {
            assignment_context: 'lost_replacement',
            assignment_source: 'assignment_station',
            previous_rfid: currentRfidUid,
            reason
          }
        });

      await supabase
        .from('station_transactions')
        .insert({
          attendee_id: attendeeId,
          rfid_uid: currentRfidUid,
          station_type: 'activation',
          transaction_type: 'deactivate',
          current_status: 'inactive',
          event_id: getCurrentEventId(),
          extra_data: { deactivation_method: 'lost_band_replacement', reason }
        });

      if (wasActive) {
        await supabase
          .from('station_transactions')
          .insert({
            attendee_id: attendeeId,
            rfid_uid: newUid,
            station_type: 'activation',
            transaction_type: 'activate',
            current_status: 'active',
            activation_method: 'staff_assisted',
            event_id: getCurrentEventId(),
            extra_data: { replacement_for: currentRfidUid, reason }
          });
      }

      toast.success(`Band replaced: ${currentRfidUid} marked lost, ${newUid} → ${attendeeName}${wasActive ? ' (kept checked in)' : ''}`);

      if (onOptimisticUpdate) {
        onOptimisticUpdate(attendeeId, newUid, newStatus);
      }

      setIsReplacing(false);
      setReplaceValue("");
      setReplaceReason("");

      setTimeout(() => onAssignmentComplete(), 300);
    } catch (error) {
      console.error('Band replacement error:', error);
      toast.error("Replacement Failed - Could not replace the band. Please try again.");
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
    if (isReplacing) {
      return (
        <div className="space-y-2 w-full sm:min-w-[300px] p-3 bg-red-50 dark:bg-red-950 rounded-lg border border-red-200 dark:border-red-800">
          <label className="text-sm font-medium text-red-900 dark:text-red-100">
            Replace lost band <span className="font-mono">{currentRfidUid}</span>:
          </label>
          <Input
            value={replaceReason}
            onChange={(e) => setReplaceReason(e.target.value)}
            placeholder="Reason (e.g., lost at camp, broke, damaged)"
            className="text-sm"
            disabled={isProcessing}
          />
          <Input
            value={replaceValue}
            onChange={(e) => setReplaceValue(e.target.value)}
            placeholder="Scan or type the new wristband code..."
            className="font-mono text-sm"
            disabled={isProcessing}
          />
          {currentRfidStatus === 'active' && (
            <p className="text-xs text-red-700 dark:text-red-300">
              This band is checked in — the new band will be checked in automatically so nothing is lost.
            </p>
          )}
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={handleConfirmReplace}
              disabled={!replaceValue.trim() || !replaceReason.trim() || validationError !== "" || isProcessing}
              className="text-xs"
            >
              {isProcessing ? (
                <Loader2 className="h-3 w-3 animate-spin mr-1" />
              ) : (
                <RefreshCw className="h-3 w-3 mr-1" />
              )}
              Confirm replacement
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCancelReplace}
              disabled={isProcessing}
              className="text-xs"
            >
              <XCircle className="h-3 w-3 mr-1" />
              Cancel
            </Button>
          </div>
        </div>
      );
    }

    if (isEditing) {
      return (
        <div className="flex items-start gap-2 w-full sm:min-w-[280px]">
          <div className="flex-1">
            <Input
              ref={editInputRef}
              type="text"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              placeholder="Enter new Code"
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
              disabled={!normalizeCredential(editValue) || !!validationError || isProcessing || isValidating}
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
      <div className="flex items-center gap-2 w-full sm:min-w-[280px]">
        <div className="flex flex-col flex-1">
          <span className="font-mono text-sm font-medium">{currentRfidUid}</span>
        </div>
        <div className="flex gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={handleStartEdit}
            disabled={isProcessing}
            className="h-8 px-3"
            title="Edit credential assignment"
          >
            <Edit3 className="h-3 w-3" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleStartReplace}
            disabled={isProcessing}
            className="h-8 px-3"
            title="Replace lost or damaged band"
          >
            <RefreshCw className="h-3 w-3" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleClearRfid}
            disabled={isProcessing}
            className="h-8 px-3"
            title="Clear credential assignment"
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
    <div className="flex w-full items-start gap-2 sm:min-w-[250px]">
      <div className="min-w-0 flex-1">
        <div className="badge-row mb-2">

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
          placeholder={scannerMode === 'usb' ? "Scan wristband or enter code" : "Enter UID or use camera"}
          className={`font-mono text-sm rfid-input ${validationError ? 'border-destructive' : ''}`}
          disabled={isProcessing}
          data-rfid-input="true"
          data-attendee-id={attendeeId}
        />
        {(validationError || isValidating) && (
          <div className="flex items-center gap-1 mt-1 text-xs max-w-full sm:max-w-[300px]">
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
        disabled={!normalizeCredential(uid) || !!validationError || isProcessing || isValidating}
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