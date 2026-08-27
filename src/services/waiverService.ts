import { supabase } from "@/integrations/supabase/client";
import { WAIVER_VERSION } from "@/lib/waiverContent";
import { storeWaiverReceipt } from "@/services/waiverStorageService";

const normalizeName = (value: string) =>
  value.toLowerCase().replace(/[^a-z]/g, "");

export interface SignWaiverInput {
  attendeeId: string;
  eventId?: string | null;
  typedName: string;
  registeredName: string;
  /** False when a staff member captures the signature with the attendee present. */
  signedBySelf?: boolean;
  witnessedBy?: string | null;
}

export const waiverService = {
  namesMatch(typedName: string, registeredName: string): boolean {
    return normalizeName(typedName) === normalizeName(registeredName);
  },

  async signWaiver({
    attendeeId,
    eventId,
    typedName,
    registeredName,
    signedBySelf = true,
    witnessedBy = null,
  }: SignWaiverInput) {
    const trimmed = typedName.trim();
    if (trimmed.length < 3 || trimmed.length > 120) {
      throw new Error("Please type your full legal name.");
    }

    const nameMatch = this.namesMatch(trimmed, registeredName);

    const { data, error } = await supabase
      .from("waiver_signatures")
      .insert({
        attendee_id: attendeeId,
        event_id: eventId ?? null,
        typed_name: trimmed,
        agreement_version: WAIVER_VERSION,
        signed_by_self: signedBySelf,
        witnessed_by: witnessedBy,
        name_match: nameMatch,
        user_agent: typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 400) : null,
      })
      .select()
      .single();

    if (error) {
      // Unique violation = already signed; treat as success.
      if (error.code === "23505") return null;
      throw new Error(error.message);
    }

    // Store the signed copy. Deliberately awaited but never fatal.
    await storeWaiverReceipt({
      signatureId: data?.id,
      attendeeId,
      eventId: eventId ?? data?.event_id ?? null,
      attendeeName: registeredName,
      typedName: trimmed,
      signedAt: data?.signed_at ?? new Date().toISOString(),
      agreementVersion: data?.agreement_version ?? WAIVER_VERSION,
      nameMatch,
    });

    return data;
  },
};

