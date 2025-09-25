import { AttendeeData } from "@/pages/RfidAssignment";
import { extractSiteLocationKey, formatSiteDisplayName } from "@/utils/siteLocationUtils";

export interface SiteLocationGroup {
  siteKey: string;
  siteDisplayName: string;
  orders: Map<string, AttendeeData[]>;
  allAttendees: AttendeeData[];
  totalAttendees: number;
  assignedAttendees: number;
  percentage: number;
}

export interface SiteLocationOrderGroup {
  orderId: string;
  orderDisplayName: string;
  attendees: AttendeeData[];
  assignedCount: number;
  totalCount: number;
  percentage: number;
}

/**
 * Group attendees by site location, then by order ID
 */
export function groupAttendeesBySiteLocation(attendees: AttendeeData[]): SiteLocationGroup[] {
  const groups = new Map<string, {
    siteKey: string;
    siteDisplayName: string;
    orders: Map<string, AttendeeData[]>;
    allAttendees: AttendeeData[];
  }>();

  // First pass: group by site location key
  attendees.forEach(attendee => {
    const siteKey = extractSiteLocationKey(attendee.site_location_assignment);
    
    if (!siteKey) {
      // Handle attendees without site assignments separately - skip for now
      return;
    }

    if (!groups.has(siteKey)) {
      groups.set(siteKey, {
        siteKey,
        siteDisplayName: formatSiteDisplayName(attendee.site_location_assignment),
        orders: new Map(),
        allAttendees: []
      });
    }

    const group = groups.get(siteKey)!;
    const orderKey = attendee.order_id || `individual-${attendee.id}`;

    if (!group.orders.has(orderKey)) {
      group.orders.set(orderKey, []);
    }

    group.orders.get(orderKey)!.push(attendee);
    group.allAttendees.push(attendee);
  });

  // Convert to array and calculate stats
  return Array.from(groups.values()).map(group => {
    const totalAttendees = group.allAttendees.length;
    const assignedAttendees = group.allAttendees.filter(a => 
      a.rfid_uid && a.rfid_status === 'assigned'
    ).length;
    const percentage = totalAttendees > 0 ? (assignedAttendees / totalAttendees) * 100 : 0;

    return {
      siteKey: group.siteKey,
      siteDisplayName: group.siteDisplayName,
      orders: group.orders,
      allAttendees: group.allAttendees,
      totalAttendees,
      assignedAttendees,
      percentage
    };
  }).sort((a, b) => {
    // Sort by site number if both have numbers, otherwise alphabetically
    const aNum = a.siteKey.match(/\d+/);
    const bNum = b.siteKey.match(/\d+/);
    
    if (aNum && bNum) {
      return parseInt(aNum[0]) - parseInt(bNum[0]);
    }
    
    return a.siteDisplayName.localeCompare(b.siteDisplayName);
  });
}

/**
 * Get order groups within a site location group
 */
export function getSiteLocationOrderGroups(siteGroup: SiteLocationGroup): SiteLocationOrderGroup[] {
  return Array.from(siteGroup.orders.entries()).map(([orderId, attendees]) => {
    const assignedCount = attendees.filter(a => a.rfid_uid && a.rfid_status === 'assigned').length;
    const totalCount = attendees.length;
    const percentage = totalCount > 0 ? (assignedCount / totalCount) * 100 : 0;
    
    // Create display name for the order
    const orderDisplayName = orderId.startsWith('individual-') 
      ? `${attendees[0]?.first_name} ${attendees[0]?.last_name} (Individual)`
      : `Order ${orderId} - ${attendees[0]?.first_name} ${attendees[0]?.last_name}${attendees.length > 1 ? ` + ${attendees.length - 1} more` : ''}`;

    return {
      orderId,
      orderDisplayName,
      attendees,
      assignedCount,
      totalCount,
      percentage
    };
  }).sort((a, b) => {
    // Sort by order ID
    if (a.orderId.startsWith('individual-') && !b.orderId.startsWith('individual-')) return 1;
    if (!a.orderId.startsWith('individual-') && b.orderId.startsWith('individual-')) return -1;
    return a.orderId.localeCompare(b.orderId);
  });
}