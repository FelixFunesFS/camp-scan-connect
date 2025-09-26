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
          <p className="text-sm text-muted-foreground">Staff can activate this attendee directly.</p>
        </div>

        {/* Staff Assistance Options */}
        {showStaffOverride && (
          <div className="pt-3 border-t border-border/50 space-y-3">
            {/* Quick Staff Activation */}
            {onStaffActivation && attendeeReadiness.hasAssignment && !attendeeReadiness.hasActivation && (
              <div>
                <Button 
                  onClick={onStaffActivation}
                  size="touch"
                  className="w-full"
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Quick Activate
                </Button>
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

      </CardContent>
    </Card>
  );
}