import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { User, Phone, Mail, CreditCard, Radio, Ticket, Utensils, Calendar, Camera, Usb } from "lucide-react";
import { formatPhoneNumber } from "@/lib/phoneUtils";
import { EnhancedRfidAssignmentCell } from "@/components/EnhancedRfidAssignmentCell";
import type { AttendeeData } from "@/pages/RfidAssignment";

interface MobileRfidAssignmentCardProps {
  attendee: AttendeeData;
  onAssignmentComplete?: () => void;
  onOptimisticUpdate?: (attendeeId: string, rfidUid: string | null, rfidStatus: string) => void;
}

export const MobileRfidAssignmentCard: React.FC<MobileRfidAssignmentCardProps> = ({
  attendee,
  onAssignmentComplete,
  onOptimisticUpdate
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const displayName = `${attendee.first_name} ${attendee.last_name}`.trim();
  const isActivated = !!attendee.activated_at;
  const hasRfid = !!attendee.rfid_uid;

  const getRfidStatusBadge = () => {
    if (isActivated) {
      return <Badge variant="default" className="text-xs bg-success text-success-foreground"><Radio className="h-3 w-3 mr-1" />Active</Badge>;
    }
    if (hasRfid) {
      return <Badge variant="secondary" className="text-xs bg-warning text-warning-foreground"><Radio className="h-3 w-3 mr-1" />Assigned</Badge>;
    }
    return <Badge variant="outline" className="text-xs text-muted-foreground"><Radio className="h-3 w-3 mr-1" />Unassigned</Badge>;
  };

  const getTicketTypeBadge = () => {
    if (!attendee.ticket_type) return null;
    const ticketLabel = attendee.ticket_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    return (
      <Badge variant="outline" className="text-xs bg-secondary/10 text-secondary border-secondary/20">
        <Ticket className="h-3 w-3 mr-1" />
        {ticketLabel}
      </Badge>
    );
  };

  const getMealPlanBadge = () => {
    if (!attendee.meal_plan) return null;
    const mealLabel = attendee.formatted_meal_plan || 'No Plan';
    return (
      <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/20">
        <Utensils className="h-3 w-3 mr-1" />
        {mealLabel}
      </Badge>
    );
  };

  const getArrivalDayBadge = () => {
    if (!attendee.arrival_day) return null;
    return (
      <Badge variant="outline" className="text-xs bg-accent/10 text-accent border-accent/20">
        <Calendar className="h-3 w-3 mr-1" />
        {attendee.arrival_day}
      </Badge>
    );
  };

  const getVeteranBadge = () => {
    if (!attendee.is_veteran) return null;
    return (
      <Badge variant="default" className="text-xs bg-blue-600 text-white">
        <Usb className="h-3 w-3 mr-1" />
        Veteran
      </Badge>
    );
  };

  return (
    <Card className="transition-all duration-200 touch-target">
      <CardContent className="mobile-card">
        <div className="space-y-4">
          {/* Header with Name and Main Status */}
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <h3 className="font-medium text-base truncate">{displayName}</h3>
              </div>
              
              {/* Primary Status Badge */}
              <div className="flex items-center gap-2">
                {getRfidStatusBadge()}
              </div>
            </div>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="ml-2 touch-target"
            >
              {isExpanded ? 'Less' : 'More'}
            </Button>
          </div>

          {/* Essential Contact Info - Always Visible */}
          <div className="space-y-2 text-sm">
            {attendee.phone && (
              <div className="flex items-center gap-2">
                <Phone className="h-3 w-3 text-muted-foreground" />
                <span className="font-mono">{formatPhoneNumber(attendee.phone)}</span>
              </div>
            )}
            
            {attendee.order_id && (
              <div className="flex items-center gap-2">
                <CreditCard className="h-3 w-3 text-muted-foreground" />
                <span className="font-mono text-xs">#{attendee.order_id}</span>
              </div>
            )}
          </div>

          {/* RFID Assignment Section - Always Visible */}
          <div className="border-t pt-4">
            <div className="mb-2">
              <span className="text-sm font-medium text-muted-foreground">RFID Assignment</span>
            </div>
            <EnhancedRfidAssignmentCell
              attendeeId={attendee.id}
              attendeeName={displayName}
              currentRfidUid={attendee.rfid_uid}
              currentRfidStatus={attendee.rfid_status}
              onAssignmentComplete={onAssignmentComplete}
              onOptimisticUpdate={onOptimisticUpdate}
            />
          </div>

          {/* Expanded Details */}
          {isExpanded && (
            <div className="border-t pt-4 space-y-4">
              {/* Additional Badges */}
              <div className="space-y-2">
                <span className="text-sm font-medium text-muted-foreground">Details</span>
                <div className="flex flex-wrap gap-2">
                  {getVeteranBadge()}
                  {getTicketTypeBadge()}
                  {getMealPlanBadge()}
                  {getArrivalDayBadge()}
                </div>
              </div>

              {/* Additional Contact Info */}
              {attendee.email && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-3 w-3 text-muted-foreground" />
                  <span className="truncate">{attendee.email}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};