import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Power, Smartphone, Shield, AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { phoneActivationService, GroupActivationResult, PhoneActivationService, type PhoneLookupResult } from "@/services/phoneActivationService";
import { RfidManagementPanel } from "@/components/RfidManagementPanel";
import { MobilePhoneInput } from "@/components/MobilePhoneInput";
import { MobileActivationPreview } from "@/components/MobileActivationPreview";
import { MobileActivationSuccess } from "@/components/MobileActivationSuccess";

export default function ActivationStation() {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [activationResult, setActivationResult] = useState<GroupActivationResult | null>(null);
  const [lookupResult, setLookupResult] = useState<PhoneLookupResult | null>(null);
  const [showPreview, setShowPreview] = useState(false);
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
        toast({
          title: "No Attendees Found",
          description: "No attendees found with this phone number. Please check the number and try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Lookup error:', error);
      toast({
        title: "Lookup Failed",
        description: error instanceof Error ? error.message : "There was an error looking up attendees. Please try again.",
        variant: "destructive",
      });
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

  const handleMassDeactivation = async () => {
    if (!confirm("Are you sure you want to deactivate ALL RFID tags? This action cannot be undone.")) {
      return;
    }

    setIsProcessing(true);
    try {
      const count = await PhoneActivationService.deactivateAllRfids("Mass deactivation via admin panel");
      toast({
        title: "Mass Deactivation Complete",
        description: `${count} RFID tags have been deactivated.`,
      });
    } catch (error) {
      console.error("Mass deactivation error:", error);
      toast({
        title: "Deactivation Failed",
        description: "Failed to perform mass deactivation. Please try again.",
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
          <h1 className="text-lg font-bold md:text-2xl">Activation Station</h1>
          <div className="w-9" /> {/* Spacer for centering */}
        </div>

        <Tabs defaultValue="self-service" className="w-full">
          <TabsList className={`grid w-full ${isMobile ? 'grid-cols-1 h-auto gap-1' : 'grid-cols-3'}`}>
            <TabsTrigger 
              value="self-service" 
              className={`${isMobile ? 'justify-start text-sm py-3' : ''}`}
            >
              <Smartphone className="h-4 w-4 mr-2" />
              Phone Activation
            </TabsTrigger>
            <TabsTrigger 
              value="rfid"
              className={`${isMobile ? 'justify-start text-sm py-3' : ''}`}
            >
              <Shield className="h-4 w-4 mr-2" />
              RFID Management
            </TabsTrigger>
            <TabsTrigger 
              value="admin"
              className={`${isMobile ? 'justify-start text-sm py-3' : ''}`}
            >
              <Power className="h-4 w-4 mr-2" />
              Admin
            </TabsTrigger>
          </TabsList>

          <TabsContent value="self-service" className="space-y-4 mt-6">
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Smartphone className="h-5 w-5" />
                  Self-Service Activation
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
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="rfid" className="mt-6">
            <RfidManagementPanel />
          </TabsContent>

          <TabsContent value="admin" className="space-y-4 mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Power className="h-5 w-5" />
                  Administrative Controls
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 border border-warning/50 bg-warning/10 rounded-lg">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-warning-foreground mb-1">
                        Mass Deactivation
                      </h4>
                      <p className="text-sm text-muted-foreground mb-3">
                        This will deactivate ALL active RFID tags in the system. This action cannot be undone.
                      </p>
                      <Button
                        onClick={handleMassDeactivation}
                        disabled={isProcessing}
                        variant="destructive"
                        size="lg"
                        className="w-full"
                      >
                        {isProcessing ? "Deactivating..." : "Deactivate All RFIDs"}
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}