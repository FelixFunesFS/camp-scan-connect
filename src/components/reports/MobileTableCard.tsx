import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Phone, Clock, MapPin, User, Zap, UserCheck } from "lucide-react";
import { SiteLocationBadge } from "@/components/shared/SiteLocationBadge";
import { formatPhoneNumber } from "@/lib/phoneUtils";
import { formatStandardDateTimeET } from "@/utils/dateTimeUtils";

interface AttendeeCardProps {
  attendee: {
    id: string;
    name: string;
    phone?: string | null;
    email?: string | null;
    activatedAt?: string | null;
    activationMethod?: string | null;
    ticketType?: string;
    orderInfo?: string;
    arrivalWindow?: string | null;
    siteLocation?: string | null;
    arrivalScheduled?: string | null;
  };
}

export const MobileAttendeeCard: React.FC<AttendeeCardProps> = ({ attendee }) => {
  const getActivationMethodIcon = (method: string | null | undefined) => {
    if (!method) return null;
    
    if (method === 'self_activated' || method === 'self') {
      return <Zap className="h-3 w-3" />;
    }
    if (method === 'staff_assisted' || method === 'staff') {
      return <UserCheck className="h-3 w-3" />;
    }
    return null;
  };

  const getActivationMethodLabel = (method: string | null | undefined) => {
    if (!method) return 'Unknown';
    
    if (method === 'self_activated' || method === 'self') return 'Self';
    if (method === 'staff_assisted' || method === 'staff') return 'Staff';
    return method;
  };

  return (
    <Card className="mobile-card">
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* Header - Name and Time */}
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-base truncate">{attendee.name}</h3>
              {attendee.activatedAt && (
                <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                  <Clock className="h-3 w-3 flex-shrink-0" />
                  <span className="truncate">
                    {formatStandardDateTimeET(attendee.activatedAt)}
                  </span>
                </div>
              )}
            </div>
            {attendee.activationMethod && (
              <Badge variant="outline" className="text-xs ml-2 flex-shrink-0">
                {getActivationMethodIcon(attendee.activationMethod)}
                <span className="ml-1">{getActivationMethodLabel(attendee.activationMethod)}</span>
              </Badge>
            )}
          </div>

          {/* Contact Info */}
          <div className="space-y-2">
            {attendee.phone && (
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                <span className="font-mono">{formatPhoneNumber(attendee.phone)}</span>
              </div>
            )}
            {attendee.email && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <User className="h-3 w-3 flex-shrink-0" />
                <span className="truncate">{attendee.email}</span>
              </div>
            )}
          </div>

          {/* Details Row */}
          <div className="badge-row">
            {attendee.ticketType && (
              <Badge variant="secondary" className="text-xs">
                {attendee.ticketType}
              </Badge>
            )}
            {attendee.arrivalWindow && (
              <Badge variant="outline" className="text-xs">
                {attendee.arrivalWindow}
              </Badge>
            )}
          </div>

          {/* Site Location */}
          {attendee.siteLocation && (
            <div className="flex items-center gap-2">
              <MapPin className="h-3 w-3 text-muted-foreground flex-shrink-0" />
              <SiteLocationBadge 
                siteLocationAssignment={attendee.siteLocation}
                maxLength={25}
                className="text-xs"
              />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

interface OnSiteAttendeeCardProps {
  attendee: {
    name: string;
    rfid_uid: string;
    entry_time: string;
    duration_minutes: number;
  };
}

export const MobileOnSiteCard: React.FC<OnSiteAttendeeCardProps> = ({ attendee }) => {
  const formatDuration = (minutes: number): string => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  return (
    <Card className="mobile-card">
      <CardContent className="p-4">
        <div className="space-y-3">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-base truncate">{attendee.name}</h3>
              <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                <Clock className="h-3 w-3 flex-shrink-0" />
                <span>{formatStandardDateTimeET(attendee.entry_time)}</span>
              </div>
            </div>
            <Badge variant="outline" className="text-xs ml-2 flex-shrink-0 bg-success/10 text-success border-success/20">
              {formatDuration(attendee.duration_minutes)}
            </Badge>
          </div>
          
          <div className="text-sm text-muted-foreground font-mono">
            Code: {attendee.rfid_uid}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};