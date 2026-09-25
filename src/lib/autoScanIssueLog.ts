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
