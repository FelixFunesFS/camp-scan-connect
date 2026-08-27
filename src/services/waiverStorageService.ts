import { supabase } from "@/integrations/supabase/client";
import { buildWaiverReceipt, type WaiverReceiptInput } from "@/lib/waiverReceipt";

const BUCKET = "waivers";

export interface StoreReceiptInput extends WaiverReceiptInput {
  signatureId?: string | null;
  attendeeId: string;
  eventId?: string | null;
}

/**
 * Persists a copy of the signed waiver as a PDF in private storage.
 * Never throws — a storage hiccup must not block check-in.
 */
export async function storeWaiverReceipt(
  input: StoreReceiptInput
): Promise<string | null> {
  try {
    const path = `${input.eventId ?? "unscoped"}/${input.attendeeId}.pdf`;
    const blob = buildWaiverReceipt(input).output("blob");

    const { error } = await supabase.storage.from(BUCKET).upload(path, blob, {
      contentType: "application/pdf",
      upsert: true,
    });
    if (error) throw error;

    if (input.signatureId) {
      await supabase
        .from("waiver_signatures")
        .update({ receipt_path: path })
        .eq("id", input.signatureId);
    } else {
      await supabase
        .from("waiver_signatures")
        .update({ receipt_path: path })
        .eq("attendee_id", input.attendeeId);
    }

    return path;
  } catch (error) {
    console.warn("Waiver receipt could not be stored:", error);
    return null;
  }
}

/** Returns a short-lived link to a stored waiver PDF, or null if unavailable. */
export async function getWaiverReceiptUrl(path: string): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, 60 * 10);
  if (error) {
    console.warn("Could not create waiver receipt link:", error);
    return null;
  }
  return data?.signedUrl ?? null;
}
