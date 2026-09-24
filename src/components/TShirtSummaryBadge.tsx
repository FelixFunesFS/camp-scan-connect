import React from "react";
import { Badge } from "@/components/ui/badge";
import { Shirt } from "lucide-react";

export interface TShirtOrderLike {
  id: string;
  productLine: string;
  style: string;
  size: string;
  quantity: number;
  isPickedUp: boolean;
  pickedUpCount?: number;
  pickupTime?: string;
}

interface TShirtSummaryBadgeProps {
  summary?: { hasAnyTShirt: boolean; totalOrders: number; totalPickedUp: number };
  orders?: TShirtOrderLike[];
  /** Show the itemised order lines under the badge */
  showDetails?: boolean;
  className?: string;
}

export function summariseTShirtOrders(orders: TShirtOrderLike[] = []) {
  const totalOrders = orders.reduce((sum, o) => sum + o.quantity, 0);
  const totalPickedUp = orders.reduce(
    (sum, o) => sum + (o.pickedUpCount ?? (o.isPickedUp ? o.quantity : 0)),
    0
  );
  return { hasAnyTShirt: totalOrders > 0, totalOrders, totalPickedUp };
}

export const TShirtSummaryBadge: React.FC<TShirtSummaryBadgeProps> = ({
  summary,
  orders = [],
  showDetails = false,
  className = "",
}) => {
  const resolved = summary ?? summariseTShirtOrders(orders);

  if (!resolved.hasAnyTShirt || resolved.totalOrders === 0) {
    return (
      <Badge variant="outline" className={`text-xs text-muted-foreground ${className}`}>
        <Shirt className="h-3 w-3 mr-1" aria-hidden="true" />
        No shirts ordered
      </Badge>
    );
  }

  const complete = resolved.totalPickedUp >= resolved.totalOrders;
  const label = complete
    ? `Shirts picked up (${resolved.totalOrders})`
    : resolved.totalPickedUp > 0
      ? `Shirts ${resolved.totalPickedUp}/${resolved.totalOrders} picked up`
      : `Shirts pending (${resolved.totalOrders})`;

  return (
    <div className={className}>
      <Badge
        variant="outline"
        className={`text-xs whitespace-nowrap ${
          complete
            ? "bg-success/10 text-success border-success/20"
            : "bg-warning/10 text-warning border-warning/20"
        }`}
      >
        <Shirt className="h-3 w-3 mr-1" aria-hidden="true" />
        {label}
      </Badge>
      {showDetails && orders.length > 0 && (
        <ul className="mt-1.5 space-y-0.5 text-xs text-muted-foreground">
          {orders.map((order) => {
            const picked = order.pickedUpCount ?? (order.isPickedUp ? order.quantity : 0);
            return (
              <li key={order.id}>
                {order.productLine} · {order.style} · {order.size}
                {order.quantity > 1 ? ` ×${order.quantity}` : ""} —{" "}
                {picked >= order.quantity ? "picked up" : `${picked}/${order.quantity} picked up`}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};
