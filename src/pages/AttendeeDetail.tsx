import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, User, Phone, Mail, MapPin, Calendar, Clock, CreditCard, QrCode, Activity, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AttendeeProfile {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  order_id: string;
  regfox_id: string;
  ticket_type: string;
  registration_status: string;
  meal_plan: string;
  arrival_window: string;
  early_access: boolean;
  waiver_signed: boolean;
  is_veteran: boolean;
  date_of_birth: string;
  gender: string;
  marital_status: string;
  street_address: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  special_accommodations: string;
  dietary_restrictions: string;
  t_shirt_size: string;
  custom_fields: any;
  additional_guests: any;
  created_at: string;
  updated_at: string;
  activated_at: string;
  veteran_thanked_at: string;
}

interface RfidTag {
  uid: string;
  status: string;
  issued_at: string;
  activated_at: string;
  deactivated_at: string;
  activation_method: string;
  reason: string;
}

interface StationTransaction {
  id: string;
  station_type: string;
  transaction_type: string;
  created_at: string;
  daily_count: number;
  current_status: string;
  extra_data: any;
  staff_id: string;
  activation_method: string;
}

interface GroupMember {
  id: string;
  first_name: string;
  last_name: string;
  phone: string;
  ticket_type: string;
  registration_status: string;
  activated_at: string;
}

