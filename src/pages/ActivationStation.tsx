import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Smartphone } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { phoneActivationService, GroupActivationResult, PhoneActivationService, type PhoneLookupResult } from "@/services/phoneActivationService";
import { MobilePhoneInput } from "@/components/MobilePhoneInput";
import { MobileActivationPreview } from "@/components/MobileActivationPreview";
import { MobileActivationSuccess } from "@/components/MobileActivationSuccess";
import { StaffAssistanceModal } from "@/components/StaffAssistanceModal";

export default function ActivationStation() {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [activationResult, setActivationResult] = useState<GroupActivationResult | null>(null);
  const [lookupResult, setLookupResult] = useState<PhoneLookupResult | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [errorType, setErrorType] = useState<'not_found' | 'system_error' | 'network_error'>('system_error');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const navigate = useNavigate();
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const handlePhoneLookup = async () => {
    const validation = PhoneActivationService.validatePhone(phoneNumber);
    if (!validation.isValid) {
      toast({
        title: "Invalid Phone Number",
        description: validation.error,
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    try {
      const result = await PhoneActivationService.lookupPhonePreview(phoneNumber);
      
      if (result && result.attendee_count > 0) {
        setLookupResult(result);
        setShowPreview(true);
      } else {
        setErrorType('not_found');
        setErrorMessage('No attendees found with this phone number');
        setShowStaffModal(true);
      }
    } catch (error) {
      console.error('Lookup error:', error);
      const errorMsg = error instanceof Error ? error.message : "Unknown error occurred";
      
      // Determine error type based on error message
      if (errorMsg.toLowerCase().includes('network') || errorMsg.toLowerCase().includes('connection')) {
        setErrorType('network_error');
      } else {
        setErrorType('system_error');
      }
      
      setErrorMessage(errorMsg);
      setShowStaffModal(true);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleActivatePhoneGroup = async () => {
    if (!lookupResult) return;

    setIsProcessing(true);
    try {
      const result = await PhoneActivationService.activateGroupByPhone(
        phoneNumber,
        'self_activated'
      );

      if (result) {
        setActivationResult(result);
        toast({
          title: "Activation Successful!",
          description: `Activated ${result.activated_count - result.already_active_count} new attendee(s)`,
        });
        setShowPreview(false);
        setLookupResult(null);
      } else {
        toast({
          title: "Activation Failed",
          description: "Unable to activate attendees",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Activation error:', error);
      toast({
        title: "Activation Failed",
        description: "There was an error activating your group. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleActivateEntireOrder = async () => {
    if (!lookupResult) return;

    setIsProcessing(true);
    try {
      const result = await PhoneActivationService.activateEntireOrderByPhone(
        phoneNumber,
        'self_activated'
      );

      if (result) {
        setActivationResult(result);
        toast({
          title: "Order Activation Successful!",
          description: `Activated ${result.activated_count - result.already_active_count} new attendee(s) from the entire order`,
        });
        setShowPreview(false);
        setLookupResult(null);
      } else {
        toast({
          title: "Order Activation Failed",
          description: "Unable to activate entire order",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Order activation error:', error);
      toast({
        title: "Order Activation Failed",
        description: "There was an error activating the entire order. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };


  const resetForm = () => {
    setPhoneNumber("");
    setActivationResult(null);
    setLookupResult(null);
    setShowPreview(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-md mx-auto p-4 space-y-4 md:max-w-2xl">
        {/* Mobile Header */}
        <div className="flex items-center justify-between">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => navigate("/")}
            className="p-2"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-bold md:text-2xl">Self-Service Activation</h1>
          <div className="w-9" /> {/* Spacer for centering */}
        </div>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Smartphone className="h-5 w-5" />
              Phone Activation
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {!activationResult ? (
              <>
                {!showPreview ? (
                  <div className="space-y-6">
                    <MobilePhoneInput
                      value={phoneNumber}
                      onChange={setPhoneNumber}
                      disabled={isProcessing}
                      onSubmit={handlePhoneLookup}
                    />

                    <Button
                      onClick={handlePhoneLookup}
                      disabled={isProcessing || phoneNumber.length !== 10}
                      size="lg"
                      className="w-full h-12 text-base font-medium"
                    >
                      {isProcessing ? (
                        <div className="flex items-center gap-2">
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                          Looking up...
                        </div>
                      ) : (
                        "Look Up My Registration"
                      )}
                    </Button>
                  </div>
                ) : lookupResult && (
                  <MobileActivationPreview
                    phoneNumber={phoneNumber}
                    lookupResult={lookupResult}
                    isProcessing={isProcessing}
                    onActivatePhoneGroup={handleActivatePhoneGroup}
                    onActivateEntireOrder={handleActivateEntireOrder}
                    onBack={() => setShowPreview(false)}
                  />
                )}
              </>
            ) : (
              <MobileActivationSuccess
                phoneNumber={phoneNumber}
                activationResult={activationResult}
                onReset={resetForm}
                onGoHome={() => navigate("/")}
                onUpdate={(result) => setActivationResult(result)}
              />
            )}
          </CardContent>
        </Card>

        <StaffAssistanceModal
          isOpen={showStaffModal}
          onClose={() => setShowStaffModal(false)}
          phoneNumber={phoneNumber}
          errorType={errorType}
          errorMessage={errorMessage}
        />
      </div>
    </div>
  );
}