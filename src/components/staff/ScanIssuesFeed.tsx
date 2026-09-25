import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronUp, RefreshCw } from "lucide-react";
import { scanIssueLabel } from "@/components/ScanIssueDialog";

interface Issue {
  id: string; scanned_code: string | null; station_type: string; issue_type: string;
  attendee_label: string | null; notes: string | null; status: string; created_at: string;
}

export function ScanIssuesFeed() {
  const [open, setOpen] = useState(false);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("scan_issues").select("*")
      .order("created_at", { ascending: false }).limit(100);
    setIssues((data as Issue[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const ch = supabase.channel("scan_issues_feed")
      .on("postgres_changes", { event: "*", schema: "public", table: "scan_issues" }, load)
      .subscribe();
    const t = setInterval(load, 30000);
    return () => { supabase.removeChannel(ch); clearInterval(t); };
  }, [load]);

  const resolve = async (id: string) => {
    await supabase.from("scan_issues").update({ status: "resolved", resolved_at: new Date().toISOString() }).eq("id", id);
    load();
  };

  const openCount = issues.filter((i) => i.status === "open").length;

  return (
    <Card>
      <CardHeader className="cursor-pointer py-3" onClick={() => setOpen(!open)}>
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2">
            Station Scan Issues
            {openCount > 0 && <Badge variant="destructive">{openCount} open</Badge>}
          </span>
          {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </CardTitle>
      </CardHeader>
      {open && (
        <CardContent className="space-y-2">
          <div className="flex justify-end">
            <Button size="sm" variant="outline" onClick={load} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} />Refresh
            </Button>
          </div>
          {issues.length === 0 && <p className="text-sm text-muted-foreground">No issues logged.</p>}
          {issues.map((i) => (
            <div key={i.id} className="rounded-md border p-3 text-sm space-y-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-mono font-medium">{i.scanned_code ?? "—"}</span>
                <Badge variant={i.status === "open" ? "destructive" : "secondary"}>{i.status}</Badge>
              </div>
              <div>{scanIssueLabel(i.issue_type)} · <span className="text-muted-foreground">{i.station_type.replace(/_/g, " ")}</span></div>
              {i.attendee_label && <div>Camper: {i.attendee_label}</div>}
              {i.notes && <div className="text-muted-foreground">{i.notes}</div>}
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                {new Date(i.created_at).toLocaleString("en-US", { timeZone: "America/New_York", weekday: "short", hour: "numeric", minute: "2-digit" })} ET
                {i.status === "open" && <Button size="sm" variant="outline" onClick={() => resolve(i.id)}>Mark resolved</Button>}
              </div>
            </div>
          ))}
        </CardContent>
      )}
    </Card>
  );
}
