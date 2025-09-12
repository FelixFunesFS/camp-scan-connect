import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { Search, UserCheck, ArrowLeft, Phone, Mail, Hash, Loader2, CheckCircle, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

interface Attendee {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  regfox_id: string;
  ticket_type: string;
  notes: string;
}

const ParkingActivation = () => {
  const [isStaffMode, setIsStaffMode] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [phone, setPhone] = useState("");
  const [searchResults, setSearchResults] = useState<Attendee[]>([]);
  const [selectedAttendee, setSelectedAttendee] = useState<Attendee | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isActivated, setIsActivated] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { toast } = useToast();

  const resetState = () => {
    setSearchTerm("");
    setPhone("");
    setSearchResults([]);
    setSelectedAttendee(null);
    setError("");
    setIsActivated(false);
  };

  const handleModeToggle = (checked: boolean) => {
    setIsStaffMode(checked);
    resetState();
  };

  // Staff mode - advanced search
  const handleStaffSearch = async () => {
    if (!searchTerm.trim()) return;
    
    setIsLoading(true);
    setError("");
    try {
      const { data, error } = await supabase
        .from('attendees')
        .select('*')
        .or(`first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%,regfox_id.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`)
        .limit(10);

      if (error) throw error;
      
      setSearchResults(data || []);
      if (data?.length === 0) {
        setError("No attendees found matching your search.");
      }
    } catch (error) {
      console.error('Search error:', error);
      setError("Failed to search attendees. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Self-service mode - phone lookup
  const handleSelfLookup = async (e: React.FormEvent) => {
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

      setSelectedAttendee(data);
    } catch (error) {
      console.error('Lookup error:', error);
      setError("An error occurred. Please try again or contact event staff.");
    } finally {
      setIsLoading(false);
    }
  };

  // Check if RFID already exists for attendee
  const checkExistingRFID = async (attendeeId: string) => {
    const { data } = await supabase
      .from('rfid_tags')
      .select('uid, status')
      .eq('attendee_id', attendeeId)
      .eq('status', 'active')
      .single();
    
    return data;
  };

  // Unified activation logic
  const handleActivate = async () => {
    if (!selectedAttendee) return;

    setIsLoading(true);
    setError("");

    try {
      // Check for existing active RFID
      const existingRFID = await checkExistingRFID(selectedAttendee.id);
      if (existingRFID) {
        setError(`RFID already activated with UID: ${existingRFID.uid}`);
        setIsLoading(false);
        return;
      }

      // Generate unique RFID UID
      const uidPrefix = isStaffMode ? 'STAFF' : 'SELF';
      const mockUID = `${uidPrefix}_${Date.now()}`;
      
      // Insert RFID tag
      const { error: tagError } = await supabase
        .from('rfid_tags')
        .insert({
          uid: mockUID,
          attendee_id: selectedAttendee.id,
          status: 'active',
          issued_at: new Date().toISOString()
        });

      if (tagError) throw tagError;

      // Log activation transaction
      const { error: transactionError } = await supabase
        .from('station_transactions')
        .insert({
          attendee_id: selectedAttendee.id,
          rfid_uid: mockUID,
          station_type: 'activation',
          transaction_type: 'activate',
          current_status: 'active',
          extra_data: {
            activation_method: isStaffMode ? 'staff_assisted' : 'self_service',
            activated_by: isStaffMode ? 'parking_staff' : 'attendee'
          }
        });

      if (transactionError) throw transactionError;

      setIsActivated(true);
      toast({
        title: "Success!",
        description: `RFID wristband activated for ${selectedAttendee.first_name} ${selectedAttendee.last_name}`,
      });
    } catch (error) {
      console.error('Activation error:', error);
      setError("Failed to activate RFID tag. Please contact event staff.");
    } finally {
      setIsLoading(false);
    }
  };

  const getTicketTypeBadge = (ticketType: string) => {
    const variants: Record<string, "default" | "destructive" | "outline" | "secondary"> = {
      premium_power: "default",
      dry_site: "secondary", 
      day_pass: "outline",
      staff: "destructive",
      vendor: "secondary"
    };
    return variants[ticketType] || "outline";
  };

  // Success screen
  if (isActivated && selectedAttendee) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5 p-4 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <CardTitle className="text-2xl text-green-700">Activation Complete!</CardTitle>
            <CardDescription>
              Welcome to Melanated Campout 2025, {selectedAttendee.first_name}!
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            <div className="p-4 bg-green-50 rounded-lg">
              <p className="text-sm text-green-800 font-medium">
                RFID wristband is now active and ready to use at all stations.
              </p>
            </div>
            
            <div className="text-sm text-muted-foreground space-y-2">
              <p>✓ Meal station access enabled</p>
              <p>✓ Drinks station access enabled</p>
              <p>✓ Headphones station access enabled</p>
              <p>✓ Activity areas enabled</p>
              {selectedAttendee.ticket_type === 'premium_power' && (
                <p>✓ Power zone access enabled</p>
              )}
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => {
                resetState();
                setIsActivated(false);
              }} className="flex-1">
                Activate Another
              </Button>
              <Button onClick={() => navigate("/")} className="flex-1">
                Return to Home
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-secondary">Parking Activation</h1>
            <p className="text-muted-foreground">RFID wristband activation for attendees</p>
          </div>
          <Button variant="outline" onClick={() => navigate("/")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Button>
        </div>

        {/* Mode Toggle */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Activation Mode
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <Label htmlFor="mode-toggle">Self-Service</Label>
              <Switch
                id="mode-toggle"
                checked={isStaffMode}
                onCheckedChange={handleModeToggle}
              />
              <Label htmlFor="mode-toggle">Staff-Assisted</Label>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              {isStaffMode 
                ? "Advanced search for staff to help attendees with activation"
                : "Simple phone lookup for attendees to activate themselves"
              }
            </p>
          </CardContent>
        </Card>

        {/* Self-Service Mode */}
        {!isStaffMode ? (
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
              {!selectedAttendee ? (
                <form onSubmit={handleSelfLookup} className="space-y-4">
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
                      {selectedAttendee.first_name} {selectedAttendee.last_name}
                    </h3>
                    <div className="space-y-1 text-sm text-muted-foreground">
                      <p>Email: {selectedAttendee.email}</p>
                      <p>RegFox ID: {selectedAttendee.regfox_id}</p>
                      <p>Ticket Type: {selectedAttendee.ticket_type.replace('_', ' ')}</p>
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
                        setSelectedAttendee(null);
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
        ) : (
          /* Staff-Assisted Mode */
          <div className="space-y-6">
            {/* Search Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Search className="h-5 w-5" />
                  Search Attendees
                </CardTitle>
                <CardDescription>
                  Search by name, phone number, email, or RegFox ID
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter name, phone, email, or RegFox ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleStaffSearch()}
                    className="flex-1"
                  />
                  <Button onClick={handleStaffSearch} disabled={isLoading}>
                    {isLoading ? "Searching..." : "Search"}
                  </Button>
                </div>
                {error && (
                  <Alert variant="destructive" className="mt-4">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>

            {/* Search Results */}
            {searchResults.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Search Results ({searchResults.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {searchResults.map((attendee) => (
                      <div
                        key={attendee.id}
                        className={`p-4 border rounded-lg cursor-pointer transition-colors hover:bg-muted/50 ${
                          selectedAttendee?.id === attendee.id ? 'bg-muted border-primary' : ''
                        }`}
                        onClick={() => setSelectedAttendee(attendee)}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-semibold text-lg">
                              {attendee.first_name} {attendee.last_name}
                            </h3>
                            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mt-1">
                              {attendee.phone && (
                                <span className="flex items-center gap-1">
                                  <Phone className="h-3 w-3" />
                                  {attendee.phone}
                                </span>
                              )}
                              {attendee.email && (
                                <span className="flex items-center gap-1">
                                  <Mail className="h-3 w-3" />
                                  {attendee.email}
                                </span>
                              )}
                              {attendee.regfox_id && (
                                <span className="flex items-center gap-1">
                                  <Hash className="h-3 w-3" />
                                  {attendee.regfox_id}
                                </span>
                              )}
                            </div>
                          </div>
                          <Badge variant={getTicketTypeBadge(attendee.ticket_type)}>
                            {attendee.ticket_type.replace('_', ' ')}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Selected Attendee Actions */}
            {selectedAttendee && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <UserCheck className="h-5 w-5 text-secondary" />
                    Activate RFID for {selectedAttendee.first_name} {selectedAttendee.last_name}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <Button 
                      onClick={handleActivate}
                      disabled={isLoading}
                      className="w-full h-16 text-lg"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-6 w-6 animate-spin" />
                          Activating...
                        </>
                      ) : (
                        <>
                          <UserCheck className="h-6 w-6 mr-2" />
                          Activate RFID Wristband
                        </>
                      )}
                    </Button>

                    {selectedAttendee.notes && (
                      <div className="p-3 bg-muted/50 rounded-lg">
                        <Label className="text-sm font-medium">Notes</Label>
                        <p className="text-sm text-muted-foreground mt-1">
                          {selectedAttendee.notes}
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ParkingActivation;