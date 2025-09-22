import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Smartphone, HelpCircle, BookOpen } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/use-mobile";
import { phoneActivationService, GroupActivationResult, PhoneActivationService, type PhoneLookupResult } from "@/services/phoneActivationService";
import { MobilePhoneInput } from "@/components/MobilePhoneInput";
import { MobileActivationPreview } from "@/components/MobileActivationPreview";
import { MobileActivationSuccess } from "@/components/MobileActivationSuccess";
import { StaffAssistanceModal } from "@/components/StaffAssistanceModal";
import { SelfActivationInstructions } from "@/components/SelfActivationInstructions";
import { SelfActivationFAQ } from "@/components/SelfActivationFAQ";

export default function ActivationStation() {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [activationResult, setActivationResult] = useState<GroupActivationResult | null>(null);
  const [lookupResult, setLookupResult] = useState<PhoneLookupResult | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [errorType, setErrorType] = useState<'not_found' | 'unassigned' | 'activation_failed' | 'system_error'>('system_error');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const navigate = useNavigate();
  
  const isMobile = useIsMobile();

  const handlePhoneLookup = async () => {
    const validation = PhoneActivationService.validatePhone(phoneNumber);
    if (!validation.isValid) {
      toast.error("Invalid Phone Number - " + validation.error);
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
        setErrorType('system_error');
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
        toast.success(`Check-In Complete! Activated ${result.activated_count - result.already_active_count} new attendee(s)`);
        setShowPreview(false);
        setLookupResult(null);
      } else {
        toast.error("Check-In Failed - Unable to activate attendees");
      }
    } catch (error) {
      console.error('Activation error:', error);
      toast.error("Check-In Failed - There was an error activating your group. Please try again.");
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
        toast.success(`Order Check-In Complete! Activated ${result.activated_count - result.already_active_count} new attendee(s) from the entire order`);
        setShowPreview(false);
        setLookupResult(null);
      } else {
        toast.error("Order Check-In Failed - Unable to activate entire order");
      }
    } catch (error) {
      console.error('Order activation error:', error);
      toast.error("Order Check-In Failed - There was an error activating the entire order. Please try again.");
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
          <h1 className="text-lg font-bold md:text-2xl">Self-Service Check-In</h1>
          <div className="w-9" /> {/* Spacer for centering */}
        </div>

        <Tabs defaultValue="activate" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="activate" className="flex items-center gap-1">
              <Smartphone className="h-4 w-4" />
              <span className="hidden sm:inline">Check-In</span>
            </TabsTrigger>
            <TabsTrigger value="instructions" className="flex items-center gap-1">
              <BookOpen className="h-4 w-4" />
              <span className="hidden sm:inline">Guide</span>
            </TabsTrigger>
            <TabsTrigger value="faq" className="flex items-center gap-1">
              <HelpCircle className="h-4 w-4" />
              <span className="hidden sm:inline">FAQ</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="activate">
            {/* Camp Cousin Welcome Message */}
            <Card className="border-primary/30 bg-gradient-to-r from-primary/5 to-accent/5 mb-4">
              <CardContent className="p-6 text-center">
                <div className="text-3xl mb-2">🏕️</div>
                <h2 className="text-2xl font-bold text-primary mb-2">
                  Welcome, Camp Cousin!
                </h2>
                <p className="text-lg text-foreground mb-2">
                  Ready to get your campout experience started? Let's get you checked in and ready for an amazing weekend of music, food, and memories at Melanated Campout 2025!
                </p>
                <p className="text-sm text-muted-foreground">
                  Your RFID wristband gives you access to drinks, activities, and all the campout fun - plus meals if you purchased a meal package! Let's get you checked in!
                </p>
              </CardContent>
            </Card>

            {/* Meal Package Info Card */}
            <Card className="border-orange-200 bg-orange-50/50 dark:border-orange-800 dark:bg-orange-950/20 mb-4">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="text-xl">🍽️</div>
                  <div>
                    <h3 className="font-semibold text-orange-900 dark:text-orange-100 mb-1">
                      About Meal Service
                    </h3>
                    <p className="text-sm text-orange-800 dark:text-orange-200">
                      Meal access requires a purchased meal package. Check your registration details during check-in to see your meal plan status.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Smartphone className="h-5 w-5" />
                  Phone Check-In
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
                            "Find My Registration"
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
          </TabsContent>

          <TabsContent value="instructions">
            <SelfActivationInstructions />
          </TabsContent>

          <TabsContent value="faq">
            <SelfActivationFAQ />
          </TabsContent>
        </Tabs>

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