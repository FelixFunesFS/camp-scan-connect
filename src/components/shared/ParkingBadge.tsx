import { Badge } from "@/components/ui/badge";
import { parseParkingAssignment, getParkingColorClass, formatParkingForDisplay } from "@/utils/parkingUtils";

interface ParkingBadgeProps {
  parkingAssignment?: string | null;
  maxLength?: number;
  className?: string;
}

export function ParkingBadge({ parkingAssignment, maxLength = 20, className }: ParkingBadgeProps) {
  const parsed = parseParkingAssignment(parkingAssignment);
  const colorClass = getParkingColorClass(parsed.type);
  const displayText = formatParkingForDisplay(parkingAssignment, maxLength);

  return (
    <Badge 
      variant="outline" 
      className={`${colorClass} border-0 text-xs font-medium ${className}`}
      title={parsed.display}
    >
      {displayText}
    </Badge>
  );
}