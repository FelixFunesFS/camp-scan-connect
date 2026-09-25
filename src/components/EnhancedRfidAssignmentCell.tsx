import { getCurrentEventId } from "@/lib/eventRuntime";
import React, { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, X, AlertCircle, Loader2, Edit3, Save, XCircle, Camera, Usb, RefreshCw } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DEACTIVATION_REASONS } from "@/components/StaffDeactivationPanel";
import type { Database } from "@/integrations/supabase/types";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useRfidCaptureContext } from "@/contexts/RfidCaptureContext";
import { CameraBraceletScanner } from "@/components/CameraBraceletScanner";
import { inferCredentialType, normalizeCredential } from "@/lib/credentialFormat";
import { Checkbox } from "@/components/ui/checkbox";

/** Assignment messages stay on screen until staff dismiss them. */
const STICKY = { duration: Infinity, closeButton: true } as const;

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
  const [isRemoveOpen, setIsRemoveOpen] = useState(false);
  const [removeReason, setRemoveReason] = useState("");
  const [removeConfirmed, setRemoveConfirmed] = useState(false);
  const [isCameraScannerOpen, setIsCameraScannerOpen] = useState(false);
  const [scannerMode, setScannerMode] = useState<'usb' | 'camera'>('camera');
  const [cameraTarget, setCameraTarget] = useState<'assign' | 'edit' | 'replace'>('assign');
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
        toast.error("Assignment blocked - this wristband is already assigned to another attendee.", STICKY);
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
        toast.error("Assignment blocked - this wristband is assigned to another attendee.", STICKY);
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

      toast.success(`Assigned Successfully: ${normalizeCredential(uid)} → ${attendeeName}`, STICKY);

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
      toast.error("Assignment Failed - Failed to assign credential. Please try again.", STICKY);
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
        toast.error("Edit blocked - this wristband is already assigned to another attendee.", STICKY);
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

      toast.success(`Wristband updated: ${normalizeCredential(editValue)} → ${attendeeName}`, STICKY);

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
      toast.error("Edit Failed - Failed to update credential assignment. Please try again.", STICKY);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClearRfid = async () => {
    if (!currentRfidUid || !removeReason || !removeConfirmed) return;

    const reasonLabel =
      DEACTIVATION_REASONS.find((r) => r.value === removeReason)?.label || removeReason;

    setIsProcessing(true);
    try {
      // Set RFID back to unissued state and clear attendee assignment
      await supabase
        .from('rfid_tags')
        .update({
          status: 'unissued',
          attendee_id: null,
          deactivated_at: new Date().toISOString(),
          reason: reasonLabel
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
            deactivation_method: 'assignment_station_clear',
            reason: reasonLabel,
            reason_code: removeReason
          }
        });

      toast.success(`Band removed: ${currentRfidUid} is no longer assigned to ${attendeeName} (${reasonLabel})`, STICKY);

      // Optimistic update first
      if (onOptimisticUpdate) {
        onOptimisticUpdate(attendeeId, null, 'unissued');
      }

      // Debounce the full refresh
      const refreshTimeout = setTimeout(() => {
        onAssignmentComplete();
      }, 300);
      setIsRemoveOpen(false);
      setRemoveReason("");
      setRemoveConfirmed(false);
    } catch (error) {
      console.error('RFID clear error:', error);
      toast.error("Could not remove the band. Please try again.", STICKY);
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
        toast.error("Replacement blocked - this wristband is already assigned to another attendee.", STICKY);
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
        toast.error("Replacement blocked - this wristband is assigned to another attendee.", STICKY);
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

      toast.success(`Band replaced: ${currentRfidUid} marked lost, ${newUid} → ${attendeeName}${wasActive ? ' (kept checked in)' : ''}`, STICKY);

      if (onOptimisticUpdate) {
        onOptimisticUpdate(attendeeId, newUid, newStatus);
      }

      setIsReplacing(false);
      setReplaceValue("");
      setReplaceReason("");

      setTimeout(() => onAssignmentComplete(), 300);
    } catch (error) {
      console.error('Band replacement error:', error);
      toast.error("Replacement Failed - Could not replace the band. Please try again.", STICKY);
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

  const cameraScanner = (
    <CameraBraceletScanner
      isOpen={isCameraScannerOpen}
      onClose={() => setIsCameraScannerOpen(false)}
      onScan={(code) => {
        if (cameraTarget === 'edit') {
          setEditValue(code);
        } else if (cameraTarget === 'replace') {
          setReplaceValue(code);
        } else {
          setScannerMode('camera');
          triggerCapture(code, inputRef.current || undefined);
        }
        setIsCameraScannerOpen(false);
      }}
    />
  );

  // Show assigned RFID with edit/clear buttons or edit input
  if (currentRfidUid && (currentRfidStatus === 'active' || currentRfidStatus === 'assigned')) {
    if (isReplacing) {
      return (
        <div className="space-y-2 w-full xl:min-w-[300px] p-3 bg-red-50 dark:bg-red-950 rounded-lg border border-red-200 dark:border-red-800">
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
          <Button
            type="button"
            variant="outline"
            className="h-11 w-full"
            onClick={() => { setCameraTarget('replace'); setIsCameraScannerOpen(true); }}
            disabled={isProcessing}
          >
            <Camera className="mr-2 h-4 w-4" />
            Scan replacement with phone camera
          </Button>
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
          {cameraScanner}
        </div>
      );
    }

    if (isEditing) {
      return (
        <div className="w-full space-y-2 xl:min-w-[280px]">
          <div className="flex items-start gap-2">
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
          <Button
            type="button"
            variant="outline"
            className="h-11 w-full sm:h-9"
            onClick={() => { setCameraTarget('edit'); setIsCameraScannerOpen(true); }}
            disabled={isProcessing}
          >
            <Camera className="mr-2 h-4 w-4" />
            Scan new code with phone camera
          </Button>
          {cameraScanner}
        </div>
      );
    }

    return (
      <div className="flex w-full flex-col gap-2 xl:min-w-[280px] xl:flex-row xl:items-center">
        <div className="min-w-0 flex-1">
          <span className="font-mono text-sm font-medium break-all">{currentRfidUid}</span>
        </div>
        <div className="flex gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => { setRemoveReason(""); setRemoveConfirmed(false); setIsRemoveOpen(true); }}
            disabled={isProcessing}
            className="h-11 w-full px-3 text-xs text-destructive sm:h-8 sm:w-auto"
            title="Remove band"
          >
            {isProcessing ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <X className="h-3 w-3" />
            )}
            <span className="ml-1">Remove band</span>
          </Button>
        </div>

        <AlertDialog open={isRemoveOpen} onOpenChange={(open) => { if (!isProcessing) setIsRemoveOpen(open); }}>
          <AlertDialogContent className="max-w-[95vw] sm:max-w-lg">
            <AlertDialogHeader>
              <AlertDialogTitle>Remove band {currentRfidUid}?</AlertDialogTitle>
              <AlertDialogDescription>
                {currentRfidStatus === 'active'
                  ? `${attendeeName} is checked in. Removing this band checks them out — they will not be able to use any station until a new band is assigned and activated.`
                  : `This band will no longer be assigned to ${attendeeName}. It can be assigned to someone else afterwards.`}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="space-y-3">
              <label className="text-sm font-medium">Reason (required)</label>
              <Select value={removeReason} onValueChange={setRemoveReason}>
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Choose a reason" />
                </SelectTrigger>
                <SelectContent className="z-50">
                  {DEACTIVATION_REASONS.map((reason) => (
                    <SelectItem key={reason.value} value={reason.value}>
                      {reason.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                To give this person a different band, remove this one with a reason, then type their new band code in the same box.
              </p>
              <label className="flex items-start gap-3 rounded-md border border-destructive/40 bg-destructive/5 p-3">
                <Checkbox
                  checked={removeConfirmed}
                  onCheckedChange={(v) => setRemoveConfirmed(v === true)}
                  disabled={isProcessing}
                  className="mt-0.5"
                />
                <span className="text-sm">
                  I checked the reason above and want to save this removal for{" "}
                  <strong>{attendeeName}</strong>.
                </span>
              </label>
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isProcessing}>Keep band</AlertDialogCancel>
              <AlertDialogAction
                onClick={(e) => { e.preventDefault(); handleClearRfid(); }}
                disabled={!removeReason || !removeConfirmed || isProcessing}
              >
                {isProcessing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Save removal
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  // Show assignment input for unassigned attendees
  return (
    <div className="flex w-full items-start gap-2 xl:min-w-[250px]">
      <div className="min-w-0 flex-1">
        <div className="mb-2 grid grid-cols-1 gap-2 xl:grid-cols-2">
          <Button
            variant={scannerMode === 'camera' ? "default" : "outline"}
            size="sm"
            onClick={() => { setScannerMode('camera'); setCameraTarget('assign'); setIsCameraScannerOpen(true); }}
            className="h-11 px-3 text-xs sm:h-9"
          >
            <Camera className="mr-2 h-4 w-4" />
            Scan with phone camera
          </Button>
          <Button
            variant={scannerMode === 'usb' ? "default" : "outline"}
            size="sm"
            onClick={() => { setScannerMode('usb'); setTimeout(() => inputRef.current?.focus(), 0); }}
            className="h-11 px-3 text-xs sm:h-9"
          >
            <Usb className="mr-2 h-4 w-4" />
            USB reader (backup)
          </Button>
        </div>
        
        <Input
          ref={inputRef}
          type="text"
          value={uid}
          onChange={(e) => setUid(e.target.value)}
          placeholder={scannerMode === 'usb' ? "Scan with USB reader or type code" : "Camera result appears here; type code instead"}
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
        className="h-10 shrink-0 px-3 mt-[38px] sm:h-8"
      >
        {isProcessing ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <Check className="h-3 w-3" />
        )}
      </Button>

      {cameraScanner}
    </div>
  );
};