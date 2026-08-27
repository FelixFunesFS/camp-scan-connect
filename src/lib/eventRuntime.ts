/**
 * A tiny runtime snapshot of the event currently being viewed.
 *
 * Nothing in the codebase should hard-code a year, a date, or an event name.
 * The `events` table is the single source of truth; the EventProvider pushes
 * the selected event in here so plain (non-React) utilities and services can
 * read it too.
 */
export interface EventRecord {
  id: string;
  name: string;
  year: number;
  starts_at: string | null;
  ends_at: string | null;
  is_active: boolean;
  regfox_form_id: string | null;
}

let currentEvent: EventRecord | null = null;

export const setCurrentEvent = (event: EventRecord | null) => {
  currentEvent = event;
};

export const getCurrentEvent = (): EventRecord | null => currentEvent;

export const getCurrentEventId = (): string | null => currentEvent?.id ?? null;

/**
 * Same as getCurrentEventId but refuses to run a query with no event resolved.
 * Filtering on a null event silently returns zero rows, which used to surface
 * as "not assigned / not checked in" for people who were in fact checked in.
 */
export const requireCurrentEventId = (): string => {
  const id = currentEvent?.id;
  if (!id) {
    const message = "No event resolved yet — refusing to run an unscoped query";
    console.error(message);
    throw new Error(message);
  }
  return id;
};


export const getCurrentEventYear = (): number => currentEvent?.year ?? new Date().getFullYear();

/** Event start as a Date. Falls back to Jan 1 of the event year. */
export const getEventStartDate = (): Date =>
  currentEvent?.starts_at
    ? new Date(`${currentEvent.starts_at}T00:00:00`)
    : new Date(`${getCurrentEventYear()}-01-01T00:00:00`);

/** Event end as a Date (exclusive-safe: callers add a day when bucketing). */
export const getEventEndDate = (): Date =>
  currentEvent?.ends_at
    ? new Date(`${currentEvent.ends_at}T00:00:00`)
    : getEventStartDate();

/** Day N of the event as a Date, 0-indexed from the start date. */
export const getEventDay = (offset: number): Date => {
  const d = new Date(getEventStartDate());
  d.setDate(d.getDate() + offset);
  return d;
};

/** Staff override code, derived from the event rather than hard-coded. */
export const getStaffOverrideCode = (): string => `mc${getCurrentEventYear()}`;