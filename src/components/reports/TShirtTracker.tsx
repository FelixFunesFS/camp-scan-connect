import { useState, useCallback, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Shirt, Package, CheckCircle, Clock, Phone, ChevronDown } from "lucide-react";
import { TShirtService, TShirtPickupData, TShirtStats } from "@/services/tshirtService";
import { formatPhoneNumber } from "@/lib/phoneUtils";
import { formatStandardDateTime } from "@/utils/dateTimeUtils";
import { useBackgroundRefresh } from "@/hooks/useBackgroundRefresh";

interface TShirtTrackerProps {
  refreshTrigger?: number;
}

export const TShirtTracker = ({ refreshTrigger }: TShirtTrackerProps) => {
  const [pickups, setPickups] = useState<TShirtPickupData[]>([]);
  const [stats, setStats] = useState<TShirtStats>({
    totalOrdered: 0,
    pickedUp: 0,
    remaining: 0,
    sizeBreakdown: {}
  });
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isPendingPickupsOpen, setIsPendingPickupsOpen] = useState(false);

  const fetchTShirtData = useCallback(async (isBackground = false) => {
    try {
      if (!isBackground) {
        setIsInitialLoading(true);
      }

      const { pickups: data, stats: statsData } = await TShirtService.getTShirtPickupData();
      setPickups(data);
      setStats(statsData);
    } catch (error) {
      console.error('Error fetching t-shirt data:', error);
    } finally {
      if (!isBackground) {
        setIsInitialLoading(false);
      }
    }
  }, []);

  useBackgroundRefresh({
    onRefresh: () => fetchTShirtData(true),
    refreshTrigger
  });
  
  useEffect(() => {
    fetchTShirtData(false);
  }, [fetchTShirtData]);

  if (isInitialLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shirt className="h-5 w-5" />
            T-Shirt Distribution Tracking
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="grid grid-cols-3 gap-4">
              {[1,2,3].map(i => (
                <div key={i} className="h-16 bg-muted rounded"></div>
              ))}
            </div>
            <div className="h-32 bg-muted rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const pendingPickups = pickups.filter(p => !p.pickedUp);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shirt className="h-5 w-5" />
            T-Shirt Distribution Tracking
            <Badge variant="outline" className="text-xs font-normal">
              Items Tracking
            </Badge>
          </div>
          <Badge 
            variant={stats.remaining > 0 ? "default" : "outline"}
            className={stats.remaining > 0 ? "bg-warning" : "bg-success"}
          >
            {stats.remaining} Items Remaining
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Distribution Stats */}
        <p className="text-xs text-muted-foreground">
          Counts come from registration orders, so totals are accurate before wristbands are
          assigned. A 0% pickup rate ahead of the event is expected.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-info/10 rounded-lg">
            <Package className="h-6 w-6 text-info mx-auto mb-2" />
            <div className="text-2xl font-bold text-info">{stats.totalOrdered}</div>
            <div className="text-sm text-muted-foreground">Total Items Ordered</div>
          </div>
          
          <div className="text-center p-4 bg-success/10 rounded-lg">
            <CheckCircle className="h-6 w-6 text-success mx-auto mb-2" />
            <div className="text-2xl font-bold text-success">{stats.pickedUp}</div>
            <div className="text-sm text-muted-foreground">Items Picked Up</div>
          </div>
          
          <div className="text-center p-4 bg-warning/10 rounded-lg">
            <Clock className="h-6 w-6 text-warning mx-auto mb-2" />
            <div className="text-2xl font-bold text-warning">{stats.remaining}</div>
            <div className="text-sm text-muted-foreground">Items Remaining</div>
          </div>
        </div>

        {/* Size Breakdown */}
        <div>
          <h4 className="font-semibold mb-4">Size Breakdown</h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
            {Object.entries(stats.sizeBreakdown)
              .sort(([a], [b]) => {
                // Custom sort order for sizes
                const sizeOrder = ['S', 'M', 'L', 'XL', '2X', '3X', '4X'];
                const aIndex = sizeOrder.indexOf(a);
                const bIndex = sizeOrder.indexOf(b);
                if (aIndex === -1 && bIndex === -1) return a.localeCompare(b);
                if (aIndex === -1) return 1;
                if (bIndex === -1) return -1;
                return aIndex - bIndex;
              })
              .map(([size, breakdown]) => (
                <div key={size} className="text-center p-3 bg-muted/50 rounded-lg">
                  <div className="font-bold text-lg">{size}</div>
                  <div className="text-sm text-muted-foreground">
                    {breakdown.pickedUp}/{breakdown.ordered}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {breakdown.remaining} left
                  </div>
                </div>
              ))
            }
          </div>
        </div>

        {/* Pending Pickups */}
        <Collapsible 
          open={isPendingPickupsOpen} 
          onOpenChange={setIsPendingPickupsOpen}
          className="space-y-2"
        >
          <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg border border-border/50 bg-muted/30 px-4 py-3 text-left transition-colors hover:bg-muted/50">
            <div className="flex items-center gap-2">
              <h4 className="font-semibold">Pending Pickups</h4>
              {pendingPickups.length > 0 && (
                <Badge variant="outline" className="text-warning">
                  <Clock className="h-3 w-3 mr-1" />
                  {pendingPickups.length} Waiting
                </Badge>
              )}
            </div>
            <ChevronDown 
              className={`h-4 w-4 transition-transform duration-200 ${
                isPendingPickupsOpen ? "rotate-180" : "rotate-0"
              }`} 
            />
          </CollapsibleTrigger>
          
          <CollapsibleContent className="space-y-2">
            {pendingPickups.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Shirt className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>All t-shirt items have been picked up!</p>
                <p className="text-sm">Distribution complete ✓</p>
              </div>
            ) : (
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Attendee</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Size</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>RFID</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingPickups.map((pickup) => (
                      <TableRow key={pickup.id}>
                        <TableCell className="font-medium">{pickup.attendeeName}</TableCell>
                        <TableCell>
                          {pickup.phone && (
                            <div className="flex items-center gap-1 text-sm">
                              <Phone className="h-3 w-3" />
                              {formatPhoneNumber(pickup.phone)}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-medium">
                            {pickup.tshirtSize || 'Unknown'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {pickup.tshirtType || 'Unisex'}
                          </span>
                        </TableCell>
                        <TableCell>
                          {pickup.rfidUid === 'No wristband yet' ? (
                            <Badge variant="outline" className="text-xs text-muted-foreground">
                              No wristband yet
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs font-mono">
                              {pickup.rfidUid}
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
};