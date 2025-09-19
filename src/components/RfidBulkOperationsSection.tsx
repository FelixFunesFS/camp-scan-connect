import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from "sonner";
import { SafetyConfirmationDialog } from './SafetyConfirmationDialog';
import { 
  Users, 
  ChevronDown, 
  ChevronRight,
  AlertTriangle,
  PowerOff,
  UserMinus,
  XCircle,
  Shield
} from 'lucide-react';
import { rfidLookupService, AttendeeSearchResult, BulkRfidOperation } from '@/services/rfidLookupService';

const DEACTIVATION_REASONS = [
  { value: "lost", label: "Lost RFID" },
  { value: "damaged", label: "Damaged RFID" },
  { value: "replaced", label: "Replaced with New RFID" },
  { value: "checkout", label: "Event Checkout/Departure" },
  { value: "sunday_mass", label: "Sunday Mass Deactivation" },
  { value: "staff_request", label: "Staff Request" },
  { value: "security", label: "Security Issue" },
  { value: "other", label: "Other" },
];

interface BulkOperationsSectionProps {
  staffId?: string;
}

export const RfidBulkOperationsSection: React.FC<BulkOperationsSectionProps> = ({ staffId }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeRfids, setActiveRfids] = useState<AttendeeSearchResult[]>([]);
  const [selectedAttendees, setSelectedAttendees] = useState<AttendeeSearchResult[]>([]);
  const [selectedReason, setSelectedReason] = useState("other");
  const [customReason, setCustomReason] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    type: 'bulk' | 'mass';
    title: string;
    description: string;
  }>({
    open: false,
    type: 'bulk',
    title: '',
    description: ''
  });
  

  useEffect(() => {
    if (isExpanded) {
      loadActiveRfids();
    }
  }, [isExpanded]);

  const loadActiveRfids = async () => {
    try {
      const rfids = await rfidLookupService.getActiveRfids();
      setActiveRfids(rfids);
    } catch (error) {
      console.error('Error loading active RFIDs:', error);
      toast.error("Error - Failed to load active RFIDs");
    }
  };

  const getReasonText = () => {
    if (selectedReason === "other") {
      return customReason.trim() || "Other reason";
    }
    return DEACTIVATION_REASONS.find(r => r.value === selectedReason)?.label || "Other reason";
  };

  const toggleAllSelection = () => {
    if (selectedAttendees.length === activeRfids.length) {
      setSelectedAttendees([]);
    } else {
      setSelectedAttendees([...activeRfids]);
    }
  };

  const removeFromSelection = (attendeeId: string) => {
    setSelectedAttendees(prev => prev.filter(a => a.id !== attendeeId));
  };

  const openBulkConfirmation = () => {
    const count = selectedAttendees.length;
    const reason = getReasonText();
    
    setConfirmDialog({
      open: true,
      type: 'bulk',
      title: `Confirm Bulk Deactivation (${count} RFIDs)`,
      description: `You are about to deactivate ${count} RFID tag(s). This will prevent these attendees from using event services until reactivated.\n\nReason: ${reason}\n\nThis action will be logged for audit purposes.`
    });
  };

  const openMassConfirmation = () => {
    const count = activeRfids.length;
    const reason = getReasonText();
    
    setConfirmDialog({
      open: true,
      type: 'mass',
      title: `Confirm Mass Deactivation (${count} RFIDs)`,
      description: `You are about to deactivate ALL ${count} active RFID tags in the system. This will prevent ALL active attendees from using event services.\n\nReason: ${reason}\n\nThis is a critical operation that affects the entire event. This action will be logged for audit purposes and requires staff authentication.`
    });
  };

  const processBulkDeactivation = async () => {
    if (selectedAttendees.length === 0) return;

    setIsProcessing(true);
    try {
      const reason = getReasonText();
      const operations: BulkRfidOperation[] = selectedAttendees
        .filter(a => a.rfid_uid)
        .map(a => ({
          rfid_uid: a.rfid_uid!,
          attendee_id: a.id,
          operation: 'deactivate' as const,
          reason: reason
        }));

      const result = await rfidLookupService.processBulkOperations(operations, staffId);
      
      const message = `Bulk Deactivation Complete - ${result.processed_count} deactivated, ${result.failed_count} failed`;
      if (result.success) {
        toast.success(message);
      } else {
        toast.error(message);
      }

      setSelectedAttendees([]);
      await loadActiveRfids();
    } catch (error) {
      toast.error("Bulk Operation Failed - Failed to process bulk deactivation");
    } finally {
      setIsProcessing(false);
      setConfirmDialog(prev => ({ ...prev, open: false }));
    }
  };

  const handleMassDeactivation = async () => {
    setIsProcessing(true);
    try {
      const reason = getReasonText();
      const result = await rfidLookupService.massDeactivateAll(reason, staffId);
      
      const message = `Mass Deactivation Complete - ${result.message}`;
      if (result.success) {
        toast.success(message);
      } else {
        toast.error(message);
      }

      await loadActiveRfids();
    } catch (error) {
      toast.error("Mass Deactivation Failed - Failed to perform mass deactivation");
    } finally {
      setIsProcessing(false);
      setConfirmDialog(prev => ({ ...prev, open: false }));
    }
  };

  const handleConfirm = () => {
    if (confirmDialog.type === 'bulk') {
      processBulkDeactivation();
    } else {
      handleMassDeactivation();
    }
  };

  return (
    <>
      <Card className="border-destructive/50">
        <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  <div>
                    <CardTitle className="flex items-center gap-2 text-destructive">
                      <Users className="h-5 w-5" />
                      Bulk Operations
                    </CardTitle>
                    <CardDescription>
                      Bulk deactivation and mass operations for multiple RFID tags
                    </CardDescription>
                  </div>
                </div>
                <Badge variant="outline" className="border-destructive text-destructive">
                  {activeRfids.length} Active
                </Badge>
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-6">
              {/* Safety Warning */}
              <Alert className="border-destructive bg-destructive/5">
                <Shield className="h-4 w-4" />
                <AlertDescription>
                  <strong>High Impact Operations:</strong> These operations affect multiple attendees simultaneously and require careful consideration. All actions are logged for audit purposes.
                </AlertDescription>
              </Alert>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-blue-600" />
                      <div>
                        <p className="text-sm text-muted-foreground">Active RFIDs</p>
                        <p className="text-2xl font-bold text-blue-600">{activeRfids.length}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <UserMinus className="h-4 w-4 text-orange-600" />
                      <div>
                        <p className="text-sm text-muted-foreground">Selected</p>
                        <p className="text-2xl font-bold text-orange-600">{selectedAttendees.length}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Reason Selection */}
              <div className="space-y-4">
                <h4 className="font-semibold flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Deactivation Reason
                </h4>
                
                <div className="space-y-2">
                  <Label htmlFor="reason">Select Reason</Label>
                  <Select value={selectedReason} onValueChange={setSelectedReason}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a reason" />
                    </SelectTrigger>
                    <SelectContent>
                      {DEACTIVATION_REASONS.map((reason) => (
                        <SelectItem key={reason.value} value={reason.value}>
                          {reason.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {selectedReason === "other" && (
                  <div className="space-y-2">
                    <Label htmlFor="custom-reason">Custom Reason</Label>
                    <Textarea
                      id="custom-reason"
                      value={customReason}
                      onChange={(e) => setCustomReason(e.target.value)}
                      placeholder="Enter custom reason..."
                      rows={2}
                    />
                  </div>
                )}
              </div>

              {/* Bulk Selection */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="select-all"
                      checked={selectedAttendees.length === activeRfids.length && activeRfids.length > 0}
                      onCheckedChange={toggleAllSelection}
                      disabled={activeRfids.length === 0}
                    />
                    <Label htmlFor="select-all">
                      Select All Active RFIDs ({activeRfids.length})
                    </Label>
                  </div>
                  <Button
                    onClick={loadActiveRfids}
                    variant="ghost"
                    size="sm"
                    disabled={isProcessing}
                  >
                    Refresh
                  </Button>
                </div>

                {/* Selected Attendees */}
                {selectedAttendees.length > 0 && (
                  <div className="space-y-2">
                    <Label>Selected for Deactivation ({selectedAttendees.length})</Label>
                    <ScrollArea className="h-32 border rounded p-2">
                      <div className="space-y-1">
                        {selectedAttendees.map((attendee) => (
                          <div
                            key={attendee.id}
                            className="flex items-center justify-between text-sm p-1"
                          >
                            <span>
                              {attendee.first_name} {attendee.last_name}
                              {attendee.is_veteran && (
                                <Badge variant="secondary" className="ml-2 text-xs">Veteran</Badge>
                              )}
                            </span>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => removeFromSelection(attendee.id)}
                            >
                              <XCircle className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                    
                    <Button
                      onClick={openBulkConfirmation}
                      disabled={isProcessing}
                      variant="destructive"
                      className="w-full"
                    >
                      <UserMinus className="h-4 w-4 mr-2" />
                      Deactivate {selectedAttendees.length} Selected RFIDs
                    </Button>
                  </div>
                )}

                {/* Active RFIDs List */}
                <div className="space-y-2">
                  <Label>Available Active RFIDs</Label>
                  <ScrollArea className="h-48 border rounded">
                    <div className="p-2 space-y-1">
                      {activeRfids.map((attendee) => (
                        <div
                          key={attendee.id}
                          className="flex items-center justify-between p-2 hover:bg-muted/50 rounded"
                        >
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              checked={selectedAttendees.find(a => a.id === attendee.id) !== undefined}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedAttendees(prev => [...prev, attendee]);
                                } else {
                                  removeFromSelection(attendee.id);
                                }
                              }}
                            />
                            <div className="flex-1">
                              <p className="font-medium text-sm">
                                {attendee.first_name} {attendee.last_name}
                                {attendee.is_veteran && (
                                  <Badge variant="secondary" className="ml-2 text-xs">Veteran</Badge>
                                )}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {attendee.ticket_type} • RFID: {attendee.rfid_uid}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                      {activeRfids.length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-8">
                          No active RFIDs found
                        </p>
                      )}
                    </div>
                  </ScrollArea>
                </div>
              </div>

              {/* Mass Deactivation */}
              <div className="space-y-4 pt-4 border-t border-destructive/20">
                <div className="flex items-center gap-2 text-destructive">
                  <PowerOff className="h-5 w-5" />
                  <h4 className="font-semibold">Mass Deactivation</h4>
                </div>
                
                <Alert className="border-destructive bg-destructive/5">
                  <PowerOff className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Critical Operation:</strong> This will deactivate ALL active RFID tags in the system ({activeRfids.length} tags). This action affects all active attendees and requires staff authentication.
                  </AlertDescription>
                </Alert>
                
                <Button
                  onClick={openMassConfirmation}
                  disabled={activeRfids.length === 0 || isProcessing}
                  variant="destructive"
                  className="w-full"
                >
                  <PowerOff className="h-4 w-4 mr-2" />
                  Mass Deactivate All RFIDs ({activeRfids.length})
                </Button>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* Safety Confirmation Dialog */}
      <SafetyConfirmationDialog
        open={confirmDialog.open}
        onOpenChange={(open) => setConfirmDialog(prev => ({ ...prev, open }))}
        onConfirm={handleConfirm}
        title={confirmDialog.title}
        description={confirmDialog.description}
        confirmText={confirmDialog.type === 'mass' ? 'Mass Deactivate' : 'Bulk Deactivate'}
        destructive={true}
        requiresTyping={confirmDialog.type === 'mass'}
        expectedText={confirmDialog.type === 'mass' ? 'DEACTIVATE ALL' : ''}
        requiresStaffCode={confirmDialog.type === 'mass'}
        isProcessing={isProcessing}
      />
    </>
  );
};