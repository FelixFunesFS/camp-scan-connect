/**
 * Single source of truth for ticket / accommodation category display.
 * Every view (reports, assignment, staff hub, attendee detail, exports)
 * should read labels, colors and ordering from here so the wording stays
 * identical everywhere.
 */

export interface TicketTypeStyle {
  progress: string;
  background: string;
  badge: string;
}

interface TicketTypeMeta {
  label: string;
  order: number;
  style: TicketTypeStyle;
}

const style = (token: string): TicketTypeStyle => ({
  progress: `bg-${token}`,
  background: `bg-${token}/5 border-${token}/20`,
  badge: `bg-${token}/20 text-${token}`,
});

const TICKET_TYPE_META: Record<string, TicketTypeMeta> = {
  premium_tent: { label: 'Premium Tent', order: 1, style: style('primary') },
  premium_rv: { label: 'Premium RV', order: 2, style: style('secondary') },
  dry_site: { label: 'Dry Site', order: 3, style: style('info') },
  rv_site: { label: 'RV Site', order: 4, style: style('secondary') },
  day_pass: { label: 'Day Pass', order: 5, style: style('muted-foreground') },
  cabin: { label: 'Cabin', order: 6, style: style('accent') },
  villa: { label: 'Villa', order: 7, style: style('accent') },
  glamping: { label: 'Glamping', order: 8, style: style('primary') },
  staff: { label: 'Staff', order: 9, style: style('muted-foreground') },
  vendor: { label: 'Vendor', order: 10, style: style('muted-foreground') },
  operational_worker: { label: 'Operational Worker', order: 10.5, style: style('info') },
  // Retained so archived 2025 rows still render with a friendly name.
  premium_power: { label: 'Premium (legacy)', order: 11, style: style('primary') },
};

const titleCase = (value: string) =>
  value.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());

/** Human label for a ticket type, safe for unknown/empty values. */
export function formatTicketType(type?: string | null): string {
  if (!type) return 'Unassigned';
  return TICKET_TYPE_META[type]?.label ?? titleCase(type);
}

/** Themed classes for a ticket type card/badge. */
export function getTicketTypeStyle(type?: string | null): TicketTypeStyle {
  return TICKET_TYPE_META[type ?? '']?.style ?? style('primary');
}

/** Display order; unknown types sort to the end. */
export function getTicketTypeOrder(type?: string | null): number {
  return TICKET_TYPE_META[type ?? '']?.order ?? 99;
}

export const TICKET_TYPE_KEYS = Object.keys(TICKET_TYPE_META);
