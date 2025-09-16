import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertTriangle, Phone, User, Clock } from "lucide-react";

interface StaffAssistanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  phoneNumber?: string;
  errorType: 'not_found' | 'system_error' | 'network_error';
  errorMessage?: string;
}

export function StaffAssistanceModal({
  isOpen,
  onClose,
  phoneNumber,
  errorType,
  errorMessage
}: StaffAssistanceModalProps) {
  const getErrorDetails = () => {
    switch (errorType) {
      case 'not_found':
        return {
          title: "Registration Not Found",
          icon: <User className="h-8 w-8 text-warning" />,
          description: "We couldn't find any attendees registered with this phone number.",
          instructions: [
            "Double-check that you entered the correct phone number",
            "Verify the number matches your registration",
            "Ask staff to help locate your registration using your name or email"
          ],
          staffAction: "Please help this attendee locate their registration using alternative search methods."
        };
      case 'system_error':
        return {
          title: "System Error",
          icon: <AlertTriangle className="h-8 w-8 text-destructive" />,
          description: "There was a technical issue processing your request.",
          instructions: [
            "Wait a moment and try again",
            "If the problem persists, staff will assist you",
            "Your registration is safe - this is just a temporary issue"
          ],
          staffAction: "Technical issue occurred. Please assist with manual activation."
        };
      case 'network_error':
        return {
          title: "Connection Issue",
          icon: <Clock className="h-8 w-8 text-info" />,
          description: "Unable to connect to the registration system.",
          instructions: [
            "Check your internet connection",
            "Try again in a few moments",
            "Staff can assist if the connection issue persists"
          ],
          staffAction: "Network connectivity issue. Please assist with manual processes."
        };
      default:
        return {
          title: "Assistance Needed",
          icon: <AlertTriangle className="h-8 w-8 text-warning" />,
          description: "An unexpected issue occurred.",
          instructions: ["Please ask staff for assistance"],
          staffAction: "General assistance needed for activation."
        };
    }
  };

  const errorDetails = getErrorDetails();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md mx-4">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            {errorDetails.icon}
            {errorDetails.title}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <p className="text-muted-foreground">
            {errorDetails.description}
          </p>

          {phoneNumber && (
            <Card className="bg-muted/30">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4" />
                  <span className="font-mono">{phoneNumber}</span>
                </div>
              </CardContent>
            </Card>
          )}

          {errorMessage && (
            <Card className="bg-destructive/10 border-destructive/20">
              <CardContent className="p-4">
                <p className="text-sm text-destructive">
                  Error details: {errorMessage}
                </p>
              </CardContent>
            </Card>
          )}

          <div className="space-y-3">
            <h4 className="font-medium">What you can do:</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {errorDetails.instructions.map((instruction, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>{instruction}</span>
                </li>
              ))}
            </ul>
          </div>

          <Card className="bg-info/10 border-info/20">
            <CardContent className="p-4">
              <h4 className="font-medium text-info-foreground mb-2">For Staff:</h4>
              <p className="text-sm text-info-foreground/80">
                {errorDetails.staffAction}
              </p>
            </CardContent>
          </Card>

          <div className="flex gap-3 pt-2">
            <Button onClick={onClose} variant="outline" className="flex-1">
              Try Again
            </Button>
            <Button onClick={onClose} className="flex-1">
              Get Staff Help
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}