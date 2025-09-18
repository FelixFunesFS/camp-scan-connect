// Utility functions for order group visual management

// Color palette for order group backgrounds - using HSL values from design system
const ORDER_GROUP_COLORS = [
  'hsl(200 100% 96%)', // Very light blue (primary tint)
  'hsl(24 100% 96%)',  // Very light orange (secondary tint)  
  'hsl(142 76% 96%)',  // Very light green (success tint)
  'hsl(38 92% 96%)',   // Very light yellow (warning tint)
  'hsl(217 91% 96%)',  // Very light info blue
  'hsl(280 100% 96%)', // Very light purple
  'hsl(160 100% 96%)', // Very light cyan
  'hsl(340 100% 96%)', // Very light pink
];

// Darker background variants for better contrast in some contexts
const ORDER_GROUP_COLORS_DARK = [
  'hsl(200 100% 92%)', // Slightly darker blue
  'hsl(24 100% 92%)',  // Slightly darker orange
  'hsl(142 76% 92%)',  // Slightly darker green
  'hsl(38 92% 92%)',   // Slightly darker yellow
  'hsl(217 91% 92%)',  // Slightly darker info blue
  'hsl(280 100% 92%)', // Slightly darker purple
  'hsl(160 100% 92%)', // Slightly darker cyan
  'hsl(340 100% 92%)', // Slightly darker pink
];

/**
 * Get a consistent background color for an order ID
 */
export function getOrderGroupBackgroundColor(orderId: string | null | undefined, variant: 'light' | 'dark' = 'light'): string {
  if (!orderId || orderId.trim() === '') {
    return 'transparent'; // No special background for individual attendees
  }
  
  // Create a simple hash from the order ID for consistent color assignment
  let hash = 0;
  for (let i = 0; i < orderId.length; i++) {
    const char = orderId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  // Use absolute value to ensure positive index
  const colorIndex = Math.abs(hash) % ORDER_GROUP_COLORS.length;
  
  return variant === 'dark' ? ORDER_GROUP_COLORS_DARK[colorIndex] : ORDER_GROUP_COLORS[colorIndex];
}

/**
 * Get CSS classes for order group styling
 */
export function getOrderGroupClasses(orderId: string | null | undefined): string {
  if (!orderId || orderId.trim() === '') {
    return ''; // No special classes for individual attendees
  }
  
  return 'relative border-l-4 border-l-primary/20';
}

/**
 * Check if attendees belong to the same order group
 */
export function isSameOrderGroup(orderIdA: string | null | undefined, orderIdB: string | null | undefined): boolean {
  if (!orderIdA || !orderIdB) return false;
  return orderIdA.trim() === orderIdB.trim();
}

/**
 * Group attendees by order ID for display
 */
export interface OrderGroup {
  orderId: string | null;
  attendees: any[];
  groupSize: number;
  backgroundColor: string;
}

export function groupAttendeesByOrder<T extends { order_id?: string | null }>(attendees: T[]): OrderGroup[] {
  const groups = new Map<string, T[]>();
  
  attendees.forEach(attendee => {
    const orderId = attendee.order_id || null;
    const key = orderId || '__individual__';
    
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(attendee);
  });
  
  return Array.from(groups.entries()).map(([key, groupAttendees]) => ({
    orderId: key === '__individual__' ? null : key,
    attendees: groupAttendees,
    groupSize: groupAttendees.length,
    backgroundColor: getOrderGroupBackgroundColor(key === '__individual__' ? null : key)
  }));
}