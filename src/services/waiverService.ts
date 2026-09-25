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

  /**
   * Force the attendee record to reflect a captured signature and protect it
   * from being overwritten by a later RegFox sync.
   */
  async markAttendeeSigned(attendeeId: string) {
    try {
      const { data: current } = await supabase
        .from("attendees")
        .select("locked_fields")
        .eq("id", attendeeId)
        .maybeSingle();

      const locked = new Set<string>(current?.locked_fields ?? []);
      locked.add("waiver_signed");

      await supabase
        .from("attendees")
        .update({ waiver_signed: true, locked_fields: Array.from(locked) })
        .eq("id", attendeeId);
    } catch (err) {
      console.warn("Could not confirm waiver flag on attendee", err);
    }
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
      // Unique violation = a signature row already exists for this attendee/event.
      // The insert trigger cannot fire again, so make sure the attendee record
      // itself reflects the signature (this is what the check-in gate reads).
      if (error.code === "23505") {
        await this.markAttendeeSigned(attendeeId);
        return null;
      }
      throw new Error(error.message);
    }

    // Belt and braces: the insert trigger sets this, but a sync could have
    // flipped it back. Lock it so no future sync can undo an on-site signature.
    await this.markAttendeeSigned(attendeeId);

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

