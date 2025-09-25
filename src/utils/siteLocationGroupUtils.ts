import { AttendeeData } from "@/pages/RfidAssignment";
import { extractSiteLocationKey, formatSiteDisplayName, formatSiteLocationForDisplay } from "@/utils/siteLocationUtils";

export interface SiteLocationDetailGroup {
  siteLocationKey: string;
  siteLocationDisplay: string;
  siteLocationFull: string;
  orders: Map<string, AttendeeData[]>;
  allAttendees: AttendeeData[];
  totalAttendees: number;
  assignedAttendees: number;
  percentage: number;
}

export interface SiteLocationGroup {
  siteKey: string;
  siteDisplayName: string;
  locations: Map<string, SiteLocationDetailGroup>;
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
 * Group attendees by site number, then by site location details, then by order ID
 */
export function groupAttendeesBySiteLocation(attendees: AttendeeData[]): SiteLocationGroup[] {
  const siteGroups = new Map<string, {
    siteKey: string;
    siteDisplayName: string;
    locations: Map<string, {
      siteLocationKey: string;
      siteLocationDisplay: string;
      siteLocationFull: string;
      orders: Map<string, AttendeeData[]>;
      allAttendees: AttendeeData[];
    }>;
    allAttendees: AttendeeData[];
  }>();

  // First pass: group by site location key, then by actual site location assignment
  attendees.forEach(attendee => {
    const siteKey = extractSiteLocationKey(attendee.site_location_assignment);
    
    if (!siteKey) {
      // Handle attendees without site assignments separately - skip for now
      return;
    }

    // Create unique key for the specific site location assignment
    const siteLocationKey = attendee.site_location_assignment || 'no-assignment';
    const siteLocationDisplay = formatSiteLocationForDisplay(attendee.site_location_assignment);
    const siteLocationFull = attendee.site_location_assignment || 'No Assignment';

    if (!siteGroups.has(siteKey)) {
      siteGroups.set(siteKey, {
        siteKey,
        siteDisplayName: formatSiteDisplayName(attendee.site_location_assignment),
        locations: new Map(),
        allAttendees: []
      });
    }

    const siteGroup = siteGroups.get(siteKey)!;

    if (!siteGroup.locations.has(siteLocationKey)) {
      siteGroup.locations.set(siteLocationKey, {
        siteLocationKey,
        siteLocationDisplay,
        siteLocationFull,
        orders: new Map(),
        allAttendees: []
      });
    }

    const locationGroup = siteGroup.locations.get(siteLocationKey)!;
    const orderKey = attendee.order_id || `individual-${attendee.id}`;

    if (!locationGroup.orders.has(orderKey)) {
      locationGroup.orders.set(orderKey, []);
    }

    locationGroup.orders.get(orderKey)!.push(attendee);
    locationGroup.allAttendees.push(attendee);
    siteGroup.allAttendees.push(attendee);
  });

  // Convert to array and calculate stats
  return Array.from(siteGroups.values()).map(siteGroup => {
    // Calculate stats for the site group
    const totalAttendees = siteGroup.allAttendees.length;
    const assignedAttendees = siteGroup.allAttendees.filter(a => 
      a.rfid_uid && a.rfid_status === 'assigned'
    ).length;
    const percentage = totalAttendees > 0 ? (assignedAttendees / totalAttendees) * 100 : 0;

    // Calculate stats for each location group
    const locations = new Map<string, SiteLocationDetailGroup>();
    siteGroup.locations.forEach((locationData, locationKey) => {
      const locationTotalAttendees = locationData.allAttendees.length;
      const locationAssignedAttendees = locationData.allAttendees.filter(a => 
        a.rfid_uid && a.rfid_status === 'assigned'
      ).length;
      const locationPercentage = locationTotalAttendees > 0 ? (locationAssignedAttendees / locationTotalAttendees) * 100 : 0;

      locations.set(locationKey, {
        siteLocationKey: locationData.siteLocationKey,
        siteLocationDisplay: locationData.siteLocationDisplay,
        siteLocationFull: locationData.siteLocationFull,
        orders: locationData.orders,
        allAttendees: locationData.allAttendees,
        totalAttendees: locationTotalAttendees,
        assignedAttendees: locationAssignedAttendees,
        percentage: locationPercentage
      });
    });

    return {
      siteKey: siteGroup.siteKey,
      siteDisplayName: siteGroup.siteDisplayName,
      locations,
      allAttendees: siteGroup.allAttendees,
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
 * Get site location detail groups within a site group
 */
export function getSiteLocationDetailGroups(siteGroup: SiteLocationGroup): SiteLocationDetailGroup[] {
  return Array.from(siteGroup.locations.values()).sort((a, b) => {
    return a.siteLocationDisplay.localeCompare(b.siteLocationDisplay);
  });
}

/**
 * Get order groups within a site location detail group
 */
export function getSiteLocationOrderGroups(locationGroup: SiteLocationDetailGroup): SiteLocationOrderGroup[] {
  return Array.from(locationGroup.orders.entries()).map(([orderId, attendees]) => {
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

export interface FlatAttendeeWithSorting extends AttendeeData {
  siteKey: string;
  siteDisplayName: string;
  siteLocationDisplay: string;
  siteLocationFull: string;
  orderId: string;
  orderDisplayName: string;
}

/**
 * Flatten and sort all attendees by site location, then site location details, then order ID
 */
export function flattenAndSortAttendees(attendees: AttendeeData[]): FlatAttendeeWithSorting[] {
  const siteGroups = groupAttendeesBySiteLocation(attendees);
  const flatAttendees: FlatAttendeeWithSorting[] = [];
  
  siteGroups.forEach(siteGroup => {
    const locationGroups = getSiteLocationDetailGroups(siteGroup);
    
    locationGroups.forEach(locationGroup => {
      const orderGroups = getSiteLocationOrderGroups(locationGroup);
      
      orderGroups.forEach(orderGroup => {
        orderGroup.attendees.forEach(attendee => {
          flatAttendees.push({
            ...attendee,
            siteKey: siteGroup.siteKey,
            siteDisplayName: siteGroup.siteDisplayName,
            siteLocationDisplay: locationGroup.siteLocationDisplay,
            siteLocationFull: locationGroup.siteLocationFull,
            orderId: orderGroup.orderId,
            orderDisplayName: orderGroup.orderDisplayName
          });
        });
      });
    });
  });
  
  // Additional sorting by attendee name within orders for consistency
  return flatAttendees.sort((a, b) => {
    // First by site key (numeric if possible)
    const aNum = a.siteKey.match(/\d+/);
    const bNum = b.siteKey.match(/\d+/);
    
    if (aNum && bNum) {
      const siteComparison = parseInt(aNum[0]) - parseInt(bNum[0]);
      if (siteComparison !== 0) return siteComparison;
    } else {
      const siteComparison = a.siteDisplayName.localeCompare(b.siteDisplayName);
      if (siteComparison !== 0) return siteComparison;
    }
    
    // Then by site location display
    const locationComparison = a.siteLocationDisplay.localeCompare(b.siteLocationDisplay);
    if (locationComparison !== 0) return locationComparison;
    
    // Then by order ID
    const orderComparison = a.orderId.localeCompare(b.orderId);
    if (orderComparison !== 0) return orderComparison;
    
    // Finally by attendee name
    const aName = `${a.first_name} ${a.last_name}`;
    const bName = `${b.first_name} ${b.last_name}`;
    return aName.localeCompare(bName);
  });
}