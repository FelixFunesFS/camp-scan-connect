import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users } from "lucide-react";

interface OnSiteAttendee {
  name: string;
  rfid_uid: string;
  entry_time: string;
  duration_minutes: number;
}

interface CurrentlyOnSiteAttendeesProps {
  attendees: OnSiteAttendee[];
  isLoading?: boolean;
}

export const CurrentlyOnSiteAttendees = ({ attendees, isLoading }: CurrentlyOnSiteAttendeesProps) => {
  const formatTime = (minutes: number): string => {
    if (minutes === 0) return '0m';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const formatEntryTime = (timeString: string): string => {
    const date = new Date(timeString);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Currently On-Site Attendees
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-muted rounded w-1/2"></div>
            <div className="space-y-2">
              {[1,2,3].map(i => (
                <div key={i} className="h-12 bg-muted rounded"></div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (attendees.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Currently On-Site Attendees
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <div className="text-muted-foreground">No attendees currently on-site</div>
            <div className="text-sm text-muted-foreground mt-1">Check-ins will appear here</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Currently On-Site Attendees
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {attendees.map((attendee, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
              <div>
                <div className="font-medium">{attendee.name}</div>
                <div className="text-sm text-muted-foreground">
                  RFID: {attendee.rfid_uid} • Entered: {formatEntryTime(attendee.entry_time)}
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-medium">{formatTime(attendee.duration_minutes)}</div>
                <div className="text-xs text-muted-foreground">on-site</div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};