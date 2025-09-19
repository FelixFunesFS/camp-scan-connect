import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, Phone, Users, Wifi, Clock, CheckCircle2, User, Mail } from "lucide-react";
import { toast } from "sonner";
import { StaffAssistanceService, type StaffAssistanceRequest } from "@/services/staffAssistanceService";

export function StaffAssistanceNotifications() {
  const [requests, setRequests] = useState<StaffAssistanceRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedRequest, setExpandedRequest] = useState<string | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState<Record<string, string>>({});

  useEffect(() => {
    loadAssistanceRequests();
    // Poll for new requests every 30 seconds
    const interval = setInterval(loadAssistanceRequests, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadAssistanceRequests = async () => {
    try {
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
      case 'urgent': return 'bg-red-500 text-white';
      case 'high': return 'bg-orange-500 text-white';
      case 'normal': return 'bg-blue-500 text-white';
      case 'low': return 'bg-gray-500 text-white';
      default: return 'bg-blue-500 text-white';
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

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Staff Assistance Queue
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Loading assistance requests...</p>
        </CardContent>
      </Card>
    );
  }

  if (requests.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            Staff Assistance Queue
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No pending assistance requests. Great job team! 🎉</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          Staff Assistance Queue
          <Badge variant="destructive" className="ml-2">
            {openRequests.length + inProgressRequests.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-96">
          <div className="space-y-4">
            {openRequests.map((request) => {
              const IconComponent = getIssueIcon(request.issue_type);
              const isExpanded = expandedRequest === request.id;
              
              return (
                <Card key={request.id} className="border-l-4 border-l-red-500">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
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
                    
                    <div className="space-y-2 text-sm">
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
                      
                      {request.email && (
                        <div className="flex items-center gap-2">
                          <Mail className="h-3 w-3" />
                          <span>{request.email}</span>
                        </div>
                      )}
                      
                      {request.error_message && (
                        <div className="text-xs text-muted-foreground bg-muted/50 rounded p-2">
                          <strong>Error:</strong> {request.error_message}
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2 mt-3">
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
                        {request.contact_info && Object.keys(request.contact_info as any).length > 0 && (
                          <div>
                            <Label className="text-xs font-medium">Contact Preferences:</Label>
                            <div className="text-xs text-muted-foreground">
                              <pre className="whitespace-pre-wrap bg-muted/30 rounded p-2 mt-1">
                                {JSON.stringify(request.contact_info, null, 2)}
                              </pre>
                            </div>
                          </div>
                        )}
                        
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
                            className="bg-green-600 hover:bg-green-700"
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
                  </CardContent>
                </Card>
              );
            })}

            {inProgressRequests.length > 0 && (
              <div className="pt-4">
                <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  In Progress ({inProgressRequests.length})
                </h4>
                {inProgressRequests.map((request) => (
                  <Card key={request.id} className="border-l-4 border-l-orange-500 opacity-75">
                    <CardContent className="p-3">
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
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Resolve
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}