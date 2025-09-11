import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Search, UserCheck, Zap, LogOut, Phone, Mail, Hash } from "lucide-react";
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

const CheckIn = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<Attendee[]>([]);
  const [selectedAttendee, setSelectedAttendee] = useState<Attendee | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSearch = async () => {
    if (!searchTerm.trim()) return;
    
    setIsSearching(true);
    try {
      const { data, error } = await supabase
        .from('attendees')
        .select('*')
        .or(`first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%,regfox_id.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`)
        .limit(10);

      if (error) throw error;
      
      setSearchResults(data || []);
      if (data?.length === 0) {
        toast({
          title: "No results",
          description: "No attendees found matching your search.",
        });
      }
    } catch (error) {
      console.error('Search error:', error);
      toast({
        title: "Search Error",
        description: "Failed to search attendees. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleActivateRFID = async (attendeeId: string) => {
    // This would integrate with NFC/RFID activation
    toast({
      title: "RFID Activation",
      description: "Ready to activate RFID tag. Tap tag to device or enter UID manually.",
    });
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-secondary">Check-In Station</h1>
            <p className="text-muted-foreground">Attendee lookup and RFID activation</p>
          </div>
          <Button variant="outline" onClick={handleSignOut}>
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>

        {/* Search Section */}
        <Card className="mb-6">
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
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                className="flex-1"
              />
              <Button onClick={handleSearch} disabled={isSearching}>
                {isSearching ? "Searching..." : "Search"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Search Results */}
        {searchResults.length > 0 && (
          <Card className="mb-6">
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
                Actions for {selectedAttendee.first_name} {selectedAttendee.last_name}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button 
                  onClick={() => handleActivateRFID(selectedAttendee.id)}
                  className="h-20 text-lg"
                >
                  <UserCheck className="h-6 w-6 mr-2" />
                  Activate RFID Tag
                </Button>
                
                <Button 
                  variant="outline"
                  className="h-20 text-lg"
                  onClick={() => toast({
                    title: "Campsite Assignment",
                    description: "Campsite assignment feature coming soon.",
                  })}
                >
                  <Zap className="h-6 w-6 mr-2" />
                  Assign Campsite
                </Button>
              </div>

              {selectedAttendee.notes && (
                <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                  <Label className="text-sm font-medium">Notes</Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    {selectedAttendee.notes}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default CheckIn;