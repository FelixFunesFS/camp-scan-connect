import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { MapPin, AlertCircle, Phone, Clock } from "lucide-react";

interface StationRfidIssueAlertProps {
  errorMessage: string;
  onStaffOverride?: () => void;
  showStaffOverride?: boolean;
}

export function StationRfidIssueAlert({ 
  errorMessage, 
  onStaffOverride,
  showStaffOverride = true 
}: StationRfidIssueAlertProps) {
  return (
    <Card className="border-destructive/20 bg-destructive/5">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-destructive" />
          RFID Issue Detected
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Your wristband needs attention from our staff.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Error Details */}
        <div className="p-3 bg-muted/30 rounded-lg">
          <p className="text-sm text-destructive font-medium mb-1">Issue Details:</p>
          <p className="text-sm text-muted-foreground">{errorMessage}</p>
        </div>

        {/* Next Steps */}
        <div className="space-y-3">
          <h4 className="font-medium text-sm flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Visit the Info Desk
          </h4>
          
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
            <div className="space-y-2">
              <p className="font-medium text-sm text-primary">📍 Main Activity Tent - Info Desk</p>
              <p className="text-sm text-muted-foreground">
                Our staff will issue you a new wristband and activate it immediately.
              </p>
            </div>
          </div>

          <div className="grid gap-3 text-sm">
            <div className="flex items-start gap-3">
              <div className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-medium mt-0.5">
                1
              </div>
              <div>
                <p>Bring your current wristband (if you have one)</p>
                <p className="text-xs text-muted-foreground">Staff will need to see it for replacement</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-medium mt-0.5">
                2
              </div>
              <div>
                <p>Provide your registration details</p>
                <p className="text-xs text-muted-foreground">Phone number and name used during registration</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-medium mt-0.5">
                3
              </div>
              <div>
                <p>Receive new activated wristband</p>
                <p className="text-xs text-muted-foreground">Ready to use immediately for all services</p>
              </div>
            </div>
          </div>
        </div>

        {/* Contact Info */}
        <Alert>
          <Clock className="h-4 w-4" />
          <AlertDescription className="text-xs">
            <strong>Info Desk Hours:</strong> Open 24/7 during the event for immediate assistance with credential issues.
          </AlertDescription>
        </Alert>

        {/* Staff Override Option */}
        {showStaffOverride && onStaffOverride && (
          <div className="pt-3 border-t border-border/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Staff Member Present?</p>
                <p className="text-xs text-muted-foreground">Can provide immediate assistance</p>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={onStaffOverride}
                className="ml-4"
              >
                Staff Override
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}