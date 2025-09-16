import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, Users, RotateCcw, Home, AlertTriangle } from "lucide-react";
import { formatPhoneNumber } from "@/lib/phoneUtils";
import { MobileAttendeeCard } from "./MobileAttendeeCard";
import type { GroupActivationResult } from "@/services/phoneActivationService";

interface MobileActivationSuccessProps {
  phoneNumber: string;
  activationResult: GroupActivationResult;
  onReset: () => void;
  onGoHome: () => void;
}

export function MobileActivationSuccess({
  phoneNumber,
  activationResult,
  onReset,
  onGoHome
}: MobileActivationSuccessProps) {
  const newlyActivated = activationResult.activated_count - activationResult.already_active_count;
  const alreadyActive = activationResult.already_active_count;

  return (
    <div className="space-y-6">
      {/* Success Header */}
      <Card className="border-success/30 bg-success/5">
        <CardContent className="p-6 text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-success/20 rounded-full">
              <CheckCircle className="h-8 w-8 text-success" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-success mb-2">
            Activation Complete!
          </h2>
          <p className="text-lg font-semibold mb-1">
            {formatPhoneNumber(phoneNumber)}
          </p>
          <p className="text-muted-foreground">
            Order #{activationResult.order_id || 'Individual'}
          </p>
        </CardContent>
      </Card>

      {/* Activation Summary */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-success mb-1">
              {newlyActivated}
            </div>
            <div className="text-sm text-muted-foreground">
              Newly Activated
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-info mb-1">
              {alreadyActive}
            </div>
            <div className="text-sm text-muted-foreground">
              Already Active
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Total Badge */}
      <div className="flex justify-center">
        <Badge className="bg-primary text-primary-foreground text-lg px-4 py-2">
          <Users className="h-5 w-5 mr-2" />
          {activationResult.activated_count} of {activationResult.total_attendees} Total
        </Badge>
      </div>

      {/* RFID Warnings */}
      {activationResult.warnings && activationResult.warnings.length > 0 && (
        <Alert className="border-warning bg-warning/5">
          <AlertTriangle className="h-4 w-4 text-warning" />
          <AlertDescription className="text-warning-foreground">
            <div className="font-medium mb-2">⚠️ Service Access Warnings:</div>
            <div className="space-y-1 text-sm">
              {activationResult.warnings.map((warning, index) => (
                <div key={index}>{warning}</div>
              ))}
            </div>
            <div className="mt-2 text-xs opacity-75">
              These attendees need RFID tags assigned at the Registration Station before they can use event services.
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Attendee Details */}
      {activationResult.attendee_details && activationResult.attendee_details.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-medium text-center">Activated Attendees</h3>
          <div className="space-y-2">
            {activationResult.attendee_details.map((attendee: any, index: number) => (
              <MobileAttendeeCard
                key={index}
                attendee={{
                  name: attendee.name,
                  order_id: attendee.order_id,
                  rfid_uid: attendee.rfid_uid,
                  is_activated: true,
                  activated_at: attendee.activated_at,
                }}
                type={attendee.was_already_active ? 'companion' : 'direct'}
                showDetails={false}
              />
            ))}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="sticky bottom-0 bg-background/95 backdrop-blur-sm border-t border-border/50 p-4 -m-4 mt-6">
        <div className="space-y-3">
          <Button
            onClick={onReset}
            size="lg"
            className="w-full h-12 text-base font-medium"
          >
            <RotateCcw className="h-5 w-5 mr-2" />
            Activate Another Group
          </Button>
          <Button
            onClick={onGoHome}
            variant="outline"
            size="lg"
            className="w-full h-12 text-base"
          >
            <Home className="h-4 w-4 mr-2" />
            Back to Main Hub
          </Button>
        </div>
      </div>
    </div>
  );
}