import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, Smartphone, Users, Clock, HelpCircle, AlertTriangle } from "lucide-react";

export function SelfActivationInstructions() {
  return (
    <div className="space-y-4">
      {/* Quick Start Guide */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-primary" />
            Quick Start Guide
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-medium mt-0.5">
                1
              </div>
              <div>
                <p className="font-medium text-sm">Enter Your Phone Number</p>
                <p className="text-xs text-muted-foreground">Use the 10-digit phone number from your registration</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-medium mt-0.5">
                2
              </div>
              <div>
                <p className="font-medium text-sm">Review Your Registration</p>
                <p className="text-xs text-muted-foreground">Check your details and meal plan information</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-medium mt-0.5">
                3
              </div>
              <div>
                <p className="font-medium text-sm">Complete Your Check-In</p>
                <p className="text-xs text-muted-foreground">Choose individual or group check-in</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Phone Number Examples */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Smartphone className="h-4 w-4" />
            Phone Number Format
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Enter your 10-digit phone number like this:</p>
            <div className="bg-muted/30 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-3 w-3 text-success" />
                <span className="font-mono text-sm">5551234567</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* RFID Status Guide */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" />
            Understanding Your Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="text-xs text-muted-foreground">
                Unassigned
              </Badge>
              <span className="text-sm text-muted-foreground">Your wristband needs to be programmed by staff first</span>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="secondary" className="text-xs bg-warning text-warning-foreground">
                RFID Assigned
              </Badge>
              <span className="text-sm text-muted-foreground">You have a wristband but need to activate it</span>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="default" className="text-xs bg-success text-success-foreground">
                RFID Activated
              </Badge>
              <span className="text-sm text-muted-foreground">Ready to use all services!</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Important Notes */}
      <Alert>
        <HelpCircle className="h-4 w-4" />
        <AlertDescription className="text-sm">
          <strong>Can't find your registration?</strong> Try using the phone number exactly as you entered it during registration, or contact staff for assistance.
        </AlertDescription>
      </Alert>

      <Alert>
        <Clock className="h-4 w-4" />
        <AlertDescription className="text-sm">
          <strong>Group orders:</strong> You can activate just yourself or your entire group at once. Choose what works best for your party.
        </AlertDescription>
      </Alert>
    </div>
  );
}