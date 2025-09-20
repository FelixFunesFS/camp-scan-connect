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
    <Card className={`transition-all duration-200 ${className}`} style={backgroundColor ? { backgroundColor } : undefined}>
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* Notification Banner */}
          {showNotification && notificationMessage && (
            <div className="p-2 bg-primary/10 border border-primary/20 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm text-primary">{notificationMessage}</span>
                {onDismissNotification && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onDismissNotification}
                    className="h-6 w-6 p-0"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <h3 className="font-medium text-base truncate">{displayName || 'Unknown'}</h3>
              </div>
              
              {/* Status and Info Badges */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  {getTypeIndicator()}
                  {getRfidStatusBadge()}
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {getTicketTypeBadge()}
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
                <Phone className="h-3 w-3 text-muted-foreground" />
                <span className="font-mono">{formatPhoneNumber(attendee.phone)}</span>
              </div>
            )}
            
            {attendee.email && (
              <div className="flex items-center gap-2">
                <Mail className="h-3 w-3 text-muted-foreground" />
                <span className="truncate">{attendee.email}</span>
              </div>
            )}

            {attendee.order_id && (
              <div className="flex items-center gap-2">
                <CreditCard className="h-3 w-3 text-muted-foreground" />
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
              className="w-full text-xs"
            >
              View Full Details
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};