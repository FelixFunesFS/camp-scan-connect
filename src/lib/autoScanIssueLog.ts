import { supabase } from "@/integrations/supabase/client";

/**
 * Fire-and-forget logging of scans that failed at a station.
 * Volunteers never have to tap anything — the entry shows up in the
 * Staff Hub "Station Scan Issues" feed on its own.
 */

const RECENT_WINDOW_MS = 60_000;
const recent = new Map<string, number>();

export type AutoScanIssueType = "not_in_db" | "other";

export function autoLogScanIssue(params: {
  scannedCode: string;
  stationType: string;
  errorMessage?: string;
  issueType?: AutoScanIssueType;
}) {
  const code = (params.scannedCode || "").trim().toUpperCase();
  if (!code) return;

  const key = `${params.stationType}:${code}`;
  const now = Date.now();

  // Drop repeats of the same band at the same station within the window
  for (const [k, at] of recent) {
    if (now - at > RECENT_WINDOW_MS) recent.delete(k);
  }
  if (recent.has(key)) return;
  recent.set(key, now);

  void supabase
    .from("scan_issues")
    .insert({
      scanned_code: code,
      station_type: params.stationType,
      issue_type: params.issueType ?? "not_in_db",
      attendee_id: null,
      attendee_label: null,
      notes: "Logged automatically when the scan failed at the station.",
      error_message: params.errorMessage ?? null,
    })
    .then(({ error }) => {
      if (error) console.warn("Auto scan-issue log failed:", error.message);
    });
}

/**
 * Staff waved the camper through at the gate. Annotates the open issue so the
 * Staff Hub feed shows it was resolved on the spot, without stopping the line.
 */
export async function markLetThrough(params: {
  scannedCode: string;
  stationType: string;
}) {
  const code = (params.scannedCode || "").trim().toUpperCase();
  if (!code) return;

  const note = `Let through at the station by staff on ${new Date().toLocaleString()} — band did not come up in the system.`;

  const { data } = await supabase
    .from("scan_issues")
    .select("id")
    .eq("scanned_code", code)
    .eq("station_type", params.stationType)
    .eq("status", "open")
    .order("created_at", { ascending: false })
    .limit(1);

  if (data && data.length > 0) {
    await supabase
      .from("scan_issues")
      .update({ notes: note, status: "open" })
      .eq("id", data[0].id);
    return;
  }

  await supabase.from("scan_issues").insert({
    scanned_code: code,
    station_type: params.stationType,
    issue_type: "not_in_db",
    notes: note,
  });
}
