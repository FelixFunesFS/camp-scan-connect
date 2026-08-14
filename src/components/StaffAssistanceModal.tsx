import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AlertTriangle, Phone, Mail, Users, Wifi, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { StaffAssistanceService } from "@/services/staffAssistanceService";
import { toast } from "sonner";

interface StaffAssistanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  phoneNumber?: string;
  errorType?: 'not_found' | 'unassigned' | 'activation_failed' | 'system_error';
  errorMessage?: string;
}

export function StaffAssistanceModal({ isOpen, onClose, phoneNumber, errorType, errorMessage }: StaffAssistanceModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessForm, setShowSuccessForm] = useState(false);
  const [contactInfo, setContactInfo] = useState({
    name: '',
    email: '',
    preferredContact: 'phone' as 'phone' | 'email',
    description: ''
  });

  const getErrorDetails = (type: string) => {
    switch (type) {
      case 'not_found':
        return {
          title: "Phone Number Not Found",
          icon: Phone,
          description: "We couldn't find any registration with this phone number.",
          instructions: "Double-check your phone number format (10 digits: 5551234567). If still not found, staff can help locate your registration.",
          staffAction: "Help attendee verify registration details and check alternative phone numbers or name lookup."
        };
      case 'unassigned':
        return {
          title: "Wristband Needs Programming",
          icon: Users,
          description: "Your registration was found, but your wristband needs to be programmed by staff.",
          instructions: "Your wristband has no RFID code loaded yet. Find staff to program your wristband, then return here to activate.",
          staffAction: "Program attendee's wristband with Code, then guide them back to self-activation."
        };
      case 'activation_failed':
        return {
          title: "Activation Failed",
          icon: AlertTriangle,
          description: "There was a problem activating your service.",
          instructions: "Try again in a moment. If the problem continues, staff can help troubleshoot.",
          staffAction: "Check system logs and troubleshoot activation issue - may be network or database related."
        };
      case 'system_error':
        return {
          title: "System Error",
          icon: Wifi,
          description: "We're experiencing technical difficulties.",
          instructions: "Try again in a few minutes. For immediate help, contact staff.",
          staffAction: "Check system status, network connectivity, and database connections. May need technical support."
        };
      default:
        return {
          title: "Need Assistance",
          icon: AlertTriangle,
          description: "Something went wrong with your activation.",
          instructions: "Staff can help resolve this issue.",
          staffAction: "General assistance needed - check registration status and system functionality."
        };
    }
  };

  const details = getErrorDetails(errorType || 'unknown');
  const IconComponent = details.icon;

  const handleRequestStaffHelp = async () => {
    if (!contactInfo.name.trim()) {
      toast.error("Please enter your name");
      return;
    }

    if (contactInfo.preferredContact === 'email' && !contactInfo.email.trim()) {
      toast.error("Please enter your email address");
      return;
    }

    setIsSubmitting(true);

    try {
      await StaffAssistanceService.createAssistanceRequest({
        phone_number: phoneNumber,
        attendee_name: contactInfo.name,
        email: contactInfo.email || undefined,
        issue_type: errorType as any || 'system_error',
        error_message: errorMessage || undefined,
        contact_info: {
          preferred_contact: contactInfo.preferredContact,
          description: contactInfo.description,
          phone: phoneNumber,
          email: contactInfo.email
        },
        priority: errorType === 'system_error' ? 'high' : 'normal'
      });

      setShowSuccessForm(true);
      toast.success("Staff have been notified and will contact you shortly!");
    } catch (error) {
      console.error('Failed to create assistance request:', error);
      toast.error("Failed to notify staff. Please find a staff member directly.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetAndClose = () => {
    setShowSuccessForm(false);
    setContactInfo({ name: '', email: '', preferredContact: 'phone', description: '' });
    onClose();
  };

  if (showSuccessForm) {
    return (
      <Dialog open={isOpen} onOpenChange={resetAndClose}>
        <DialogContent className="max-w-md mx-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-center text-green-700">
              <CheckCircle2 className="h-5 w-5" />
              Staff Notified!
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 text-center">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-sm text-green-800">
                Staff have been notified about your issue and will contact you shortly at:
              </p>
              <div className="mt-2 font-medium text-green-900">
                {contactInfo.preferredContact === 'phone' ? phoneNumber : contactInfo.email}
              </div>
            </div>
            
            <div className="text-sm text-muted-foreground">
              <p>In the meantime, you can:</p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Continue exploring other features</li>
                <li>Find a staff member for immediate help</li>
                <li>Try your activation again later</li>
              </ul>
            </div>

            <Button onClick={resetAndClose} className="w-full">
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md mx-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-center">
            <IconComponent className="h-5 w-5 text-destructive" />
            {details.title}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="text-center space-y-2">
            <p className="text-sm text-muted-foreground">
              {details.description}
            </p>
            
            {phoneNumber && (
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-xs text-muted-foreground">Phone Number:</p>
                <p className="font-mono text-sm">{phoneNumber}</p>
              </div>
            )}
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-sm text-blue-900 mb-2">Next Steps:</h4>
            <p className="text-sm text-blue-800">{details.instructions}</p>
          </div>

          <div className="space-y-3">
            <h4 className="font-medium text-sm">Request Staff Assistance:</h4>
            
            <div className="space-y-3">
              <div>
                <Label htmlFor="name" className="text-sm">Your Name *</Label>
                <Input
                  id="name"
                  placeholder="Enter your name"
                  value={contactInfo.name}
                  onChange={(e) => setContactInfo(prev => ({ ...prev, name: e.target.value }))}
                  className="mt-1"
                />
              </div>

              <div>
                <Label className="text-sm">Preferred Contact Method</Label>
                <div className="flex gap-2 mt-1">
                  <Button
                    type="button"
                    variant={contactInfo.preferredContact === 'phone' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setContactInfo(prev => ({ ...prev, preferredContact: 'phone' }))}
                    className="flex-1"
                  >
                    <Phone className="h-3 w-3 mr-1" />
                    Phone
                  </Button>
                  <Button
                    type="button"
                    variant={contactInfo.preferredContact === 'email' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setContactInfo(prev => ({ ...prev, preferredContact: 'email' }))}
                    className="flex-1"
                  >
                    <Mail className="h-3 w-3 mr-1" />
                    Email
                  </Button>
                </div>
              </div>

              {contactInfo.preferredContact === 'email' && (
                <div>
                  <Label htmlFor="email" className="text-sm">Email Address *</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="your@email.com"
                    value={contactInfo.email}
                    onChange={(e) => setContactInfo(prev => ({ ...prev, email: e.target.value }))}
                    className="mt-1"
                  />
                </div>
              )}

              <div>
                <Label htmlFor="description" className="text-sm">Additional Details (Optional)</Label>
                <Textarea
                  id="description"
                  placeholder="Describe your issue or location..."
                  value={contactInfo.description}
                  onChange={(e) => setContactInfo(prev => ({ ...prev, description: e.target.value }))}
                  rows={2}
                  className="mt-1"
                />
              </div>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Try Again
            </Button>
            <Button 
              onClick={handleRequestStaffHelp} 
              disabled={isSubmitting}
              className="flex-1"
            >
              {isSubmitting ? "Notifying..." : "Request Help"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}