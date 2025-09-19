import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight, User, Phone, Mail, CreditCard, X } from "lucide-react";
import { formatPhoneNumber } from "@/lib/phoneUtils";
import type { NotificationState, FlexibleAttendeeData } from "@/types/attendee";

interface MobileAttendeeCardProps {
  attendee: FlexibleAttendeeData;
  type?: 'direct' | 'companion' | 'standard';
  showDetails?: boolean;
  notificationState?: NotificationState;
  notificationMessage?: string;
  showNotification?: boolean;
  onViewDetails?: () => void;
  onToggleDetails?: () => void;
  onDismissNotification?: () => void;
  backgroundColor?: string;
  primarySearchOrderId?: string;
  className?: string;
}

export const MobileAttendeeCard: React.FC<MobileAttendeeCardProps> = ({
  attendee,
  type = 'standard',
  showDetails = false,
  notificationState = 'idle',
  notificationMessage,
  showNotification,
  onViewDetails,
  onToggleDetails,
  onDismissNotification,
  backgroundColor,
  primarySearchOrderId,
  className = ""
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const displayName = attendee.name || `${attendee.first_name || ''} ${attendee.last_name || ''}`.trim();
  const isActivated = attendee.is_activated || attendee.activated_at;
  const hasRfid = attendee.has_rfid || attendee.rfid_uid;

  const getStatusBadge = () => {
    if (isActivated) return <Badge variant="default" className="text-xs">Active</Badge>;
    if (hasRfid) return <Badge variant="secondary" className="text-xs">Assigned</Badge>;
    return <Badge variant="outline" className="text-xs">Pending</Badge>;
  };

  const getTypeIndicator = () => {
    if (type === 'direct') return <Badge variant="default" className="text-xs bg-primary">Your Registration</Badge>;
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
              <div className="flex items-center gap-2 mb-1">
                <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <h3 className="font-medium text-base truncate">{displayName || 'Unknown'}</h3>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {getTypeIndicator()}
                {getStatusBadge()}
              </div>
            </div>
          </div>

          {/* Basic Info */}
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

          {/* Expandable Details */}
          {showDetails && (
            <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
              <CollapsibleTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="w-full justify-between p-2 h-auto"
                  onClick={onToggleDetails}
                >
                  <span className="text-xs">More Details</span>
                  {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-2">
                <div className="space-y-2 text-xs text-muted-foreground bg-muted/20 rounded-lg p-3">
                  {attendee.ticket_type && (
                    <div><strong>Ticket:</strong> {attendee.ticket_type}</div>
                  )}
                  {attendee.meal_plan && (
                    <div><strong>Meal Plan:</strong> {attendee.meal_plan}</div>
                  )}
                  {attendee.rfid_uid && (
                    <div><strong>RFID:</strong> <span className="font-mono">{attendee.rfid_uid}</span></div>
                  )}
                  {attendee.activated_at && (
                    <div><strong>Activated:</strong> {new Date(attendee.activated_at).toLocaleDateString()}</div>
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}

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