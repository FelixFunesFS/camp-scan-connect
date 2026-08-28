import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Shirt, Package, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { UnifiedStationScanner, StationActionProps } from "@/components/UnifiedStationScanner";
import { TShirtService, TShirtOrder } from "@/services/tshirtService";

export default function TShirtsStation() {
  return (
    <UnifiedStationScanner
      stationType="tshirts"
      stationTitle="T-Shirts Station"
      mode="confirm"
      autoTrigger={false}
    >
      {(props) => <TShirtsContent {...props} />}
    </UnifiedStationScanner>
  );
}

function TShirtsContent({ 
  selectedRfid, 
  attendeeReadiness, 
  isProcessing, 
  setIsProcessing, 
  onReset 
}: StationActionProps) {
  const [tshirtOrders, setTShirtOrders] = useState<TShirtOrder[]>([]);
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Load t-shirt orders when attendee changes
  useEffect(() => {
    if (selectedRfid?.attendee_id) {
      const loadTShirtOrders = async () => {
        setIsLoading(true);
        try {
          const data = await TShirtService.checkAttendeeHasTShirt(selectedRfid.attendee_id);
          setTShirtOrders(data.orders);
          setSelectedOrderIds([]);
        } catch (error) {
          console.error("Error loading t-shirt orders:", error);
          setTShirtOrders([]);
          setSelectedOrderIds([]);
        } finally {
          setIsLoading(false);
        }
      };

      loadTShirtOrders();
    } else {
      setTShirtOrders([]);
      setSelectedOrderIds([]);
    }
  }, [selectedRfid?.attendee_id]);

  const handleOrderSelection = (orderId: string, checked: boolean) => {
    setSelectedOrderIds(prev => 
      checked 
        ? [...prev, orderId]
        : prev.filter(id => id !== orderId)
    );
  };

  const handleSelectAll = () => {
    const availableOrders = tshirtOrders.filter(order => !order.isPickedUp);
    setSelectedOrderIds(availableOrders.map(order => order.id));
  };

  const handleClearSelection = () => {
    setSelectedOrderIds([]);
  };

  const handleProcessPickups = useCallback(async () => {
    if (!selectedRfid?.attendee_id || !selectedOrderIds.length || isProcessing) return;

    const selectedOrders = tshirtOrders.filter(order => 
      selectedOrderIds.includes(order.id) && !order.isPickedUp
    );

    if (!selectedOrders.length) {
      toast.error("No valid orders selected for pickup");
      return;
    }

    setIsProcessing(true);

    try {
      await TShirtService.recordTShirtPickups(selectedRfid.attendee_id, selectedOrders, selectedRfid.uid);

      // Update local state to reflect pickups
      setTShirtOrders(prev => 
        prev.map(order => 
          selectedOrderIds.includes(order.id) 
            ? { ...order, isPickedUp: true, pickupTime: new Date().toISOString() }
            : order
        )
      );

      setSelectedOrderIds([]);

      const orderDetails = selectedOrders
        .map(o => o.quantity > 1 ? `${o.quantity}× ${o.style} ${o.size}` : `${o.style} ${o.size}`)
        .join(", ");
      toast.success(
        `T-shirts picked up by ${selectedRfid?.attendee?.first_name}: ${orderDetails}`
      );

      setTimeout(() => onReset(), 2000);
    } catch (error) {
      console.error("Error processing t-shirt pickups:", error);
      toast.error("Failed to process t-shirt pickups");
    } finally {
      setIsProcessing(false);
    }
  }, [selectedRfid, selectedOrderIds, tshirtOrders, isProcessing, onReset]);

  // Don't render if attendee is not ready
  if (!attendeeReadiness?.isReady) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center space-y-3">
            <Shirt className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="font-medium">T-Shirt Pickup</p>
            <p className="text-sm text-muted-foreground">
              {attendeeReadiness ? attendeeReadiness.message : "Scan a wristband to record a t-shirt pickup."}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Handle loading state
  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center p-6">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
            <div className="text-muted-foreground">Loading t-shirt orders...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Handle case where attendee doesn't have any t-shirts
  if (!tshirtOrders.length) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center p-6">
            <Shirt className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <div className="text-lg font-medium text-muted-foreground mb-2">
              No T-Shirts Ordered
            </div>
            <div className="text-sm text-muted-foreground">
              {selectedRfid?.attendee?.first_name} {selectedRfid?.attendee?.last_name} did not purchase any t-shirts
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const availableOrders = tshirtOrders.filter(order => !order.isPickedUp);
  const pickedUpOrders = tshirtOrders.filter(order => order.isPickedUp);
  const hasSelectedOrders = selectedOrderIds.length > 0;
  const allPickedUp = availableOrders.length === 0;

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="space-y-6">
          {/* Header */}
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Package className="h-6 w-6 text-primary" />
            </div>
            <div className="text-lg font-medium">
              T-Shirt Orders ({tshirtOrders.reduce((sum, order) => sum + order.quantity, 0)} items, {tshirtOrders.length} order groups)
            </div>
            <div className="text-sm text-muted-foreground">
              {pickedUpOrders.reduce((sum, order) => sum + order.quantity, 0)} items picked up • {availableOrders.reduce((sum, order) => sum + order.quantity, 0)} items remaining
            </div>
          </div>

          {/* Order Selection List */}
          <div className="space-y-3">
            {tshirtOrders.map((order) => (
              <div 
                key={order.id} 
                className={`flex items-center justify-between p-4 rounded-lg border ${
                  order.isPickedUp 
                    ? 'bg-green-50 border-green-200' 
                    : 'bg-muted hover:bg-muted/80'
                }`}
              >
                <div className="flex items-center gap-3">
                  {!order.isPickedUp ? (
                    <Checkbox
                      checked={selectedOrderIds.includes(order.id)}
                      onCheckedChange={(checked) => 
                        handleOrderSelection(order.id, checked as boolean)
                      }
                      disabled={order.isPickedUp}
                    />
                  ) : (
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  )}
                  
                  <div>
                    <div className="font-medium flex items-center gap-2">
                      <Shirt className="h-4 w-4" />
                      {order.style} - {order.size}
                      {order.quantity > 1 && (
                        <span className="text-sm text-muted-foreground">
                          (×{order.quantity})
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {order.quantity === 1 ? '1 item' : `${order.quantity} items`}
                      {order.isPickedUp && order.pickupTime && (
                        <span className="ml-2 text-green-600">
                          • Picked up {new Date(order.pickupTime).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {order.isPickedUp && (
                  <div className="text-green-600 font-medium text-sm">
                    PICKED UP
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Action Buttons */}
          {!allPickedUp && (
            <div className="space-y-3">
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handleSelectAll}
                  disabled={availableOrders.length === 0}
                  className="flex-1"
                >
                  Select All Available
                </Button>
                <Button
                  variant="outline"
                  onClick={handleClearSelection}
                  disabled={selectedOrderIds.length === 0}
                  className="flex-1"
                >
                  Clear Selection
                </Button>
              </div>

              <Button
                onClick={handleProcessPickups}
                disabled={!hasSelectedOrders || isProcessing}
                className="w-full"
                size="lg"
              >
                {isProcessing ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                    Processing Pickups...
                  </div>
                ) : (
                  `Process ${selectedOrderIds.length} Selected Pickup${selectedOrderIds.length !== 1 ? 's' : ''}`
                )}
              </Button>
            </div>
          )}

          {/* All Picked Up Status */}
          {allPickedUp && (
            <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
              <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-600" />
              <div className="text-green-800 font-medium">
                All T-Shirts Picked Up
              </div>
              <div className="text-sm text-green-600 mt-1">
                {selectedRfid?.attendee?.first_name} has collected all their t-shirt orders
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}