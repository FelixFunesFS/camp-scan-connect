import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  User,
  Mail,
  Phone,
  MapPin,
  CreditCard,
  Calendar,
  Users,
  Activity,
  FileText,
  Zap,
  X
} from "lucide-react";
import { EnhancedAttendee } from "./StaffActivationHub";
import { formatPhoneNumber, formatMealPlan } from "@/lib/phoneUtils";

interface AttendeeDetailModalProps {
  attendee: EnhancedAttendee;
  trigger: React.ReactNode;
  onActivate?: (attendeeId: string) => void;
  onGroupActivate?: (orderAttendees: EnhancedAttendee[]) => void;
  allAttendees?: EnhancedAttendee[];
}

export function AttendeeDetailModal({ 
  attendee, 
  trigger, 
  onActivate, 
  onGroupActivate, 
  allAttendees = [] 
}: AttendeeDetailModalProps) {
  const [open, setOpen] = useState(false);

  const orderCompanions = allAttendees.filter(a => 
    a.order_id === attendee.order_id && a.id !== attendee.id && attendee.order_id
  );

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'activated': return 'default';
      case 'assigned': return 'secondary';
      default: return 'destructive';
    }
  };

  const getRfidStatusVariant = (status: string) => {
    switch (status) {
      case 'active': return 'default';
      case 'assigned': return 'secondary';
      default: return 'destructive';
    }
  };

  const handleActivate = () => {
    if (onActivate) {
      onActivate(attendee.id);
      setOpen(false);
    }
  };

  const handleGroupActivate = () => {
    if (onGroupActivate && attendee.order_id) {
      const orderAttendees = allAttendees.filter(a => a.order_id === attendee.order_id);
      onGroupActivate(orderAttendees);
      setOpen(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <User className="h-5 w-5" />
              {attendee.first_name} {attendee.last_name}
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={getStatusVariant(attendee.overall_status)}>
                {attendee.overall_status === 'activated' ? 'Active' :
                 attendee.overall_status === 'assigned' ? 'Pending' : 'No RFID'}
              </Badge>
              {attendee.is_veteran && (
                <Badge variant="outline">Veteran</Badge>
              )}
            </div>
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[70vh] pr-6">
          <div className="space-y-6">
            
            {/* Contact Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Contact Information
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span>{attendee.email || 'Not provided'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{attendee.phone ? formatPhoneNumber(attendee.phone) : 'Not provided'}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>{attendee.city ? `${attendee.city}, ${attendee.state}` : 'Not provided'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>Arrival: {attendee.arrival_day || 'Standard'}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Registration Details */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Registration Details
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div>
                    <span className="text-sm font-medium">Ticket Type:</span>
                    <Badge className="ml-2">{attendee.ticket_type}</Badge>
                  </div>
                  <div>
                    <span className="text-sm font-medium">Meal Plan:</span>
                    <Badge variant="outline" className="ml-2">
                      {formatMealPlan(attendee.meal_plan)}
                    </Badge>
                  </div>
                  <div>
                    <span className="text-sm font-medium">Waiver:</span>
                    <Badge variant={attendee.waiver_signed ? "default" : "destructive"} className="ml-2">
                      {attendee.waiver_signed ? "Signed" : "Pending"}
                    </Badge>
                  </div>
                </div>
                <div className="space-y-3">
                  <div>
                    <span className="text-sm font-medium">Order ID:</span>
                    <span className="ml-2 font-mono text-sm">{attendee.order_id || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-sm font-medium">RegFox ID:</span>
                    <span className="ml-2 font-mono text-sm">{attendee.regfox_id || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-sm font-medium">Registration:</span>
                    <Badge variant="outline" className="ml-2">
                      {attendee.registration_status}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* RFID Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  RFID Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div>
                      <span className="text-sm font-medium">RFID Status:</span>
                      <Badge variant={getRfidStatusVariant(attendee.rfid_status)} className="ml-2">
                        {attendee.rfid_status}
                      </Badge>
                    </div>
                    {attendee.rfid_uid && (
                      <div>
                        <span className="text-sm font-medium">RFID UID:</span>
                        <span className="ml-2 font-mono text-sm bg-muted px-2 py-1 rounded">
                          {attendee.rfid_uid}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    {attendee.activated_at && (
                      <div>
                        <span className="text-sm font-medium">Activated:</span>
                        <span className="ml-2 text-sm">
                          {new Date(attendee.activated_at).toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 pt-2">
                  {attendee.rfid_uid && !attendee.activated_at && (
                    <Button onClick={handleActivate} className="flex items-center gap-2">
                      <Zap className="h-4 w-4" />
                      Activate RFID
                    </Button>
                  )}
                  {attendee.is_group_order && attendee.order_id && (
                    <Button variant="outline" onClick={handleGroupActivate} className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Activate Group ({attendee.group_size})
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Activity History */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  Activity Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-3 bg-muted rounded-lg">
                  <div className="font-semibold text-lg">{attendee.bar_hits || 0}</div>
                  <div className="text-sm text-muted-foreground">Bar Visits</div>
                </div>
                <div className="text-center p-3 bg-muted rounded-lg">
                  <div className="font-semibold text-lg">
                    {attendee.has_headphones ? 'Yes' : 'No'}
                  </div>
                  <div className="text-sm text-muted-foreground">Headphones</div>
                </div>
                <div className="text-center p-3 bg-muted rounded-lg">
                  <div className="font-semibold text-lg">
                    {attendee.is_duplicate ? 'Yes' : 'No'}
                  </div>
                  <div className="text-sm text-muted-foreground">Duplicate Email</div>
                </div>
                <div className="text-center p-3 bg-muted rounded-lg">
                  <div className="font-semibold text-lg">
                    {attendee.is_phone_duplicate ? 'Yes' : 'No'}
                  </div>
                  <div className="text-sm text-muted-foreground">Duplicate Phone</div>
                </div>
              </CardContent>
            </Card>

            {/* Group/Order Information */}
            {attendee.is_group_order && orderCompanions.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Order Companions ({orderCompanions.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {orderCompanions.map((companion) => (
                      <div key={companion.id} className="flex items-center justify-between p-2 border rounded-lg">
                        <div className="flex-1">
                          <div className="font-medium">{companion.first_name} {companion.last_name}</div>
                          <div className="text-sm text-muted-foreground">
                            {companion.email} • {companion.phone ? formatPhoneNumber(companion.phone) : 'No phone'}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Badge variant={getStatusVariant(companion.overall_status)}>
                            {companion.overall_status === 'activated' ? 'Active' :
                             companion.overall_status === 'assigned' ? 'Pending' : 'No RFID'}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Notes */}
            {attendee.notes && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Notes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm whitespace-pre-wrap">{attendee.notes}</p>
                </CardContent>
              </Card>
            )}

            {/* Special Accommodations */}
            {attendee.special_accommodations && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Special Accommodations
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm whitespace-pre-wrap">{attendee.special_accommodations}</p>
                </CardContent>
              </Card>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}