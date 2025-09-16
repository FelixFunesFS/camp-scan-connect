import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Power, PowerOff, Phone, Users, CheckCircle, XCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { phoneActivationService, GroupActivationResult, PhoneActivationService, type PhoneLookupResult } from "@/services/phoneActivationService";

export default function ActivationStation() {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [activationResult, setActivationResult] = useState<GroupActivationResult | null>(null);
  const [lookupResult, setLookupResult] = useState<PhoneLookupResult | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [selectedRfid, setSelectedRfid] = useState("");
  const [activationStatus, setActivationStatus] = useState<string>('inactive');
  const navigate = useNavigate();
  const { toast } = useToast();

  const handlePhoneLookup = async () => {
    if (phoneNumber.length !== 10) {
      toast({
        title: "Invalid Phone Number",
        description: "Please enter a valid 10-digit phone number",
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
          description: "No attendees found with this phone number",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Lookup error:', error);
      toast({
        title: "Lookup Failed",
        description: "There was an error looking up attendees. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmActivation = async () => {
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
          description: `Activated ${result.activated_count} attendee(s)`,
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

  const handleStaffActivation = async () => {
    // Staff-assisted activation logic would go here
    toast({
      title: "Staff Mode",
      description: "Staff-assisted activation coming soon.",
    });
  };

  const handleMassDeactivation = async () => {
    if (!confirm("Are you sure you want to deactivate ALL RFID tags? This action cannot be undone.")) {
      return;
    }

    setIsProcessing(true);
    try {
      const count = await PhoneActivationService.deactivateAllRfids("Sunday mass deactivation");
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
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button 
            variant="outline" 
            onClick={() => navigate("/")}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Main Hub
          </Button>
          <h1 className="text-2xl font-bold">Activation Station</h1>
        </div>

        <Tabs defaultValue="self-service" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="self-service">Self-Service</TabsTrigger>
            <TabsTrigger value="staff">Staff Assisted</TabsTrigger>
          </TabsList>

          <TabsContent value="self-service" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Phone className="h-5 w-5" />
                  Phone Number Activation
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {!activationResult ? (
                  <div className="space-y-6">
                    {!showPreview ? (
                      <>
                        <div className="space-y-2">
                          <Label htmlFor="phone">Enter your phone number</Label>
                          <InputOTP
                            maxLength={10}
                            value={phoneNumber}
                            onChange={(value) => setPhoneNumber(value)}
                          >
                            <InputOTPGroup>
                              <InputOTPSlot index={0} />
                              <InputOTPSlot index={1} />
                              <InputOTPSlot index={2} />
                            </InputOTPGroup>
                            <InputOTPGroup>
                              <InputOTPSlot index={3} />
                              <InputOTPSlot index={4} />
                              <InputOTPSlot index={5} />
                            </InputOTPGroup>
                            <InputOTPGroup>
                              <InputOTPSlot index={6} />
                              <InputOTPSlot index={7} />
                              <InputOTPSlot index={8} />
                              <InputOTPSlot index={9} />
                            </InputOTPGroup>
                          </InputOTP>
                          <p className="text-sm text-muted-foreground">
                            Enter the phone number used when registering for the event
                          </p>
                        </div>

                        <Button
                          onClick={handlePhoneLookup}
                          disabled={isProcessing || phoneNumber.length !== 10}
                          size="lg"
                          className="w-full h-16 text-lg"
                        >
                          {isProcessing ? (
                            <>
                              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mr-3"></div>
                              Looking up...
                            </>
                          ) : (
                            <>
                              <Users className="h-6 w-6 mr-3" />
                              LOOK UP MY REGISTRATION
                            </>
                          )}
                        </Button>
                      </>
                    ) : (
                      <div className="space-y-6">
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                          <h3 className="text-lg font-semibold text-blue-900 mb-4">
                            Found {lookupResult?.attendee_count} {lookupResult?.attendee_count === 1 ? 'Person' : 'People'}
                          </h3>
                          <div className="space-y-2 text-blue-800">
                            <p><strong>Registration Type:</strong> {lookupResult?.has_group_order ? 'Group Order' : 'Individual Registration(s)'}</p>
                            {lookupResult?.order_id && (
                              <p><strong>Order ID:</strong> {lookupResult.order_id}</p>
                            )}
                          </div>
                          
                          {lookupResult?.attendee_details && lookupResult.attendee_details.length > 0 && (
                            <div className="mt-4">
                              <h4 className="font-medium text-blue-900 mb-2">Attendees to activate:</h4>
                              <ul className="space-y-1">
                                {lookupResult.attendee_details.map((attendee: any, index: number) => (
                                  <li key={index} className="text-sm">
                                    {attendee.name}
                                    {attendee.is_activated && " ✅ (Already Activated)"}
                                    {attendee.rfid_uid && ` - RFID: ${attendee.rfid_uid}`}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                        
                        <div className="flex gap-3">
                          <Button 
                            onClick={handleConfirmActivation}
                            disabled={isProcessing}
                            className="flex-1"
                            size="lg"
                          >
                            {isProcessing ? "Activating..." : "Confirm Activation"}
                          </Button>
                          <Button 
                            onClick={() => setShowPreview(false)}
                            variant="outline"
                            className="flex-1"
                            size="lg"
                          >
                            Back
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Success Display */}
                    <div className="text-center space-y-4 p-6 bg-green-50 border border-green-200 rounded-lg">
                      <CheckCircle className="h-16 w-16 text-green-600 mx-auto" />
                      <div>
                        <h3 className="text-xl font-bold text-green-800">Activation Complete!</h3>
                        <p className="text-green-700">
                          Order #{activationResult.order_id || 'Individual'}
                        </p>
                        <div className="mt-2 text-lg">
                          <Badge variant="secondary" className="text-lg px-4 py-2">
                            <Users className="h-4 w-4 mr-2" />
                            {activationResult.activated_count} of {activationResult.total_attendees} Activated
                          </Badge>
                        </div>
                      </div>
                    </div>

                    {/* Group Members List */}
                    <div className="space-y-2">
                      <h4 className="font-semibold">Group Members:</h4>
                      {activationResult.attendee_details?.map((attendee, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                          <div>
                            <p className="font-medium">{attendee.name}</p>
                            <p className="text-sm text-muted-foreground">RFID: {attendee.rfid_uid}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            {attendee.was_already_active ? (
                              <Badge variant="outline">Already Active</Badge>
                            ) : (
                              <Badge variant="default" className="bg-green-600">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Activated
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    <Button onClick={resetForm} variant="outline" className="w-full">
                      Activate Another Group
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="staff" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Staff Assisted Mode
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="text-center py-8 space-y-4">
                  <p className="text-muted-foreground">
                    Staff can help with individual activations and troubleshooting
                  </p>
                  
                  <div className="space-y-4">
                    <Button
                      onClick={handleStaffActivation}
                      disabled={isProcessing}
                      size="lg"
                      className="w-full"
                      variant="outline"
                    >
                      Individual RFID Activation
                    </Button>

                    <Button
                      onClick={handleMassDeactivation}
                      disabled={isProcessing}
                      size="lg"
                      className="w-full"
                      variant="destructive"
                    >
                      <PowerOff className="h-5 w-5 mr-2" />
                      Sunday Mass Deactivation
                    </Button>
                    
                    <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-sm text-blue-800">
                        <strong>Need full staff tools?</strong> Visit the{" "}
                        <Button 
                          variant="link" 
                          className="p-0 h-auto text-blue-600 underline"
                          onClick={() => navigate("/staff-hub")}
                        >
                          Staff Hub
                        </Button>
                        {" "}for comprehensive activation and deactivation tools.
                      </p>
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