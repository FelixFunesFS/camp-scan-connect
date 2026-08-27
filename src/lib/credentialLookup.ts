import { supabase } from "@/integrations/supabase/client";
import { getCurrentEventId } from "@/lib/eventRuntime";

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
    p_uid: uid,
    p_event_id: getCurrentEventId(),
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
