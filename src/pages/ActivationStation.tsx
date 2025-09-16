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
import { formatPhoneNumber } from "@/lib/phoneUtils";
import { RfidManagementPanel } from "@/components/RfidManagementPanel";

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
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="self-service">Phone Number Activation</TabsTrigger>
            <TabsTrigger value="rfid">RFID Management</TabsTrigger>
            <TabsTrigger value="admin">Admin Controls</TabsTrigger>
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
                          {phoneNumber && phoneNumber.length > 0 && (
                            <p className="text-sm font-medium text-primary">
                              {formatPhoneNumber(phoneNumber)}
                            </p>
                          )}
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
                          <div className="mb-4">
                            <h3 className="text-lg font-semibold text-blue-900">
                              Phone: {formatPhoneNumber(phoneNumber)}
                            </h3>
                            <p className="text-blue-800">
                              Found {lookupResult?.attendee_count} {lookupResult?.attendee_count === 1 ? 'Person' : 'People'}
                            </p>
                          </div>
                          <div className="space-y-2 text-blue-800">
                            <p><strong>Registration Type:</strong> {lookupResult?.has_group_order ? 'Group Order' : 'Individual Registration(s)'}</p>
                            {lookupResult?.order_id && (
                              <p><strong>Order ID:</strong> {lookupResult.order_id}</p>
                            )}
                          </div>
                          
                          {/* Show all attendees in the group/lookup */}
                          <div className="mt-4 space-y-2">
                            <h4 className="font-semibold text-blue-900">Attendees to be activated:</h4>
                            <div className="space-y-1">
                              {lookupResult?.attendee_details?.map((attendee: any, index: number) => (
                                <div key={index} className="flex items-center justify-between text-sm bg-white/50 p-2 rounded">
                                  <span className="font-medium">{attendee.name}</span>
                                  <div className="flex items-center gap-2">
                                    {attendee.rfid_uid && (
                                      <span className="text-xs bg-blue-200 px-2 py-1 rounded">
                                        {attendee.rfid_uid.startsWith('MOCK') ? 'Mock RFID' : 'RFID'}: {attendee.rfid_uid}
                                      </span>
                                    )}
                                    {attendee.is_activated ? (
                                      <span className="text-xs bg-green-200 text-green-800 px-2 py-1 rounded">Already Active</span>
                                    ) : (
                                      <span className="text-xs bg-yellow-200 text-yellow-800 px-2 py-1 rounded">Pending</span>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
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
                        <p className="text-green-700 font-medium">
                          Phone: {formatPhoneNumber(phoneNumber)}
                        </p>
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

                    {/* Activated Attendees List */}
                    <div className="space-y-4">
                      <h4 className="font-semibold text-green-800">Activated Attendees:</h4>
                      <div className="space-y-2">
                        {activationResult.attendee_details?.map((attendee: any, index: number) => (
                          <div key={index} className="flex items-center justify-between bg-white/50 p-3 rounded-lg">
                            <span className="font-medium">{attendee.name}</span>
                            <div className="flex items-center gap-2">
                              {attendee.rfid_uid ? (
                                <span className={`text-xs px-2 py-1 rounded ${
                                  attendee.rfid_uid.startsWith('MOCK') 
                                    ? 'bg-blue-200 text-blue-800' 
                                    : 'bg-green-200 text-green-800'
                                }`}>
                                  {attendee.rfid_uid.startsWith('MOCK') ? 'Mock RFID' : 'RFID'}: {attendee.rfid_uid}
                                </span>
                              ) : (
                                <span className="text-xs bg-orange-200 text-orange-800 px-2 py-1 rounded">
                                  No RFID
                                </span>
                              )}
                              {attendee.was_already_active ? (
                                <span className="text-xs bg-blue-200 text-blue-800 px-2 py-1 rounded">
                                  Previously Active
                                </span>
                              ) : (
                                <span className="text-xs bg-green-200 text-green-800 px-2 py-1 rounded">
                                  Just Activated
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      {/* Show warning if some attendees don't have RFIDs */}
                      {activationResult.attendee_details?.some((attendee: any) => !attendee.has_rfid) && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                          <p className="text-sm text-yellow-800">
                            <strong>Note:</strong> Some attendees don't have RFID tags assigned yet. 
                            Generate mock RFIDs for testing or assign real ones before the event.
                          </p>
                        </div>
                      )}
                    </div>

                    <Button onClick={resetForm} variant="outline" className="w-full">
                      Activate Another Group
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="rfid" className="space-y-6">
            <RfidManagementPanel />
          </TabsContent>

          <TabsContent value="admin" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PowerOff className="h-5 w-5" />
                  Admin Controls
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button
                  onClick={handleMassDeactivation}
                  disabled={isProcessing}
                  variant="destructive"
                  className="w-full"
                >
                  {isProcessing ? "Processing..." : "Mass Deactivate All RFIDs"}
                </Button>
                <p className="text-sm text-muted-foreground">
                  This will deactivate all currently active RFID tags. Use this at the end of the event.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}