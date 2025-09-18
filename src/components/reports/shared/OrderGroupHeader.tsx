import React from "react";
import { ChevronRight, ChevronDown, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { EnhancedAttendee } from "../AttendeeManagementTab";

interface OrderGroupHeaderProps {
  orderId: string | null;
  attendees: EnhancedAttendee[];
  isExpanded: boolean;
  onToggle: () => void;
  groupProgress?: { assigned: number; total: number; percentage: number };
}

export const OrderGroupHeader: React.FC<OrderGroupHeaderProps> = ({
  orderId,
  attendees,
  isExpanded,
  onToggle,
  groupProgress
}) => {
  const totalAttendees = attendees.length;
  const activatedCount = attendees.filter(a => a.activated_at).length;
  const completeCount = attendees.filter(a => a.overall_status === 'complete').length;
  
  const getStatusSummary = () => {
    if (groupProgress) {
      const { assigned, total, percentage } = groupProgress;
      if (percentage === 100) return "Complete";
      if (assigned > 0) return `In Progress (${assigned}/${total})`;
      return "Pending";
    }
    
    if (completeCount === totalAttendees) return "Complete";
    if (activatedCount > 0) return "In Progress";
    return "Pending";
  };

  const getStatusColor = () => {
    const status = getStatusSummary();
    if (status === "Complete") return "default";
    if (status.includes("In Progress")) return "secondary";
    return "outline";
  };

  return (
    <div className="flex items-center justify-between p-3 bg-muted/30 border-b hover:bg-muted/50 transition-colors">
      <div className="flex items-center gap-2 flex-1">
        <Button
          variant="ghost"
          size="sm"
          className="p-1 h-auto"
          onClick={onToggle}
        >
          {isExpanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </Button>

        <div className="flex items-center gap-3 flex-1">
          <div>
            <h3 className="font-medium text-base flex items-center gap-2">
              Order: {orderId || "No Order ID"}
              <Badge variant="outline" className="text-xs">
                <Users className="h-3 w-3 mr-1" />
                {totalAttendees}
              </Badge>
            </h3>
          </div>
          
          <div className="flex items-center gap-2 ml-auto">
            <Badge variant={getStatusColor()}>
              {getStatusSummary()}
            </Badge>
            
            {groupProgress && (
              <div className="flex items-center gap-2 min-w-[120px]">
                <Progress 
                  value={groupProgress.percentage} 
                  className="w-20 h-2" 
                />
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {groupProgress.assigned}/{groupProgress.total}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};