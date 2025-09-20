import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Phone, Clock, AlertTriangle } from "lucide-react";
import { EquipmentStatusService, EquipmentCheckout, EquipmentStats } from "@/services/equipmentStatusService";
import { StationType, TransactionType } from "@/types/station";
import { formatPhoneNumber } from "@/lib/phoneUtils";
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
  const [isLoading, setIsLoading] = useState(true);
  

  const fetchEquipmentData = useCallback(async () => {
    try {
      setIsLoading(true);
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
      setIsLoading(false);
    }
  }, [equipmentType, checkoutType, checkinType, equipmentName, timePeriod]);

  useBackgroundRefresh({ 
    onRefresh: fetchEquipmentData, 
    refreshTrigger 
  });

  useEffect(() => {
    fetchEquipmentData();
  }, [fetchEquipmentData]);

  const formatUsageTime = (minutes: number): string => {
    return EquipmentStatusService.formatUsageTime(minutes);
  };

  if (isLoading) {
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
              <TableHead>Checkout Time</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead>RFID</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {checkouts.map((checkout, index) => (
              <TableRow 
                key={`${checkout.attendeeId}-${index}`}
                className={checkout.duration > 180 ? "bg-warning/5" : ""}
              >
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    {checkout.duration > 180 && (
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
                      {checkout.checkoutTime.toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: true
                      })}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge 
                    variant={checkout.duration > 180 ? "destructive" : "secondary"}
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