// Utility functions for order group visual management

// Simplified alternating color palette for order group backgrounds
const ALTERNATING_COLORS_LIGHT = [
  'hsl(200 100% 96%)', // Light blue
  'hsl(210 20% 98%)',  // Light gray
];

const ALTERNATING_COLORS_DARK = [
  'hsl(200 100% 92%)', // Darker blue
  'hsl(210 20% 94%)',  // Darker gray
];

/**
 * Get alternating background color based on group position
 */
export function getOrderGroupBackgroundColor(
  orderId: string | null | undefined, 
  groupIndex: number = 0,
  variant: 'light' | 'dark' = 'light'
): string {
  if (!orderId || orderId.trim() === '') {
    return 'transparent'; // No special background for individual attendees
  }
  
  // Simple alternating colors based on position
  const colorIndex = groupIndex % 2;
  const colors = variant === 'dark' ? ALTERNATING_COLORS_DARK : ALTERNATING_COLORS_LIGHT;
  
  return colors[colorIndex];
}

/**
 * Get distinct badge colors for order IDs
 */
const ORDER_BADGE_COLORS = [
  { bg: 'hsl(200 100% 88%)', text: 'hsl(200 100% 20%)', border: 'hsl(200 100% 75%)' }, // Blue
  { bg: 'hsl(24 100% 88%)', text: 'hsl(24 100% 20%)', border: 'hsl(24 100% 75%)' },   // Orange
  { bg: 'hsl(142 76% 88%)', text: 'hsl(142 76% 20%)', border: 'hsl(142 76% 75%)' },   // Green
  { bg: 'hsl(38 92% 88%)', text: 'hsl(38 92% 20%)', border: 'hsl(38 92% 75%)' },      // Yellow
  { bg: 'hsl(217 91% 88%)', text: 'hsl(217 91% 20%)', border: 'hsl(217 91% 75%)' },   // Info Blue
  { bg: 'hsl(280 100% 88%)', text: 'hsl(280 100% 20%)', border: 'hsl(280 100% 75%)' }, // Purple
  { bg: 'hsl(160 100% 88%)', text: 'hsl(160 100% 20%)', border: 'hsl(160 100% 75%)' }, // Cyan
  { bg: 'hsl(340 100% 88%)', text: 'hsl(340 100% 20%)', border: 'hsl(340 100% 75%)' }, // Pink
];

export function getOrderBadgeColor(orderId: string | null | undefined): { bg: string; text: string; border: string } {
  if (!orderId || orderId.trim() === '') {
    return { bg: 'hsl(var(--muted))', text: 'hsl(var(--muted-foreground))', border: 'hsl(var(--border))' };
  }
  
  // Create a simple hash from the order ID for consistent color assignment
  let hash = 0;
  for (let i = 0; i < orderId.length; i++) {
    const char = orderId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  // Use absolute value to ensure positive index
  const colorIndex = Math.abs(hash) % ORDER_BADGE_COLORS.length;
  
  return ORDER_BADGE_COLORS[colorIndex];
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
  
  return Array.from(groups.entries()).map(([key, groupAttendees], index) => ({
    orderId: key === '__individual__' ? null : key,
    attendees: groupAttendees,
    groupSize: groupAttendees.length,
    backgroundColor: getOrderGroupBackgroundColor(key === '__individual__' ? null : key, index)
  }));
}