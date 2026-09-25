import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getCurrentEventId } from "@/lib/eventRuntime";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, History, RefreshCw } from "lucide-react";

interface Row {
  uid: string;
  status: string;
  reason: string | null;
  when: string | null;
  owner: string;
  by: string;
  category: string;
}

const categorize = (reason: string | null, status: string) => {
  const r = (reason || "").toLowerCase();
  if (r.includes("cancel")) return "Registration cancelled";
  if (r.includes("lost") || status === "lost") return "Lost / missing packet";
  if (r.includes("damag")) return "Damaged";
  if (status === "replaced" || r.includes("replac")) return "Replaced";
  return "Other / manual";
};

export function RetiredBandsHistory() {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string>("all");

  const load = async () => {
    setLoading(true);
    const eventId = getCurrentEventId();
    const { data: tags } = await supabase
      .from("rfid_tags")
      .select("uid,status,reason,deactivated_at,attendee_id")
      .eq("event_id", eventId)
      .in("status", ["lost", "deactivated", "replaced"]);
    const uids = (tags || []).map((t) => t.uid);
    const { data: txs } = uids.length
      ? await supabase
          .from("station_transactions")
          .select("rfid_uid,attendee_id,staff_id,transaction_type,created_at,extra_data")
          .in("rfid_uid", uids)
          .order("created_at", { ascending: false })
      : { data: [] as any[] };
    const txByUid = new Map<string, any[]>();
    (txs || []).forEach((t: any) => {
      const l = txByUid.get(t.rfid_uid) || [];
      l.push(t);
      txByUid.set(t.rfid_uid, l);
    });
    const attIds = new Set<string>();
    const staffIds = new Set<string>();
    (tags || []).forEach((t) => {
      const list = txByUid.get(t.uid) || [];
      const a = t.attendee_id || list.find((x) => x.attendee_id)?.attendee_id;
      if (a) attIds.add(a);
      list.forEach((x) => x.staff_id && staffIds.add(x.staff_id));
    });
    const [{ data: atts }, { data: staff }] = await Promise.all([
      attIds.size
        ? supabase.from("attendees").select("id,first_name,last_name").in("id", [...attIds])
        : Promise.resolve({ data: [] as any[] }),
      staffIds.size
        ? supabase.from("staff").select("user_id,display_name").in("user_id", [...staffIds])
        : Promise.resolve({ data: [] as any[] }),
    ]);
    const aMap = new Map((atts || []).map((a: any) => [a.id, `${a.first_name} ${a.last_name}`]));
    const sMap = new Map((staff || []).map((s: any) => [s.user_id, s.display_name]));
    const out: Row[] = (tags || []).map((t) => {
      const list = txByUid.get(t.uid) || [];
      const deact = list.find((x) => x.transaction_type === "deactivate");
      const a = t.attendee_id || list.find((x) => x.attendee_id)?.attendee_id;
      const reason = t.reason || deact?.extra_data?.reason || null;
      const staffId = deact?.staff_id;
      return {
        uid: t.uid,
        status: t.status,
        reason,
        when: t.deactivated_at || deact?.created_at || null,
        owner: (a && aMap.get(a)) || "Unknown",
        by: staffId ? sMap.get(staffId) || "Staff" : reason?.toLowerCase().includes("regfox") ? "RegFox sync" : "Not recorded",
        category: categorize(reason, t.status),
      };
    });
    out.sort((x, y) => (y.when || "").localeCompare(x.when || ""));
    setRows(out);
    setLoading(false);
  };

  useEffect(() => {
    if (open && rows.length === 0) load();
  }, [open]);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    rows.forEach((r) => (c[r.category] = (c[r.category] || 0) + 1));
    return c;
  }, [rows]);

  const shown = rows.filter(
    (r) =>
      (cat === "all" || r.category === cat) &&
      (!q || `${r.uid} ${r.owner} ${r.reason} ${r.by}`.toLowerCase().includes(q.toLowerCase())),
  );

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer py-3">
            <CardTitle className="flex items-center justify-between gap-2 text-base">
              <span className="flex items-center gap-2 min-w-0">
                <History className="h-4 w-4 shrink-0" />
                <span className="truncate">Retired Bands History</span>
                {rows.length > 0 && <Badge variant="secondary">{rows.length}</Badge>}
              </span>
              <ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Every band that was lost, replaced or turned off — who it belonged to, why, and who did it.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant={cat === "all" ? "default" : "outline"} className="min-h-[40px]" onClick={() => setCat("all")}>
                All ({rows.length})
              </Button>
              {Object.entries(counts).map(([k, v]) => (
                <Button key={k} size="sm" variant={cat === k ? "default" : "outline"} className="min-h-[40px]" onClick={() => setCat(k)}>
                  {k} ({v})
                </Button>
              ))}
            </div>
            <div className="flex gap-2">
              <Input placeholder="Search band code, name, reason…" value={q} onChange={(e) => setQ(e.target.value)} />
              <Button variant="outline" size="icon" onClick={load} disabled={loading} aria-label="Refresh history">
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              </Button>
            </div>
            <div className="max-h-[480px] space-y-2 overflow-y-auto">
              {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
              {!loading && shown.length === 0 && <p className="text-sm text-muted-foreground">No retired bands found.</p>}
              {shown.map((r) => (
                <div key={r.uid} className="rounded-md border p-3 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-mono font-semibold">{r.uid}</span>
                    <Badge variant="outline" className="capitalize">{r.status}</Badge>
                  </div>
                  <div className="mt-1 truncate font-medium">{r.owner}</div>
                  <div className="text-muted-foreground break-words">Reason: {r.reason || "Not recorded"}</div>
                  <div className="text-xs text-muted-foreground">
                    By {r.by}
                    {r.when ? ` • ${new Date(r.when).toLocaleString("en-US", { timeZone: "America/New_York", dateStyle: "medium", timeStyle: "short" })}` : ""}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
