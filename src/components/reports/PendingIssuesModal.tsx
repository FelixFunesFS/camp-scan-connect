import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { AlertTriangle, Phone, Users, Wifi, Clock, CheckCircle2, User, Mail, X } from "lucide-react";
import { toast } from "sonner";
import { StaffAssistanceService, type StaffAssistanceRequest } from "@/services/staffAssistanceService";

interface PendingIssuesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onIssuesUpdated?: () => void;
}

export function PendingIssuesModal({ open, onOpenChange, onIssuesUpdated }: PendingIssuesModalProps) {
  const [requests, setRequests] = useState<StaffAssistanceRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedRequest, setExpandedRequest] = useState<string | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) {
      loadAssistanceRequests();
    }
  }, [open]);

  const loadAssistanceRequests = async () => {
    try {
      setIsLoading(true);
      const data = await StaffAssistanceService.getOpenRequests();
      setRequests(data);
    } catch (error) {
      console.error('Failed to load assistance requests:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getIssueIcon = (issueType: string) => {
    switch (issueType) {
      case 'not_found': return Phone;
      case 'unassigned': return Users;
      case 'activation_failed': return AlertTriangle;
      case 'system_error': return Wifi;
      default: return AlertTriangle;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-destructive text-destructive-foreground';
      case 'high': return 'bg-orange-500 text-white';
      case 'normal': return 'bg-primary text-primary-foreground';
      case 'low': return 'bg-muted text-muted-foreground';
      default: return 'bg-primary text-primary-foreground';
    }
  };

  const getIssueTypeLabel = (issueType: string) => {
    switch (issueType) {
      case 'not_found': return 'Phone Not Found';
      case 'unassigned': return 'RFID Programming Needed';
      case 'activation_failed': return 'Activation Failed';
      case 'system_error': return 'System Error';
      default: return 'General Issue';
    }
  };

  const handleStatusUpdate = async (requestId: string, newStatus: StaffAssistanceRequest['status']) => {
    try {
      const notes = resolutionNotes[requestId] || '';
      await StaffAssistanceService.updateRequestStatus(requestId, newStatus, notes);
      
      toast.success(`Request marked as ${newStatus}`);
      loadAssistanceRequests();
      onIssuesUpdated?.();
      
      // Clear resolution notes for this request
      setResolutionNotes(prev => {
        const updated = { ...prev };
        delete updated[requestId];
        return updated;
      });
      
      // Collapse if resolved
      if (newStatus === 'resolved' || newStatus === 'closed') {
        setExpandedRequest(null);
      }
    } catch (error) {
      console.error('Failed to update request status:', error);
      toast.error('Failed to update request status');
    }
  };

  const openRequests = requests.filter(r => r.status === 'open');
  const inProgressRequests = requests.filter(r => r.status === 'in_progress');
  const totalRequests = openRequests.length + inProgressRequests.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Pending Issues
            {totalRequests > 0 && (
              <Badge variant="destructive" className="ml-2">
                {totalRequests}
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="p-6 text-center">
            <div className="animate-pulse space-y-4">
              <div className="h-4 bg-muted rounded w-3/4 mx-auto"></div>
              <div className="h-16 bg-muted rounded"></div>
              <div className="h-16 bg-muted rounded"></div>
            </div>
          </div>
        ) : totalRequests === 0 ? (
          <div className="p-6 text-center">
            <CheckCircle2 className="h-12 w-12 text-success mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-success mb-2">All Clear!</h3>
            <p className="text-muted-foreground">No pending assistance requests. Great job team! 🎉</p>
          </div>
        ) : (
          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-4 p-1">
              {/* Open Requests */}
              {openRequests.map((request) => {
                const IconComponent = getIssueIcon(request.issue_type);
                const isExpanded = expandedRequest === request.id;
                
                return (
                  <div key={request.id} className="border rounded-lg p-4 border-l-4 border-l-destructive bg-card">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <IconComponent className="h-4 w-4" />
                        <span className="font-medium">{getIssueTypeLabel(request.issue_type)}</span>
                        <Badge className={getPriorityColor(request.priority || 'normal')}>
                          {request.priority || 'normal'}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(request.created_at || '').toLocaleTimeString()}
                      </div>
                    </div>
                    
                    <div className="space-y-2 text-sm mb-3">
                      {request.attendee_name && (
                        <div className="flex items-center gap-2">
                          <User className="h-3 w-3" />
                          <span className="font-medium">{request.attendee_name}</span>
                        </div>
                      )}
                      
                      {request.phone_number && (
                        <div className="flex items-center gap-2">
                          <Phone className="h-3 w-3" />
                          <span className="font-mono">{request.phone_number}</span>
                        </div>
                      )}
                      
                      {request.error_message && (
                        <div className="text-xs text-muted-foreground bg-muted/50 rounded p-2">
                          <strong>Error:</strong> {request.error_message}
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => setExpandedRequest(isExpanded ? null : request.id)}
                        variant="outline"
                      >
                        {isExpanded ? 'Collapse' : 'Handle'}
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleStatusUpdate(request.id!, 'in_progress')}
                        variant="secondary"
                      >
                        Start Working
                      </Button>
                    </div>

                    {isExpanded && (
                      <div className="mt-4 pt-4 border-t space-y-3">
                        <div>
                          <Label htmlFor={`notes-${request.id}`} className="text-sm">Resolution Notes</Label>
                          <Textarea
                            id={`notes-${request.id}`}
                            placeholder="What did you do to resolve this issue?"
                            value={resolutionNotes[request.id!] || ''}
                            onChange={(e) => setResolutionNotes(prev => ({
                              ...prev,
                              [request.id!]: e.target.value
                            }))}
                            rows={2}
                            className="mt-1"
                          />
                        </div>
                        
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleStatusUpdate(request.id!, 'resolved')}
                            className="bg-success hover:bg-success/90"
                          >
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Mark Resolved
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleStatusUpdate(request.id!, 'closed')}
                          >
                            Close Without Resolution
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* In Progress Requests */}
              {inProgressRequests.length > 0 && (
                <div className="pt-4">
                  <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    In Progress ({inProgressRequests.length})
                  </h4>
                  {inProgressRequests.map((request) => (
                    <div key={request.id} className="border rounded-lg p-3 border-l-4 border-l-warning bg-card/50">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-medium text-sm">{request.attendee_name}</span>
                          <span className="text-xs text-muted-foreground ml-2">
                            {getIssueTypeLabel(request.issue_type)}
                          </span>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => handleStatusUpdate(request.id!, 'resolved')}
                          className="bg-success hover:bg-success/90"
                        >
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Resolve
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}