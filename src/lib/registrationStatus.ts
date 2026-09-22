/**
 * One place that decides how a registration status is named, coloured, and
 * whether that person may be given a band / checked in.
 */

export type RegistrationStatus =
  | 'registered'
  | 'pending'
  | 'waitlisted'
  | 'transferred'
  | 'cancelled'
  | 'abandoned'
  | string;

/** Statuses that belong on the day-to-day working screens. */
export const WORKING_STATUSES = ['registered', 'pending'] as const;

/** Statuses that are hidden from working screens and can never be checked in. */
export const EXCLUDED_STATUSES = ['cancelled', 'abandoned', 'transferred', 'waitlisted'] as const;

export function getStatusLabel(status?: string | null): string {
  switch ((status ?? 'registered').toLowerCase()) {
    case 'registered':
      return 'Confirmed';
    case 'pending':
      return 'Pending Payment';
    case 'waitlisted':
      return 'Waiting List';
    case 'transferred':
      return 'Transferred';
    case 'cancelled':
      return 'Cancelled';
    case 'abandoned':
      return 'Abandoned';
    default:
      return status || 'Unknown';
  }
}

export function getStatusVariant(
  status?: string | null,
): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch ((status ?? 'registered').toLowerCase()) {
    case 'registered':
      return 'default';
    case 'pending':
      return 'secondary';
    case 'cancelled':
    case 'abandoned':
      return 'destructive';
    default:
      return 'outline';
  }
}

/** Extra colouring so Pending always reads amber, Cancelled always red. */
export function getStatusClassName(status?: string | null): string {
  switch ((status ?? 'registered').toLowerCase()) {
    case 'registered':
      return 'bg-success/15 text-success border-success/30';
    case 'pending':
      return 'bg-warning/15 text-warning border-warning/30';
    case 'cancelled':
    case 'abandoned':
      return 'bg-destructive/15 text-destructive border-destructive/30';
    default:
      return 'bg-muted text-muted-foreground border-border';
  }
}

/** Confirmed and pending-payment people can be banded and checked in. */
export function isActivatable(status?: string | null): boolean {
  return (WORKING_STATUSES as readonly string[]).includes((status ?? 'registered').toLowerCase());
}

/** Plain-language reason a scan or check-in was refused. */
export function getBlockedReason(status?: string | null, name?: string | null): string {
  const who = name?.trim() || 'This camper';
  switch ((status ?? '').toLowerCase()) {
    case 'cancelled':
      return `${who}'s registration was cancelled — see staff.`;
    case 'abandoned':
      return `${who}'s registration was never completed — see staff.`;
    case 'transferred':
      return `${who}'s registration was transferred to someone else — see staff.`;
    case 'waitlisted':
      return `${who} is on the waiting list — see staff.`;
    default:
      return `${who} can't be checked in right now — see staff.`;
  }
}
