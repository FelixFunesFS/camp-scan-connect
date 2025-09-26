import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Smartphone, CheckCircle2, Users, AlertTriangle } from "lucide-react";
import { AttendeeReadiness } from "@/types/station";

interface StationActivationPromptProps {
  attendeeName: string;
  attendeeReadiness: AttendeeReadiness;
  onStaffOverride?: () => void;
  onStaffActivation?: () => void;
  showStaffOverride?: boolean;
}

export function StationActivationPrompt({ 
  attendeeName, 
  attendeeReadiness,
  onStaffOverride,
  onStaffActivation,
  showStaffOverride = true 
}: StationActivationPromptProps) {
  return (
    <Card className="border-warning/20 bg-warning/5">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-warning" />
          Self-Activation Required
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {attendeeName} needs to activate their RFID wristband before using station services.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Status */}
        <div className="p-3 bg-muted/30 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="secondary" className="bg-warning text-warning-foreground">
              RFID Assigned - Not Activated
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">{attendeeReadiness.message}</p>
        </div>

        {/* Quick Instructions */}
        <div className="space-y-3">
          <h4 className="font-medium text-sm">To activate your wristband:</h4>
          <div className="grid gap-2 text-sm">
            <div className="flex items-start gap-3">
              <div className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-medium mt-0.5">
                1
              </div>
              <div>
                <p>Visit any <strong>Self-Activation Station</strong></p>
                <p className="text-xs text-muted-foreground">Located at Main Activity Tent and other key areas</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-medium mt-0.5">
                2
              </div>
              <div>
                <p>Enter your phone number from registration</p>
                <p className="text-xs text-muted-foreground">The system will activate all attendees in your order</p>
              </div>
            </div>
          </div>
        </div>

        {/* Staff Assistance Options */}
        {showStaffOverride && (
          <div className="pt-3 border-t border-border/50 space-y-3">
            {/* Staff Can Help Activate */}
            {onStaffActivation && attendeeReadiness.hasAssignment && !attendeeReadiness.hasActivation && (
              <div className="p-3 bg-primary/10 rounded-lg border border-primary/20">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                      Staff Can Help Activate Now
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Search for this attendee and activate their wristband immediately
                    </p>
                  </div>
                  <Button 
                    onClick={onStaffActivation}
                    size="sm"
                    className="ml-4"
                  >
                    Help Activate
                  </Button>
                </div>
              </div>
            )}
            
            {/* Staff Override for Other Issues */}
            {onStaffOverride && (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Having technical issues?</p>
                  <p className="text-xs text-muted-foreground">
                    Staff can override RFID problems and authorize service
                  </p>
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
            )}
          </div>
        )}

        {/* Additional Info */}
        <Alert>
          <Smartphone className="h-4 w-4" />
          <AlertDescription className="text-xs">
            <strong>Tip:</strong> Once activated, you can use all station services including meals, drinks, and equipment checkout.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}