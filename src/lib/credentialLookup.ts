import { supabase } from "@/integrations/supabase/client";
import { normalizeCredential } from "@/lib/credentialFormat";

export interface CredentialLookup {
  found: boolean;
  wrong_event: boolean;
  event_year: number | null;
  credential_uid: string | null;
  credential_status: string | null;
  attendee_id: string | null;
  attendee_name: string | null;
  waiver_signed: boolean;
  is_checked_in: boolean;
}

/** Identify a scanned code anywhere in the system (any year). */
export async function lookupCredential(uid: string): Promise<CredentialLookup | null> {
  const { data, error } = await supabase.rpc("credential_lookup", {
    p_uid: normalizeCredential(uid),
    // Always the server-side active event: a stale browser must not scope a scan to a past year.
    p_event_id: null,
  });
  if (error) {
    console.error("Credential lookup failed:", error);
    return null;
  }
  return (data as any[])?.[0] ?? null;
}

/**
 * Human message for a code the current event doesn't recognise — tells staff
 * when it's a band from a previous year rather than a bad scan.
 */
export async function describeUnknownCredential(uid: string): Promise<string> {
  const result = await lookupCredential(uid);

  if (!result || !result.found) {
    return `Code ${uid} isn't in the system — assign it at the assignment station.`;
  }

  if (result.wrong_event) {
    return `Code ${uid} is from the ${result.event_year} event — reassign it to this year's camper at the assignment station.`;
  }

  if (!result.attendee_id) {
    return `Code ${uid} isn't assigned to anyone yet — assign it at the assignment station.`;
  }

  if (result.credential_status === "lost" || result.credential_status === "replaced") {
    return `Code ${uid} was retired (${result.credential_status}) — scan the camper's replacement band.`;
  }

  if (result.credential_status === "deactivated") {
    return `${result.attendee_name}'s band is deactivated — see a supervisor.`;
  }

  return `Code ${uid} isn't usable right now (${result.credential_status ?? "unknown status"}).`;
}

export interface ResolvedCredential {
  uid: string;
  attendee_id: string | null;
  status: string;
  attendee_name: string | null;
  waiver_signed: boolean;
  is_checked_in: boolean;
  wrong_event: boolean;
  event_year: number | null;
}

/**
 * Single source of truth for "what did this scan hit?".
 * Case- and whitespace-insensitive, scoped to the event the server considers
 * active, and it reports prior-year / retired bands instead of "not found".
 */
export async function resolveCredential(raw: string): Promise<ResolvedCredential | null> {
  const uid = normalizeCredential(raw);
  if (!uid) return null;

  const result = await lookupCredential(uid);
  if (!result || !result.found || !result.credential_uid) return null;

  return {
    uid: result.credential_uid,
    attendee_id: result.attendee_id,
    status: result.credential_status ?? 'unknown',
    attendee_name: result.attendee_name,
    waiver_signed: result.waiver_signed,
    is_checked_in: result.is_checked_in,
    wrong_event: result.wrong_event,
    event_year: result.event_year,
  };
}
