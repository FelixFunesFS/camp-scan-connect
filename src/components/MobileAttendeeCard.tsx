import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronUp, User, Phone, CreditCard, CheckCircle2, Clock, AlertTriangle, Loader2, X } from "lucide-react";
import { formatPhoneNumber, formatMealPlan } from "@/lib/phoneUtils";
import { getOrderBadgeColor } from "@/utils/orderGroupUtils";

export type NotificationState = 'idle' | 'processing' | 'success' | 'warning' | 'error';

interface AttendeeData {
  id?: string;
  name: string;
  order_id?: string;
  phone?: string;
  meal_plan?: string;
  rfid_uid?: string;
  is_activated?: boolean;
  rfid_activated_at?: string;
  activated_at?: string;
}

interface MobileAttendeeCardProps {
  attendee: AttendeeData;
  type: 'direct' | 'companion';
  showDetails?: boolean;
  onToggleDetails?: () => void;
  backgroundColor?: string;
  primarySearchOrderId?: string | null;
  notificationState?: NotificationState;
  notificationMessage?: string;
  showNotification?: boolean;
  onDismissNotification?: () => void;
}

export function MobileAttendeeCard({ 
  attendee, 
  type, 
  showDetails = false, 
  onToggleDetails,
  backgroundColor,
  primarySearchOrderId,
  notificationState = 'idle',
  notificationMessage,
  showNotification = false,
  onDismissNotification
}: MobileAttendeeCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const hasRfid = attendee.rfid_uid;
  const isActivated = attendee.is_activated || attendee.activated_at;
  const isMockRfid = attendee.rfid_uid?.startsWith('MOCK');

  const getActivationStatus = () => {
    if (hasRfid && isActivated) {
      return (
        <Badge className="text-xs bg-green-100 text-green-800 border-green-200">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Active
        </Badge>
      );
    }
    if (!hasRfid) {
      return (
        <Badge variant="destructive" className="text-xs bg-red-100 text-red-800 border-red-200">
          <AlertTriangle className="h-3 w-3 mr-1" />
          No RFID
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="text-xs text-amber-700 border-amber-200 bg-amber-50">
        <Clock className="h-3 w-3 mr-1" />
        Pending
      </Badge>
    );
  };

  const getNotificationStyles = () => {
    switch (notificationState) {
      case 'success':
        return {
          bg: 'bg-green-50 border-green-200',
          text: 'text-green-800',
          icon: CheckCircle2,
          iconColor: 'text-green-600'
        };
      case 'warning':
        return {
          bg: 'bg-amber-50 border-amber-200', 
          text: 'text-amber-800',
          icon: AlertTriangle,
          iconColor: 'text-amber-600'
        };
      case 'error':
        return {
          bg: 'bg-red-50 border-red-200',
          text: 'text-red-800', 
          icon: AlertTriangle,
          iconColor: 'text-red-600'
        };
      case 'processing':
        return {
          bg: 'bg-blue-50 border-blue-200',
          text: 'text-blue-800',
          icon: Loader2,
          iconColor: 'text-blue-600'
        };
      default:
        return {
          bg: 'bg-gray-50 border-gray-200',
          text: 'text-gray-800',
          icon: AlertTriangle,
          iconColor: 'text-gray-600'
        };
    }
  };

  return (
    <Card 
      className={`transition-all duration-200 ${
        type === 'companion' 
          ? 'border-accent/30' 
          : 'border-primary/20'
      }`}
      style={{ backgroundColor: backgroundColor || (type === 'companion' ? 'hsl(var(--accent) / 0.05)' : 'hsl(var(--primary) / 0.05)') }}
    >
      <CardContent className="p-4">
        {/* Notification Banner */}
        {showNotification && notificationMessage && (
          <div className={`mb-3 p-3 rounded-lg border ${getNotificationStyles().bg} ${getNotificationStyles().text}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {(() => {
                  const { icon: Icon, iconColor } = getNotificationStyles();
                  return (
                    <Icon 
                      className={`h-4 w-4 ${iconColor} ${notificationState === 'processing' ? 'animate-spin' : ''}`} 
                    />
                  );
                })()}
                <span className="text-sm font-medium">{notificationMessage}</span>
              </div>
              {onDismissNotification && notificationState !== 'processing' && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 hover:bg-black/10"
                  onClick={onDismissNotification}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>
        )}
        
        <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="font-medium truncate">{attendee.name}</span>
                {type === 'companion' && (
                  <Badge variant="outline" className="text-xs">
                    Companion
                  </Badge>
                )}
                {attendee.order_id && (() => {
                  const badgeColors = getOrderBadgeColor(attendee.order_id);
                  const isDifferentOrder = primarySearchOrderId && attendee.order_id !== primarySearchOrderId;
                  
                  return (
                    <div className="flex items-center gap-1">
                      <Badge 
                        className="text-xs font-mono border"
                        style={{
                          backgroundColor: badgeColors.bg,
                          color: badgeColors.text,
                          borderColor: badgeColors.border
                        }}
                      >
                        #{attendee.order_id}
                      </Badge>
                      {isDifferentOrder && (
                        <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200">
                          Different Order
                        </Badge>
                      )}
                    </div>
                  );
                })()}
              </div>
              
              <div className="flex items-center gap-2 flex-wrap">
                {/* Activation Status */}
                {getActivationStatus()}

                {/* Meal Plan */}
                <Badge variant="secondary" className="text-xs">
                  {formatMealPlan(attendee.meal_plan)}
                </Badge>

                {/* RFID Status */}
                {hasRfid && (
                  <Badge variant="outline" className={`text-xs ${
                    isMockRfid 
                      ? 'bg-purple-50 text-purple-700 border-purple-200' 
                      : 'bg-blue-50 text-blue-700 border-blue-200'
                  }`}>
                    <CreditCard className="h-3 w-3 mr-1" />
                    {isMockRfid ? 'Test' : 'RFID'}
                  </Badge>
                )}
              </div>
            </div>

            {showDetails && onToggleDetails && (
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="p-2">
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
              </CollapsibleTrigger>
            )}
          </div>

          {showDetails && (
            <CollapsibleContent className="mt-3 pt-3 border-t border-border/50">
              <div className="space-y-2 text-sm">
                {attendee.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-3 w-3 text-muted-foreground" />
                    <span className="text-muted-foreground">
                      {formatPhoneNumber(attendee.phone)}
                    </span>
                  </div>
                )}

                {hasRfid && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">RFID:</span>
                    <span className="font-mono text-xs">{attendee.rfid_uid}</span>
                  </div>
                )}

                {(attendee.activated_at || attendee.rfid_activated_at) && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Activated:</span>
                    <span className="text-xs">
                      {new Date(attendee.activated_at || attendee.rfid_activated_at || '').toLocaleString()}
                    </span>
                  </div>
                )}
              </div>
            </CollapsibleContent>
          )}
        </Collapsible>
      </CardContent>
    </Card>
  );
}