export default function AttendeeDetail() {
  const { id } = useParams<{ id: string }>();
  const [attendee, setAttendee] = useState<AttendeeProfile | null>(null);
  const [rfidTag, setRfidTag] = useState<RfidTag | null>(null);
  const [transactions, setTransactions] = useState<StationTransaction[]>([]);
  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchAttendeeData();
    }
  }, [id]);

  const fetchAttendeeData = async () => {
    try {
      setLoading(true);

      // Fetch attendee profile
      const { data: attendeeData, error: attendeeError } = await supabase
        .from("attendees")
        .select("*")
        .eq("id", id)
        .single();

      if (attendeeError) throw attendeeError;
      setAttendee(attendeeData);

      // Fetch credential
      const { data: rfidData, error: rfidError } = await supabase
        .from("rfid_tags")
        .select("*")
        .eq("attendee_id", id)
        .maybeSingle();

      if (rfidError && rfidError.code !== "PGRST116") throw rfidError;
      setRfidTag(rfidData);

      // Fetch station transactions
      const { data: transactionData, error: transactionError } = await supabase
        .from("station_transactions")
        .select("*")
        .eq("attendee_id", id)
        .order("created_at", { ascending: false });

      if (transactionError) throw transactionError;
      setTransactions(transactionData || []);

      // Fetch group members if order_id exists
      if (attendeeData?.order_id) {
        const { data: groupData, error: groupError } = await supabase
          .from("attendees")
          .select("id, first_name, last_name, phone, ticket_type, registration_status, activated_at")
          .eq("order_id", attendeeData.order_id)
          .neq("id", id);

        if (groupError) throw groupError;
        setGroupMembers(groupData || []);
      }

    } catch (error) {
      console.error("Error fetching attendee data:", error);
      toast.error("Failed to load attendee details");
    } finally {
      setLoading(false);
    }
  };

  const formatCustomFields = (customFields: any) => {
    if (!customFields || typeof customFields !== 'object') return [];
    return Object.entries(customFields).filter(([key, value]) => value !== null && value !== "");
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'registered': return 'bg-blue-500/10 text-blue-600 border-blue-200';
      case 'checked_in': return 'bg-green-500/10 text-green-600 border-green-200';
      case 'cancelled': return 'bg-red-500/10 text-red-600 border-red-200';
      case 'active': return 'bg-green-500/10 text-green-600 border-green-200';
      case 'inactive': return 'bg-gray-500/10 text-gray-600 border-gray-200';
      default: return 'bg-gray-500/10 text-gray-600 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!attendee) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">Attendee not found</p>
            <Link to="/reports">
              <Button variant="outline" className="mt-4">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Reports
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to="/reports">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Reports
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">{attendee.first_name} {attendee.last_name}</h1>
          <p className="text-muted-foreground">Order ID: {attendee.order_id}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Personal Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Personal Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="font-medium text-muted-foreground">Email</p>
                <p className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  {attendee.email || "Not provided"}
                </p>
              </div>
              <div>
                <p className="font-medium text-muted-foreground">Phone</p>
                <p className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  {attendee.phone || "Not provided"}
                </p>
              </div>
              <div>
                <p className="font-medium text-muted-foreground">Date of Birth</p>
                <p className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {attendee.date_of_birth ? new Date(attendee.date_of_birth).toLocaleDateString() : "Not provided"}
                </p>
              </div>
              <div>
                <p className="font-medium text-muted-foreground">Gender</p>
                <p>{attendee.gender || "Not provided"}</p>
              </div>
              <div>
                <p className="font-medium text-muted-foreground">T-Shirt Size</p>
                <p>{attendee.t_shirt_size || "Not provided"}</p>
              </div>
              <div>
                <p className="font-medium text-muted-foreground">Veteran Status</p>
                <Badge variant={attendee.is_veteran ? "veteran" : "secondary"}>
                  {attendee.is_veteran ? "Veteran" : "Civilian"}
                </Badge>
              </div>
            </div>

            {attendee.special_accommodations && (
              <>
                <Separator />
                <div>
                  <p className="font-medium text-muted-foreground mb-2">Special Accommodations</p>
                  <p className="text-sm">{attendee.special_accommodations}</p>
                </div>
              </>
            )}

            {attendee.dietary_restrictions && (
              <div>
                <p className="font-medium text-muted-foreground mb-2">Dietary Restrictions</p>
                <p className="text-sm">{attendee.dietary_restrictions}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Registration Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Registration Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 text-sm">
              <div>
                <p className="font-medium text-muted-foreground">Registration Status</p>
                <Badge className={getStatusColor(attendee.registration_status)}>
                  {attendee.registration_status}
                </Badge>
              </div>
              <div>
                <p className="font-medium text-muted-foreground">Ticket Type</p>
                <Badge variant="outline">{attendee.ticket_type}</Badge>
              </div>
              <div>
                <p className="font-medium text-muted-foreground">Meal Plan</p>
                <p>{attendee.meal_plan || "Not selected"}</p>
              </div>
              <div>
                <p className="font-medium text-muted-foreground">Arrival Window</p>
                <p>{attendee.arrival_window || "Standard"}</p>
              </div>
              <div>
                <p className="font-medium text-muted-foreground">Early Access</p>
                <Badge variant={attendee.early_access ? "default" : "secondary"}>
                  {attendee.early_access ? "Yes" : "No"}
                </Badge>
              </div>
              <div>
                <p className="font-medium text-muted-foreground">Waiver Signed</p>
                <Badge variant={attendee.waiver_signed ? "default" : "destructive"}>
                  {attendee.waiver_signed ? "Signed" : "Not Signed"}
                </Badge>
              </div>
            </div>

            <Separator />

            <div className="text-sm">
              <p className="font-medium text-muted-foreground">RegFox ID</p>
              <p className="font-mono text-xs">{attendee.regfox_id}</p>
            </div>

            <div className="text-sm">
              <p className="font-medium text-muted-foreground">Registration Date</p>
              <p className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                {new Date(attendee.created_at).toLocaleString()}
              </p>
            </div>

            {attendee.activated_at && (
              <div className="text-sm">
                <p className="font-medium text-muted-foreground">Activated Date</p>
                <p className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  {new Date(attendee.activated_at).toLocaleString()}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* RFID Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5" />
              RFID Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {rfidTag ? (
              <div className="space-y-4">
                <div>
                  <p className="font-medium text-muted-foreground">Code</p>
                  <p className="font-mono text-sm">{rfidTag.uid}</p>
                </div>
                <div>
                  <p className="font-medium text-muted-foreground">Status</p>
                  <Badge className={getStatusColor(rfidTag.status)}>
                    {rfidTag.status}
                  </Badge>
                </div>
                {rfidTag.issued_at && (
                  <div>
                    <p className="font-medium text-muted-foreground">Issued At</p>
                    <p className="text-sm">{new Date(rfidTag.issued_at).toLocaleString()}</p>
                  </div>
                )}
                {rfidTag.activated_at && (
                  <div>
                    <p className="font-medium text-muted-foreground">Activated At</p>
                    <p className="text-sm">{new Date(rfidTag.activated_at).toLocaleString()}</p>
                  </div>
                )}
                {rfidTag.activation_method && (
                  <div>
                    <p className="font-medium text-muted-foreground">Activation Method</p>
                    <p className="text-sm">{rfidTag.activation_method}</p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">No credential assigned</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Address Information */}
      {(attendee.street_address || attendee.city || attendee.state) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Address Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm space-y-1">
              {attendee.street_address && <p>{attendee.street_address}</p>}
              <p>
                {[attendee.city, attendee.state, attendee.postal_code].filter(Boolean).join(", ")}
              </p>
              {attendee.country && <p>{attendee.country}</p>}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Emergency Contact */}
      {(attendee.emergency_contact_name || attendee.emergency_contact_phone) && (
        <Card>
          <CardHeader>
            <CardTitle>Emergency Contact</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="font-medium text-muted-foreground">Name</p>
                <p>{attendee.emergency_contact_name || "Not provided"}</p>
              </div>
              <div>
                <p className="font-medium text-muted-foreground">Phone</p>
                <p>{attendee.emergency_contact_phone || "Not provided"}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Group Members */}
      {groupMembers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Group Members ({groupMembers.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {groupMembers.map((member) => (
                <Link key={member.id} to={`/attendee/${member.id}`}>
                  <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                    <div>
                      <p className="font-medium">{member.first_name} {member.last_name}</p>
                      <p className="text-sm text-muted-foreground">{member.phone}</p>
                    </div>
                    <div className="text-right">
                      <Badge variant="outline" className="mb-1">
                        {member.ticket_type}
                      </Badge>
                      <p className="text-xs text-muted-foreground">
                        {member.activated_at ? "Activated" : "Not activated"}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Station Activity */}
      {transactions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Station Activity ({transactions.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {transactions.map((transaction) => (
                <div key={transaction.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">{transaction.station_type}</p>
                    <p className="text-sm text-muted-foreground">{transaction.transaction_type}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm">{new Date(transaction.created_at).toLocaleString()}</p>
                    {transaction.current_status && (
                      <Badge variant="outline" className="text-xs">
                        {transaction.current_status}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Custom Fields */}
      {formatCustomFields(attendee.custom_fields).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Custom Fields</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              {formatCustomFields(attendee.custom_fields).map(([key, value]) => (
                <div key={key}>
                  <p className="font-medium text-muted-foreground">{key}</p>
                  <p>{String(value)}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Additional Guests */}
      {attendee.additional_guests && Array.isArray(attendee.additional_guests) && attendee.additional_guests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Additional Guests</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {attendee.additional_guests.map((guest: any, index: number) => (
                <div key={index} className="p-3 border rounded-lg">
                  <p className="font-medium">{guest.name || `Guest ${index + 1}`}</p>
                  {guest.details && <p className="text-sm text-muted-foreground">{guest.details}</p>}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}