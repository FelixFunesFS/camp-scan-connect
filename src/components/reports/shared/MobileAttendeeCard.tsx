import React, { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  ChevronDown,
  ChevronUp,
  User,
  Mail,
  Phone,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  Headphones,
  Wine,
  Eye,
  FileText,
  Users
} from "lucide-react";
import { EnhancedAttendee } from "../AttendeeManagementTab";
import { Link } from "react-router-dom";

interface MobileAttendeeCardProps {
  attendee: EnhancedAttendee;
  onRefresh?: () => void;
}

export const MobileAttendeeCard: React.FC<MobileAttendeeCardProps> = ({
  attendee,
  onRefresh
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'activated': return 'default';
      case 'assigned': return 'secondary';
      case 'unassigned': return 'outline';
      default: return 'outline';
    }
  };

  const getRfidStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'active': return 'default';
      case 'assigned': return 'secondary';
      case 'unissued': return 'outline';
      case 'lost': return 'destructive';
      case 'replaced': return 'outline';
      case 'deactivated': return 'destructive';
      default: return 'outline';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'activated':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'assigned':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'unassigned':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        {/* Primary Info - Always Visible */}
        <div className="p-4 border-b">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <h3 className="font-medium text-base truncate">
                  {attendee.first_name} {attendee.last_name}
                </h3>
              </div>
              
              <div className="flex items-center gap-2 mb-2">
                {getStatusIcon(attendee.overall_status)}
                <Badge variant={getStatusColor(attendee.overall_status)} className="text-xs">
                  {attendee.overall_status?.charAt(0).toUpperCase() + attendee.overall_status?.slice(1)}
                </Badge>
                <Badge variant={getRfidStatusColor(attendee.rfid_status)} className="text-xs">
                  {attendee.rfid_status?.charAt(0).toUpperCase() + attendee.rfid_status?.slice(1)}
                </Badge>
              </div>

              {/* Order Information - Moved to Primary Section */}
              {attendee.order_id && (
                <div className="flex items-center gap-2 mb-2">
                  <Users className="h-3 w-3 text-muted-foreground" />
                  <span className="text-sm">Order:</span>
                  <span className="text-sm font-mono">{attendee.order_id}</span>
                  {attendee.group_size && attendee.group_size > 1 && (
                    <Badge variant="outline" className="text-xs">
                      {attendee.group_size} people
                    </Badge>
                  )}
                </div>
              )}

              {/* Contact Info */}
              <div className="space-y-1">
                {attendee.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-3 w-3 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground truncate">
                      {attendee.email}
                    </span>
                  </div>
                )}
                {attendee.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-3 w-3 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      {attendee.phone}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col items-end gap-2">
              <Link
                to={`/attendee/${attendee.id}`}
                className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
              >
                <Eye className="h-3 w-3" />
                View
              </Link>
              
              <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </Button>
                </CollapsibleTrigger>
              </Collapsible>
            </div>
          </div>
        </div>

        {/* Expanded Details */}
        <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
          <CollapsibleContent>
            <div className="p-4 bg-muted/30 space-y-3">
              {/* Ticket Information */}
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Ticket Type:</span>
                <Badge variant="outline" className="text-xs">
                  {attendee.ticket_type?.replace('_', ' ').toUpperCase()}
                </Badge>
              </div>

              {/* Arrival Day */}
              {attendee.arrival_day && (
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Arrival Day:</span>
                  <Badge variant="outline" className="text-xs">
                    {attendee.arrival_day}
                  </Badge>
                </div>
              )}

              {/* Waiver Status */}
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Waiver:</span>
                <Badge 
                  variant={attendee.waiver_signed ? "default" : "destructive"} 
                  className="text-xs"
                >
                  <FileText className="h-3 w-3 mr-1" />
                  {attendee.waiver_signed ? 'Signed' : 'Pending'}
                </Badge>
              </div>

              {/* Activity Stats */}
              <div className="grid grid-cols-2 gap-3 pt-2 border-t">
                <div className="flex items-center gap-2">
                  <Headphones className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    Headphones: {attendee.has_headphones ? 'Yes' : 'No'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Wine className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    Bar Visits: {attendee.bar_hits || 0}
                  </span>
                </div>
              </div>

              {/* Activation Time */}
              {attendee.activated_at && (
                <div className="pt-2 border-t">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Activated:</span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(attendee.activated_at).toLocaleString()}
                    </span>
                  </div>
                </div>
              )}

              {/* Duplicate Warnings */}
              {(attendee.is_duplicate || attendee.is_phone_duplicate) && (
                <div className="pt-2 border-t space-y-1">
                  {attendee.is_duplicate && (
                    <Badge variant="destructive" className="text-xs">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      Name Duplicate
                    </Badge>
                  )}
                  {attendee.is_phone_duplicate && (
                    <Badge variant="destructive" className="text-xs">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      Phone Duplicate
                    </Badge>
                  )}
                </div>
              )}

              {/* Notes */}
              {attendee.notes && (
                <div className="pt-2 border-t">
                  <span className="text-sm font-medium">Notes:</span>
                  <p className="text-sm text-muted-foreground mt-1">
                    {attendee.notes}
                  </p>
                </div>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
};