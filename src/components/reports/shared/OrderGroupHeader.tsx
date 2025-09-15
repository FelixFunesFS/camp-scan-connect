import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  ChevronDown, 
  ChevronRight, 
  Users, 
  CheckCircle, 
  Clock, 
  ShoppingCart 
} from "lucide-react";
import { EnhancedAttendee } from "../CheckInManagementTab";

interface OrderGroupHeaderProps {
  orderId: string | null;
  attendees: EnhancedAttendee[];
  isExpanded: boolean;
  onToggle: () => void;
}

export const OrderGroupHeader: React.FC<OrderGroupHeaderProps> = ({
  orderId,
  attendees,
  isExpanded,
  onToggle
}) => {
  const totalAttendees = attendees.length;
  const checkedInCount = attendees.filter(a => a.checked_in_at).length;
  const completeCount = attendees.filter(a => a.overall_status === 'complete').length;
  
  const getStatusSummary = () => {
    if (completeCount === totalAttendees) return "Complete";
    if (checkedInCount === totalAttendees) return "All Checked In";
    if (checkedInCount > 0) return "Partially Checked In";
    return "Pending";
  };

  const getStatusColor = () => {
    if (completeCount === totalAttendees) return "default";
    if (checkedInCount === totalAttendees) return "secondary"; 
    if (checkedInCount > 0) return "outline";
    return "destructive";
  };

  return (
    <div className="flex items-center justify-between p-3 bg-muted/30 border-b hover:bg-muted/50 transition-colors">
      <Button
        variant="ghost"
        onClick={onToggle}
        className="flex items-center gap-2 h-auto p-0 hover:bg-transparent"
      >
        {isExpanded ? (
          <ChevronDown className="h-4 w-4" />
        ) : (
          <ChevronRight className="h-4 w-4" />
        )}
        
        <div className="flex items-center gap-2">
          <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">
            {orderId || "No Order ID"}
          </span>
        </div>
      </Button>

      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <Users className="h-3 w-3" />
          <span>{totalAttendees} attendee{totalAttendees !== 1 ? 's' : ''}</span>
        </div>
        
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <CheckCircle className="h-3 w-3" />
          <span>{checkedInCount}/{totalAttendees} checked in</span>
        </div>

        <Badge variant={getStatusColor()} className="text-xs">
          {getStatusSummary()}
        </Badge>
      </div>
    </div>
  );
};