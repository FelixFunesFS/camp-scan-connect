import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, Phone, Loader2, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

const SelfActivate = () => {
  const [phone, setPhone] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [attendee, setAttendee] = useState<any>(null);
  const [isActivated, setIsActivated] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim()) return;

    setIsLoading(true);
    setError("");
    
    try {
      const { data, error } = await supabase
        .from('attendees')
        .select('*')
        .eq('phone', phone.trim())
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          setError("Phone number not found. Please check your number or contact event staff.");
        } else {
          throw error;
        }
        return;
      }

      setAttendee(data);
    } catch (error) {
      console.error('Lookup error:', error);
      setError("An error occurred. Please try again or contact event staff.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleActivate = async () => {
    if (!attendee) return;

    setIsLoading(true);
    try {
      // Generate a mock RFID UID for demo
      const mockUID = `SELF_${Date.now()}`;
      
      // Insert RFID tag
      const { error: tagError } = await supabase
        .from('rfid_tags')
        .insert({
          uid: mockUID,
          attendee_id: attendee.id,
          status: 'active',
          issued_at: new Date().toISOString()
        });

      if (tagError) throw tagError;

      // For now, we'll simulate logging (activation_log table not in current schema)
      console.log('Activation logged:', {
        phone: phone,
        name: `${attendee.first_name} ${attendee.last_name}`,
        regfox_id: attendee.regfox_id,
        rfid_uid: mockUID,
        status: 'Active',
        actor: 'Self-Service'
      });

      setIsActivated(true);
      toast({
        title: "Success!",
        description: "Your RFID wristband has been activated.",
      });
    } catch (error) {
      console.error('Activation error:', error);
      setError("Failed to activate RFID tag. Please contact event staff.");
    } finally {
      setIsLoading(false);
    }
  };

  if (isActivated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5 p-4 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <CardTitle className="text-2xl text-green-700">Activation Complete!</CardTitle>
            <CardDescription>
              Welcome to Melanated Campout 2025, {attendee?.first_name}!
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            <div className="p-4 bg-green-50 rounded-lg">
              <p className="text-sm text-green-800 font-medium">
                Your RFID wristband is now active and ready to use at all stations.
              </p>
            </div>
            
            <div className="text-sm text-muted-foreground space-y-2">
              <p>✓ Gate access enabled</p>
              <p>✓ Meal station access enabled</p>
              <p>✓ Activity areas enabled</p>
              {attendee?.ticket_type === 'premium_power' && (
                <p>✓ Power zone access enabled</p>
              )}
            </div>

            <Button onClick={() => navigate("/")} className="w-full">
              Return to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5 p-4 flex items-center justify-center">
      <div className="w-full max-w-md">
        <Button
          variant="ghost"
          onClick={() => navigate("/")}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Home
        </Button>

        <Card>
          <CardHeader className="text-center">
            <div className="flex items-center justify-center mb-4">
              <img 
                src="/lovable-uploads/99c12b37-6cab-446c-a8f9-0ede24e2a6f2.png" 
                alt="Melanated Campout"
                className="h-12 w-auto"
              />
            </div>
            <CardTitle className="text-2xl">Activate Your Wristband</CardTitle>
            <CardDescription>
              Enter your phone number to activate your RFID wristband
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!attendee ? (
              <form onSubmit={handleLookup} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="555-123-4567"
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Look Up Registration
                </Button>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="p-4 border rounded-lg bg-muted/50">
                  <h3 className="font-semibold text-lg mb-2">
                    {attendee.first_name} {attendee.last_name}
                  </h3>
                  <div className="space-y-1 text-sm text-muted-foreground">
                    <p>Email: {attendee.email}</p>
                    <p>RegFox ID: {attendee.regfox_id}</p>
                    <p>Ticket Type: {attendee.ticket_type.replace('_', ' ')}</p>
                  </div>
                </div>

                <div className="text-sm text-muted-foreground">
                  <p>Is this your registration? Click activate to enable your RFID wristband.</p>
                </div>

                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setAttendee(null);
                      setPhone("");
                      setError("");
                    }}
                    className="flex-1"
                  >
                    Not Me
                  </Button>
                  <Button 
                    onClick={handleActivate}
                    disabled={isLoading}
                    className="flex-1"
                  >
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Activate RFID
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SelfActivate;