import { useCallback, useEffect, useState } from "react";
import { HardHat } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getCurrentEventId } from "@/lib/eventRuntime";
import { useBackgroundRefresh } from "@/hooks/useBackgroundRefresh";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface WorkerRow {
  id: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  waiver_signed: boolean | null;
  band: string | null;
  bandStatus: string | null;
  meals: number;
}

export const OperationalWorkersReport = ({ refreshTrigger }: { refreshTrigger?: number }) => {
  const [rows, setRows] = useState<WorkerRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const eventId = getCurrentEventId();
    const { data } = await supabase
      .from("attendees")
      .select("id, first_name, last_name, phone, waiver_signed, rfid_tags(uid, status)")
      .eq("event_id", eventId)
      .eq("ticket_type", "operational_worker" as any)
      .order("first_name");
    const ids = (data || []).map((a: any) => a.id);
    const { data: meals } = ids.length
      ? await supabase.from("station_transactions").select("attendee_id").eq("station_type", "meal").in("attendee_id", ids)
      : { data: [] as any[] };
    const mealCount = new Map<string, number>();
    (meals || []).forEach((m: any) => mealCount.set(m.attendee_id, (mealCount.get(m.attendee_id) || 0) + 1));
    setRows(
      (data || []).map((a: any) => {
        const tag = (a.rfid_tags || []).find((t: any) => ["active", "assigned"].includes(t.status)) || null;
        return { ...a, band: tag?.uid ?? null, bandStatus: tag?.status ?? null, meals: mealCount.get(a.id) || 0 };
      })
    );
    setLoading(false);
  }, []);

  useBackgroundRefresh({ onRefresh: load, refreshTrigger });
  useEffect(() => { load(); }, [load]);

  const signed = rows.filter((r) => r.waiver_signed).length;
  const banded = rows.filter((r) => r.band).length;
  const active = rows.filter((r) => r.bandStatus === "active").length;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <HardHat className="h-5 w-5 text-primary" /> Operational Workers
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? <Skeleton className="h-24" /> : (
          <>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[["Workers", rows.length], ["Waivers signed", signed], ["Bands assigned", banded], ["Checked in", active]].map(([l, v]) => (
                <div key={l as string} className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">{l}</p>
                  <p className="text-xl font-bold">{v}</p>
                </div>
              ))}
            </div>
            <ul className="divide-y rounded-lg border">
              {rows.map((r) => (
                <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{r.first_name} {r.last_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {r.band ? `Band ${r.band}` : "No band yet"} • {r.meals} meal{r.meals === 1 ? "" : "s"} served
                    </p>
                  </div>
                  <div className="flex gap-1.5">
                    <Badge variant={r.waiver_signed ? "default" : "outline"}>{r.waiver_signed ? "Waiver signed" : "Waiver needed"}</Badge>
                    {r.bandStatus === "active" && <Badge variant="secondary">Checked in</Badge>}
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </CardContent>
    </Card>
  );
};
