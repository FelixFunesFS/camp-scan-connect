import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Phone, Clock, MapPin, Mail, Zap, UserCheck, CalendarDays } from "lucide-react";
import { SiteLocationBadge } from "@/components/shared/SiteLocationBadge";
import { formatPhoneNumber } from "@/lib/phoneUtils";
import { formatStandardDateTimeET } from "@/utils/dateTimeUtils";
import { formatTicketType } from "@/lib/ticketTypes";

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
    scheduledArrivalDay?: string;
    actualCheckInDay?: string;
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
    <Card>
      <CardContent className="p-4 sm:p-5">
        <div className="space-y-3">
          {/* Header - Name and Time */}
          <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-semibold leading-snug">{attendee.name}</h3>
              {attendee.activatedAt && (
                <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                  <Clock className="h-3 w-3 flex-shrink-0" />
                  <span>
                    {formatStandardDateTimeET(attendee.activatedAt)}
                  </span>
                </div>
              )}
            </div>
            {attendee.activationMethod && (
              <Badge variant="outline" className="w-fit shrink-0 text-xs">
                {getActivationMethodIcon(attendee.activationMethod)}
                <span className="ml-1">{getActivationMethodLabel(attendee.activationMethod)}</span>
              </Badge>
            )}
          </div>

          {/* Contact Info */}
          <div className="grid gap-2 text-sm sm:grid-cols-2">
            {attendee.phone && (
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                <span className="font-mono">{formatPhoneNumber(attendee.phone)}</span>
              </div>
            )}
            {attendee.email && (
              <div className="flex min-w-0 items-start gap-2 text-muted-foreground">
                <Mail className="mt-0.5 h-3 w-3 flex-shrink-0" />
                <span className="break-all">{attendee.email}</span>
              </div>
            )}
          </div>

          {/* Details Row */}
          <div className="badge-row">
            {attendee.ticketType && (
              <Badge variant="secondary" className="text-xs">
                {formatTicketType(attendee.ticketType)}
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

          {(attendee.scheduledArrivalDay || attendee.arrivalScheduled || attendee.actualCheckInDay) && (
            <dl className="grid grid-cols-2 gap-3 border-t pt-3 text-sm">
              <div>
                <dt className="flex items-center gap-1 text-xs text-muted-foreground">
                  <CalendarDays className="h-3 w-3" /> Scheduled
                </dt>
                <dd className="mt-1 font-medium">{attendee.scheduledArrivalDay || attendee.arrivalScheduled || 'Not set'}</dd>
              </div>
              {attendee.actualCheckInDay && (
                <div>
                  <dt className="flex items-center gap-1 text-xs text-muted-foreground">
                    <UserCheck className="h-3 w-3" /> Checked in
                  </dt>
                  <dd className="mt-1 font-medium">{attendee.actualCheckInDay}</dd>
                </div>
              )}
            </dl>
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
    <Card>
      <CardContent className="p-4 sm:p-5">
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