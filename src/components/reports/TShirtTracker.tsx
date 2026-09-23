import { useState, useCallback, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Shirt, Package, CheckCircle, Clock, Phone, ChevronDown } from "lucide-react";
import { TShirtService, TShirtPickupData, TShirtStats } from "@/services/tshirtService";
import { formatPhoneNumber } from "@/lib/phoneUtils";
import { formatStandardDateTime } from "@/utils/dateTimeUtils";
import { useBackgroundRefresh } from "@/hooks/useBackgroundRefresh";
import { ApparelProductBadge } from "@/components/ApparelProductBadge";

interface TShirtTrackerProps {
  refreshTrigger?: number;
}

export const TShirtTracker = ({ refreshTrigger }: TShirtTrackerProps) => {
  const [pickups, setPickups] = useState<TShirtPickupData[]>([]);
  const [stats, setStats] = useState<TShirtStats>({
    totalOrdered: 0,
    pickedUp: 0,
    remaining: 0,
    sizeBreakdown: {},
    productBreakdown: {}
  });
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isPendingPickupsOpen, setIsPendingPickupsOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState('Overall');

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

  const productLines = useMemo(() => Object.keys(stats.productBreakdown).sort(), [stats.productBreakdown]);

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
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
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
  const visiblePickups = selectedProduct === 'Overall'
    ? pendingPickups
    : pendingPickups.filter(pickup => pickup.productLine === selectedProduct);
  const selectedStats = selectedProduct === 'Overall'
    ? { ordered: stats.totalOrdered, pickedUp: stats.pickedUp, remaining: stats.remaining, sizeBreakdown: stats.sizeBreakdown }
    : stats.productBreakdown[selectedProduct] ?? { ordered: 0, pickedUp: 0, remaining: 0, sizeBreakdown: {} };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="badge-row">
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
        <nav aria-label="Apparel product lines" className="scroll-tabs gap-2 pb-1">
          {['Overall', ...productLines].map(product => (
            <Button
              key={product}
              type="button"
              size="sm"
              variant={selectedProduct === product ? 'default' : 'outline'}
              className="touch-target"
              aria-pressed={selectedProduct === product}
              onClick={() => setSelectedProduct(product)}
            >
              {product}
            </Button>
          ))}
        </nav>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-info/10 rounded-lg">
            <Package className="h-6 w-6 text-info mx-auto mb-2" />
            <div className="text-2xl font-bold text-info">{selectedStats.ordered}</div>
            <div className="text-sm text-muted-foreground">Total Items Ordered</div>
          </div>
          
          <div className="text-center p-4 bg-success/10 rounded-lg">
            <CheckCircle className="h-6 w-6 text-success mx-auto mb-2" />
            <div className="text-2xl font-bold text-success">{selectedStats.pickedUp}</div>
            <div className="text-sm text-muted-foreground">Items Picked Up</div>
          </div>
          
          <div className="text-center p-4 bg-warning/10 rounded-lg">
            <Clock className="h-6 w-6 text-warning mx-auto mb-2" />
            <div className="text-2xl font-bold text-warning">{selectedStats.remaining}</div>
            <div className="text-sm text-muted-foreground">Items Remaining</div>
          </div>
        </div>

        {/* Size Breakdown */}
        <div>
          <h4 className="font-semibold mb-4">Size Breakdown</h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
            {Object.entries(selectedStats.sizeBreakdown)
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
              {visiblePickups.length > 0 && (
                <Badge variant="outline" className="text-warning">
                  <Clock className="h-3 w-3 mr-1" />
                  {visiblePickups.length} Waiting
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
            {visiblePickups.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Shirt className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>All t-shirt items have been picked up!</p>
                <p className="text-sm">Distribution complete ✓</p>
              </div>
            ) : (
              <>
              <div className="mobile-table-card">
                {visiblePickups.map(pickup => (
                  <div key={pickup.id} className="space-y-3 rounded-md border p-4">
                    <div className="flex min-w-0 items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate font-semibold">{pickup.attendeeName}</p>
                        {pickup.phone && <p className="text-sm text-muted-foreground">{formatPhoneNumber(pickup.phone)}</p>}
                      </div>
                      <ApparelProductBadge productLine={pickup.productLine} className="shrink-0" />
                    </div>
                    <div className="badge-row">
                      <Badge variant="outline">{pickup.tshirtType || 'Unisex Crew Neck'}</Badge>
                      <Badge variant="outline">{pickup.tshirtSize || 'Unknown size'}</Badge>
                      <Badge variant="outline" className="font-mono">{pickup.rfidUid}</Badge>
                    </div>
                  </div>
                ))}
              </div>
              <div className="desktop-table overflow-x-auto border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Attendee</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead>Size</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Wristband</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visiblePickups.map((pickup) => (
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
                        <TableCell><ApparelProductBadge productLine={pickup.productLine} /></TableCell>
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
              </>
            )}
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
};