import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, Users, RotateCcw, Home, AlertTriangle, RefreshCw, AlertCircle } from "lucide-react";
import { formatPhoneNumber } from "@/lib/phoneUtils";
import { MobileAttendeeCard } from "./MobileAttendeeCard";
import { phoneActivationService, PhoneActivationService } from "@/services/phoneActivationService";
import { useState } from "react";
import type { GroupActivationResult } from "@/services/phoneActivationService";

interface MobileActivationSuccessProps {
  phoneNumber: string;
  activationResult: GroupActivationResult;
  onReset: () => void;
  onGoHome: () => void;
  onUpdate?: (result: GroupActivationResult) => void;
}

export function MobileActivationSuccess({
  phoneNumber,
  activationResult,
  onReset,
  onGoHome,
  onUpdate
}: MobileActivationSuccessProps) {
  const [isActivatingRemaining, setIsActivatingRemaining] = useState(false);
  
  const newlyActivated = activationResult.attendee_details?.filter((attendee: any) => 
    !attendee.was_already_active && attendee.can_use_services
  ) || [];
  
  const alreadyActive = activationResult.attendee_details?.filter((attendee: any) => 
    attendee.was_already_active
  ) || [];

  const noRfidAttendees = activationResult.attendee_details?.filter((attendee: any) => 
    !attendee.has_rfid
  ) || [];

  const pendingRfidAttendees = activationResult.attendee_details?.filter((attendee: any) => 
    attendee.has_rfid && !attendee.activated_at
  ) || [];

  const handleActivateRemaining = async () => {
    if (pendingRfidAttendees.length === 0) return;
    
    setIsActivatingRemaining(true);
    try {
      const result = await PhoneActivationService.activateRemainingRfidsByPhone(phoneNumber);
      if (result && onUpdate) {
        onUpdate(result);
      }
    } catch (error) {
      console.error('Error activating remaining RFIDs:', error);
    } finally {
      setIsActivatingRemaining(false);
    }
  };

  const totalServiceReady = newlyActivated.length + alreadyActive.length;

  // Determine activation status and styling
  const getActivationStatus = () => {
    if (totalServiceReady === activationResult.total_attendees) {
      return {
        type: 'complete',
        title: 'Activation Complete!',
        subtitle: 'All attendees are ready for services',
        icon: CheckCircle,
        cardClass: 'border-success/30 bg-success/5',
        iconBgClass: 'bg-success/20',
        iconClass: 'text-success',
        titleClass: 'text-success'
      };
    } else if (totalServiceReady > 0) {
      return {
        type: 'partial',
        title: 'Partial Activation Complete',
        subtitle: `${totalServiceReady} of ${activationResult.total_attendees} attendees activated`,
        icon: AlertTriangle,
        cardClass: 'border-warning/30 bg-warning/5',
        iconBgClass: 'bg-warning/20',
        iconClass: 'text-warning',
        titleClass: 'text-warning'
      };
    } else {
      return {
        type: 'none',
        title: 'Activation Required',
        subtitle: 'All attendees need RFID assignment',
        icon: AlertCircle,
        cardClass: 'border-destructive/30 bg-destructive/5',
        iconBgClass: 'bg-destructive/20',
        iconClass: 'text-destructive',
        titleClass: 'text-destructive'
      };
    }
  };

  const status = getActivationStatus();

  return (
    <div className="space-y-6">
      {/* Dynamic Header */}
      <Card className={status.cardClass}>
        <CardContent className="p-6 text-center">
          <div className="flex justify-center mb-4">
            <div className={`p-3 rounded-full ${status.iconBgClass}`}>
              <status.icon className={`h-8 w-8 ${status.iconClass}`} />
            </div>
          </div>
          <h2 className={`text-2xl font-bold mb-2 ${status.titleClass}`}>
            {status.title}
          </h2>
          <p className="text-lg font-semibold mb-1">
            {formatPhoneNumber(phoneNumber)}
          </p>
          <p className="text-muted-foreground mb-2">
            Order #{activationResult.order_id || 'Individual'}
          </p>
          <p className="text-sm text-muted-foreground">
            {status.subtitle}
          </p>
        </CardContent>
      </Card>

      {/* Activation Summary */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-success mb-1">
              {newlyActivated.length}
            </div>
            <div className="text-sm text-muted-foreground">
              Newly Activated
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-info mb-1">
              {alreadyActive.length}
            </div>
            <div className="text-sm text-muted-foreground">
              Already Active
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Total Badge */}
      <div className="flex justify-center">
        <Badge className={`text-lg px-4 py-2 ${
          status.type === 'complete' 
            ? 'bg-success text-success-foreground' 
            : status.type === 'partial'
            ? 'bg-warning text-warning-foreground'
            : 'bg-destructive text-destructive-foreground'
        }`}>
          <Users className="h-5 w-5 mr-2" />
          {totalServiceReady} Service Ready of {activationResult.total_attendees} Total
        </Badge>
      </div>

      {/* RFID Warnings */}
      {activationResult.warnings && activationResult.warnings.length > 0 && (
        <Alert className="border-warning bg-warning/5">
          <AlertTriangle className="h-4 w-4 text-warning" />
          <AlertDescription>
            <div className="space-y-1">
              {activationResult.warnings.map((warning: string, index: number) => (
                <div key={index} className="text-amber-800">
                  {warning}
                </div>
              ))}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Activate Remaining RFIDs Alert */}
      {pendingRfidAttendees.length > 0 && (
        <Alert className="border-amber-300 bg-amber-50">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription>
            <div className="space-y-2">
              <div className="text-amber-800 font-medium">
                {pendingRfidAttendees.length} attendee(s) with RFID can still be activated
              </div>
              <Button 
                onClick={handleActivateRemaining}
                disabled={isActivatingRemaining}
                variant="outline"
                size="sm"
                className="mt-2"
              >
                {isActivatingRemaining ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Activating...
                  </>
                ) : (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Activate Remaining RFIDs
                  </>
                )}
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Attendee Details */}
      {activationResult.attendee_details && activationResult.attendee_details.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-foreground">Attendee Details</h3>
          
          {/* Service Ready Attendees */}
          {(newlyActivated.length > 0 || alreadyActive.length > 0) && (
            <div className="space-y-2">
              <h4 className="text-md font-medium text-green-700">✅ Service Ready</h4>
              <div className="space-y-2">
                {[...newlyActivated, ...alreadyActive].map((attendee: any, index: number) => (
                  <MobileAttendeeCard
                    key={`active-${index}`}
                    attendee={{
                      name: attendee.name,
                      phone: phoneNumber,
                      order_id: attendee.order_id,
                      rfid_uid: attendee.rfid_uid,
                      activated_at: attendee.activated_at,
                      meal_plan: "Standard",
                      is_activated: true
                    }}
                    type="direct"
                    showDetails={false}
                    onToggleDetails={() => {}}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Pending RFID Attendees */}
          {pendingRfidAttendees.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-md font-medium text-amber-700">⏳ Pending Activation</h4>
              <div className="space-y-2">
                {pendingRfidAttendees.map((attendee: any, index: number) => (
                  <MobileAttendeeCard
                    key={`pending-${index}`}
                    attendee={{
                      name: attendee.name,
                      phone: phoneNumber,
                      order_id: attendee.order_id,
                      rfid_uid: attendee.rfid_uid,
                      activated_at: null,
                      meal_plan: "Standard",
                      is_activated: false
                    }}
                    type="direct"
                    showDetails={false}
                    onToggleDetails={() => {}}
                  />
                ))}
              </div>
            </div>
          )}

          {/* No RFID Attendees */}
          {noRfidAttendees.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-md font-medium text-red-700">❌ RFID Required</h4>
              <div className="space-y-2">
                {noRfidAttendees.map((attendee: any, index: number) => (
                  <MobileAttendeeCard
                    key={`no-rfid-${index}`}
                    attendee={{
                      name: attendee.name,
                      phone: phoneNumber,
                      order_id: attendee.order_id,
                      rfid_uid: null,
                      activated_at: null,
                      meal_plan: "Standard",
                      is_activated: false
                    }}
                    type="direct"
                    showDetails={false}
                    onToggleDetails={() => {}}
                  />
                ))}
              </div>
            </div>
          )}
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
            {status.type === 'complete' ? 'Activate Another Group' : 'Activate More Attendees'}
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