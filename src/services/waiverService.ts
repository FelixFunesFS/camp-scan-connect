import { supabase } from "@/integrations/supabase/client";
import { WAIVER_VERSION } from "@/lib/waiverContent";

const normalizeName = (value: string) =>
  value.toLowerCase().replace(/[^a-z]/g, "");

export interface SignWaiverInput {
  attendeeId: string;
  eventId?: string | null;
  typedName: string;
  registeredName: string;
}

export const waiverService = {
  namesMatch(typedName: string, registeredName: string): boolean {
    return normalizeName(typedName) === normalizeName(registeredName);
  },

  async signWaiver({ attendeeId, eventId, typedName, registeredName }: SignWaiverInput) {
    const trimmed = typedName.trim();
    if (trimmed.length < 3 || trimmed.length > 120) {
      throw new Error("Please type your full legal name.");
    }

    const { data, error } = await supabase
      .from("waiver_signatures")
      .insert({
        attendee_id: attendeeId,
        event_id: eventId ?? null,
        typed_name: trimmed,
        agreement_version: WAIVER_VERSION,
        signed_by_self: true,
        name_match: this.namesMatch(trimmed, registeredName),
        user_agent: typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 400) : null,
      })
      .select()
      .single();

    if (error) {
      // Unique violation = already signed; treat as success.
      if (error.code === "23505") return null;
      throw new Error(error.message);
    }

    return data;
  },
};
