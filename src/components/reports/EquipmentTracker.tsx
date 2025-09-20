import { useState, useEffect, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Phone, Clock, AlertTriangle } from "lucide-react";
import { EquipmentStatusService, EquipmentCheckout, EquipmentStats } from "@/services/equipmentStatusService";
import { StationType, TransactionType } from "@/types/station";
import { formatPhoneNumber } from "@/lib/phoneUtils";
import { formatStandardDateTime, formatDuration, isProlongedCheckout, getTimeBasedVariant } from "@/utils/dateTimeUtils";
import { useBackgroundRefresh } from "@/hooks/useBackgroundRefresh";

interface EquipmentTrackerProps {
  equipmentType: StationType;
  equipmentName: string;
  checkoutType: TransactionType;
  checkinType: TransactionType;
  icon: React.ReactNode;
  timePeriod?: 'today' | 'all';
  refreshTrigger?: number;
}

export default function EquipmentTracker({
  equipmentType,
  equipmentName,
  checkoutType,
  checkinType,
  icon,
  timePeriod = 'today',
  refreshTrigger = 0
}: EquipmentTrackerProps) {
  const [checkouts, setCheckouts] = useState<EquipmentCheckout[]>([]);
  const [stats, setStats] = useState<EquipmentStats>({
    currentlyOut: 0,
    totalCheckouts: 0,
    averageUsage: 0,
    longestSession: 0
  });
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  

  const fetchEquipmentData = useCallback(async (isBackground = false) => {
    try {
      // Only show loading state on initial load, not during background refresh
      if (!isBackground) {
        setIsInitialLoading(true);
      }
      
      const data = await EquipmentStatusService.getEquipmentData(
        equipmentType,
        checkoutType,
        checkinType,
        timePeriod
      );
      
      setCheckouts(data.checkouts);
      setStats(data.stats);
    } catch (error) {
      console.error(`Error fetching ${equipmentName} data:`, error);
    } finally {
      if (!isBackground) {
        setIsInitialLoading(false);
      }
    }
  }, [equipmentType, checkoutType, checkinType, equipmentName, timePeriod]);

  useBackgroundRefresh({ 
    onRefresh: () => fetchEquipmentData(true), // Mark as background refresh
    refreshTrigger 
  });

  useEffect(() => {
    fetchEquipmentData(false); // Initial load
  }, [fetchEquipmentData]);

  // Using centralized duration formatting
  const formatUsageTime = formatDuration;

  if (isInitialLoading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="h-6 bg-muted rounded w-32 mb-2"></div>
          <div className="h-4 bg-muted rounded w-48"></div>
        </div>
      </div>
    );
  }

  // Just return the detailed checkout table - no stats, no collapsible wrapper
  return (
    <div className="overflow-x-auto">
      {checkouts.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <div className="flex flex-col items-center gap-2">
            {icon}
            <p>No {equipmentName.toLowerCase()} currently checked out</p>
          </div>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Attendee</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Checkout Date/Time</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead>RFID</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {checkouts.map((checkout, index) => (
              <TableRow 
                key={`${checkout.attendeeId}-${index}`}
                className={isProlongedCheckout(checkout.duration) ? "bg-warning/5" : ""}
              >
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    {isProlongedCheckout(checkout.duration) && (
                      <AlertTriangle className="h-4 w-4 text-warning" />
                    )}
                    {checkout.attendeeName}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Phone className="h-3 w-3 text-muted-foreground" />
                    <span className="text-sm">
                      {checkout.attendeePhone ? formatPhoneNumber(checkout.attendeePhone) : 'N/A'}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Clock className="h-3 w-3 text-muted-foreground" />
                    <span className="text-sm">
                      {formatStandardDateTime(checkout.checkoutTime)}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge 
                    variant={isProlongedCheckout(checkout.duration) ? "destructive" : getTimeBasedVariant(checkout.checkoutTime)}
                    className="text-xs"
                  >
                    {formatUsageTime(checkout.duration)}
                  </Badge>
                </TableCell>
                <TableCell>
                  <code className="text-xs bg-muted px-2 py-1 rounded">
                    {checkout.rfidUid || 'N/A'}
                  </code>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}