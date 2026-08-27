import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { User, Phone, Mail, CreditCard, X, Utensils, Calendar, Radio, Ticket, Headphones } from "lucide-react";
import { formatPhoneNumber, formatMealPlan } from "@/lib/phoneUtils";
import type { NotificationState, FlexibleAttendeeData } from "@/types/attendee";

interface MobileAttendeeCardProps {
  attendee: FlexibleAttendeeData & {
    headphones_status?: 'checked_out' | 'checked_in' | 'never_used';
    headphones_duration?: number;
  };
  type?: 'direct' | 'companion' | 'standard';
  notificationState?: NotificationState;
  notificationMessage?: string;
  showNotification?: boolean;
  onViewDetails?: () => void;
  onDismissNotification?: () => void;
  backgroundColor?: string;
  className?: string;
}

export const MobileAttendeeCard: React.FC<MobileAttendeeCardProps> = ({
  attendee,
  type = 'standard',
  notificationState = 'idle',
  notificationMessage,
  showNotification,
  onViewDetails,
  onDismissNotification,
  backgroundColor,
  className = ""
}) => {
  // Debug: Log the attendee data to see what's being passed
  console.log('MobileAttendeeCard received attendee:', {
    name: attendee.name,
    ticket_type: attendee.ticket_type,
    meal_plan: attendee.meal_plan,
    arrival_window: attendee.arrival_window,
    full_attendee: attendee
  });

  const displayName = attendee.name || `${attendee.first_name || ''} ${attendee.last_name || ''}`.trim();
  const isActivated = attendee.is_activated || attendee.activated_at;
  const hasRfid = attendee.has_rfid || attendee.rfid_uid;

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

  const getVeteranBadge = () => {
    if (!attendee.is_veteran) return null;
    
    return (
      <Badge variant="veteran" className="text-xs">
        🇺🇸 Veteran
      </Badge>
    );
  };

  const getMealPlanBadge = () => {
    if (!attendee.meal_plan) return null;
    return (
      <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/20">
        <Utensils className="h-3 w-3 mr-1" />
        {formatMealPlan(attendee.meal_plan)}
      </Badge>
    );
  };

  const getArrivalDayBadge = () => {
    if (!attendee.arrival_window) return null;
    const arrivalLabel = attendee.arrival_window === 'early' ? 'Thursday' : 
                        attendee.arrival_window === 'standard' ? 'Friday' : 
                        attendee.arrival_window;
    return (
      <Badge variant="outline" className="text-xs bg-accent/10 text-accent border-accent/20">
        <Calendar className="h-3 w-3 mr-1" />
        {arrivalLabel}
      </Badge>
    );
  };

  const getHeadphonesBadge = () => {
    if (attendee.headphones_status === 'checked_out') {
      const duration = attendee.headphones_duration || 0;
      const isLong = duration > 180;
      const formatDuration = (minutes: number) => {
        if (minutes < 60) return `${minutes}m`;
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
      };
      return (
        <Badge variant={isLong ? "destructive" : "secondary"} className="text-xs">
          <Headphones className="h-3 w-3 mr-1" />
          Out ({formatDuration(duration)})
        </Badge>
      );
    }
    if (attendee.headphones_status === 'checked_in') {
      return (
        <Badge variant="outline" className="text-xs bg-success/10 text-success border-success/20">
          <Headphones className="h-3 w-3 mr-1" />
          Available
        </Badge>
      );
    }
    if (attendee.headphones_status === 'never_used') {
      return (
        <Badge variant="outline" className="text-xs text-muted-foreground">
          <Headphones className="h-3 w-3 mr-1" />
          Never Used
        </Badge>
      );
    }
    return null;
  };

  const getTypeIndicator = () => {
    if (type === 'companion') return <Badge variant="secondary" className="text-xs">Order Companion</Badge>;
    return null;
  };

  return (
    <Card className={`mobile-card transition-all duration-200 hover:shadow-md ${className}`} style={backgroundColor ? { backgroundColor } : undefined}>
      <CardContent className="p-3 sm:p-4">
        <div className="space-y-3">
          {/* Notification Banner */}
          {showNotification && notificationMessage && (
            <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg">
              <div className="mobile-stack items-start">
                <span className="text-sm text-primary flex-1">{notificationMessage}</span>
                {onDismissNotification && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onDismissNotification}
                    className="touch-target flex-shrink-0"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Header */}
          <div className="mobile-stack items-start">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <h3 className="mobile-title truncate-title">{displayName || 'Unknown'}</h3>
              </div>
              
              {/* Status and Info Badges */}
              <div className="space-y-2">
                <div className="badge-row">
                  {getTypeIndicator()}
                  {getRfidStatusBadge()}
                </div>
                <div className="badge-row">
                  {getTicketTypeBadge()}
                  {getVeteranBadge()}
                  {getMealPlanBadge()}
                  {getArrivalDayBadge()}
                  {getHeadphonesBadge()}
                </div>
              </div>
            </div>
          </div>

          {/* Contact Info */}
          <div className="space-y-2 text-sm">
            {attendee.phone && (
              <div className="flex items-center gap-2">
                <Phone className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                <span className="font-mono truncate">{formatPhoneNumber(attendee.phone)}</span>
              </div>
            )}
            
            {attendee.email && (
              <div className="flex items-center gap-2">
                <Mail className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                <span className="truncate">{attendee.email}</span>
              </div>
            )}

            {attendee.order_id && (
              <div className="flex items-center gap-2">
                <CreditCard className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                <span className="font-mono text-xs">#{attendee.order_id}</span>
              </div>
            )}
          </div>

          {/* Action Button */}
          {onViewDetails && (
            <Button
              variant="outline"
              size="sm"
              onClick={onViewDetails}
              className="w-full touch-target text-xs sm:text-sm"
            >
              View Full Details
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};