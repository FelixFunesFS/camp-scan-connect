import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const SCAN_ISSUE_TYPES = [
  { value: "smudged", label: "Smudged / damaged barcode" },
  { value: "packet", label: "Packet missing / mismatch" },
  { value: "not_in_db", label: "Code not in system" },
  { value: "replacement", label: "Handed replacement band" },
  { value: "manual_lookup", label: "Served via name lookup" },
  { value: "other", label: "Other" },
];

export const scanIssueLabel = (v: string) =>
  SCAN_ISSUE_TYPES.find((t) => t.value === v)?.label ?? v;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scannedCode: string;
  stationType: string;
  errorMessage?: string;
}

interface Match { id: string; first_name: string; last_name: string; phone: string | null }

export function ScanIssueDialog({ open, onOpenChange, scannedCode, stationType, errorMessage }: Props) {
  const [code, setCode] = useState(scannedCode);
  const [issue, setIssue] = useState("");
  const [query, setQuery] = useState("");
  const [matches, setMatches] = useState<Match[]>([]);
  const [camper, setCamper] = useState<Match | null>(null);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setCode(scannedCode); setIssue(""); setQuery(""); setMatches([]); setCamper(null); setNotes("");
    }
  }, [open, scannedCode]);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2 || camper) { setMatches([]); return; }
    const t = setTimeout(async () => {
      const digits = q.replace(/\D/g, "");
      const safe = q.replace(/[,()]/g, "");
      const ors = [`first_name.ilike.%${safe}%`, `last_name.ilike.%${safe}%`];
      if (digits.length >= 3) ors.push(`phone.ilike.%${digits}%`);
      const { data } = await supabase
        .from("attendees")
        .select("id, first_name, last_name, phone")
        .eq("event_id", (await supabase.rpc("current_event_id")).data as string)
        .or(ors.join(","))
        .limit(6);
      setMatches((data as Match[]) ?? []);
    }, 250);
    return () => clearTimeout(t);
  }, [query, camper]);

  const save = async () => {
    if (!issue) { toast.error("Pick what happened"); return; }
    setSaving(true);
    const { error } = await supabase.from("scan_issues").insert({
      scanned_code: code.trim().toUpperCase() || null,
      station_type: stationType,
      issue_type: issue,
      attendee_id: camper?.id ?? null,
      attendee_label: camper ? `${camper.first_name} ${camper.last_name}` : query.trim() || null,
      notes: notes.trim() || null,
      error_message: errorMessage ?? null,
    });
    setSaving(false);
    if (error) { toast.error("Couldn't save — try again"); return; }
    toast.success("Issue logged for the Staff Hub");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Log scan issue</DialogTitle>
          <DialogDescription>Saved with station and time so supervisors can follow up.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Band code</label>
            <Input value={code} onChange={(e) => setCode(e.target.value)} className="font-mono mt-1" />
          </div>
          <div>
            <label className="text-sm font-medium">What happened?</label>
            <div className="mt-1 grid grid-cols-2 gap-2">
              {SCAN_ISSUE_TYPES.map((t) => (
                <Button key={t.value} type="button" size="sm" variant={issue === t.value ? "default" : "outline"}
                  className="h-auto whitespace-normal py-2 text-xs" onClick={() => setIssue(t.value)}>
                  {t.label}
                </Button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">Camper (optional)</label>
            {camper ? (
              <div className="mt-1 flex items-center justify-between rounded-md border p-2 text-sm">
                <span>{camper.first_name} {camper.last_name}</span>
                <Button size="sm" variant="ghost" onClick={() => { setCamper(null); setQuery(""); }}>Change</Button>
              </div>
            ) : (
              <>
                <Input className="mt-1" placeholder="Name or phone" value={query} onChange={(e) => setQuery(e.target.value)} />
                {matches.length > 0 && (
                  <div className="mt-1 rounded-md border divide-y">
                    {matches.map((m) => (
                      <button key={m.id} type="button" onClick={() => setCamper(m)}
                        className={cn("w-full p-2 text-left text-sm hover:bg-muted")}>
                        {m.first_name} {m.last_name}
                        {m.phone && <span className="ml-2 text-xs text-muted-foreground">{m.phone}</span>}
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
          <div>
            <label className="text-sm font-medium">Notes (optional)</label>
            <Textarea className="mt-1" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>
        <DialogFooter className="gap-2 pb-[env(safe-area-inset-bottom)]">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Log issue"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
