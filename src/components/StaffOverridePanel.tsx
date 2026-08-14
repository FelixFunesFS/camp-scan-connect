import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Shield, User, AlertTriangle, CheckCircle2 } from "lucide-react";

interface StaffOverridePanelProps {
  attendeeName?: string;
  issueType: 'unactivated' | 'unassigned' | 'other';
  onOverride: (notes: string) => Promise<void>;
  onCancel: () => void;
}

export function StaffOverridePanel({ 
  attendeeName, 
  issueType, 
  onOverride, 
  onCancel 
}: StaffOverridePanelProps) {
  const [notes, setNotes] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const handleOverride = async () => {
    setIsProcessing(true);
    try {
      await onOverride(notes);
    } finally {
      setIsProcessing(false);
    }
  };

  const getIssueDetails = () => {
    switch (issueType) {
      case 'unactivated':
        return {
          title: "Assigned - Not Activated",
          description: "Attendee has an wristband but needs activation",
          action: "Activate and process service request",
          variant: "secondary" as const
        };
      case 'unassigned':
        return {
          title: "RFID Not Assigned or Readable",
          description: "Attendee needs new wristband assignment",
          action: "Override for manual service (recommend Info Desk visit)",
          variant: "destructive" as const
        };
      default:
        return {
          title: "Other RFID Issue",
          description: "Manual staff intervention required",
          action: "Override current restrictions",
          variant: "outline" as const
        };
    }
  };

  const issueDetails = getIssueDetails();

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          Staff Override Panel
        </CardTitle>
        {attendeeName && (
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">{attendeeName}</span>
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Issue Summary */}
        <div className="p-3 bg-muted/30 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Badge variant={issueDetails.variant} className="text-xs">
              {issueDetails.title}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mb-2">{issueDetails.description}</p>
          <p className="text-sm font-medium">Staff Action: {issueDetails.action}</p>
        </div>

        {/* Notes Section */}
        <div className="space-y-2">
          <label htmlFor="override-notes" className="text-sm font-medium">
            Override Notes (Required)
          </label>
          <Textarea
            id="override-notes"
            placeholder="Document the reason for override and any actions taken..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="resize-none"
          />
          <p className="text-xs text-muted-foreground">
            This will be logged for audit purposes and service tracking.
          </p>
        </div>

        {/* Warning for unassigned RFIDs */}
        {issueType === 'unassigned' && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-sm">
              <strong>Recommendation:</strong> Direct attendee to Info Desk for proper credential assignment. 
              Override should only be used for immediate service needs.
            </AlertDescription>
          </Alert>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-2">
          <Button 
            variant="outline" 
            onClick={onCancel}
            disabled={isProcessing}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleOverride}
            disabled={isProcessing || !notes.trim()}
            className="flex items-center gap-2"
          >
            {isProcessing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current" />
                Processing...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" />
                Confirm Override
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}