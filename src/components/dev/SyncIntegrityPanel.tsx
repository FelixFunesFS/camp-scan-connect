import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, RefreshCw, ShieldAlert, ArrowLeftRight, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useEvent } from "@/contexts/EventContext";

type CancelledWithBand = {
  attendeeId: string;
  name: string;
  orderId: string | null;
  uid: string;
  status: string;
};

type TransferCandidate = {
  fromAttendeeId: string;
  fromName: string;
  toAttendeeId: string;
  toName: string;
  orderId: string | null;
  uid: string;
};

export const SyncIntegrityPanel = () => {
  const { eventId } = useEvent();
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState<string | null>(null);
  const [cancelled, setCancelled] = useState<CancelledWithBand[]>([]);
  const [transfers, setTransfers] = useState<TransferCandidate[]>([]);

  const load = useCallback(async () => {
    if (!eventId) return;
    setLoading(true);
    try {
      const { data: tags, error } = await supabase
        .from("rfid_tags")
        .select(
          "uid, status, attendee_id, attendees!inner(id, first_name, last_name, order_id, registration_status)",
        )
        .eq("event_id", eventId)
        .eq("attendees.registration_status", "cancelled");
      if (error) throw error;

      const rows: CancelledWithBand[] = (tags ?? []).map((t) => {
        const a = t.attendees as unknown as {
          id: string;
          first_name: string;
          last_name: string;
          order_id: string | null;
        };
        return {
          attendeeId: a.id,
          name: `${a.first_name} ${a.last_name}`.trim(),
          orderId: a.order_id,
          uid: t.uid as string,
          status: t.status as string,
        };
      });
      setCancelled(rows);

      // Transfer candidates: an active registrant on the same order with no band.
      const workingRows = rows.filter((r) => r.status === "assigned" || r.status === "active");
      const orderIds = [...new Set(workingRows.map((r) => r.orderId).filter(Boolean))] as string[];
      if (orderIds.length === 0) {
        setTransfers([]);
        return;
      }

      const { data: sameOrder } = await supabase
        .from("attendees")
        .select("id, first_name, last_name, order_id, registration_status")
        .eq("event_id", eventId)
        .in("order_id", orderIds)
        .neq("registration_status", "cancelled");

      const { data: bandedTags } = await supabase
        .from("rfid_tags")
        .select("attendee_id")
        .eq("event_id", eventId)
        .in("status", ["assigned", "active"]);
      const banded = new Set((bandedTags ?? []).map((t) => t.attendee_id));

      const candidates: TransferCandidate[] = [];
      for (const row of workingRows) {
        const replacement = (sameOrder ?? []).find(
          (a) => a.order_id === row.orderId && !banded.has(a.id),
        );
        if (replacement) {
          candidates.push({
            fromAttendeeId: row.attendeeId,
            fromName: row.name,
            toAttendeeId: replacement.id,
            toName: `${replacement.first_name} ${replacement.last_name}`.trim(),
            orderId: row.orderId,
            uid: row.uid,
          });
        }
      }
      setTransfers(candidates);
    } catch (e) {
      toast.error(`Could not load sync integrity checks: ${(e as Error).message}`);
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    load();
  }, [load]);

  const retireBand = async (uid: string) => {
    setWorking(uid);
    const { error } = await supabase
      .from("rfid_tags")
      .update({
        status: "deactivated",
        deactivated_at: new Date().toISOString(),
        reason: "Registration cancelled",
      })
      .eq("uid", uid);
    setWorking(null);
    if (error) toast.error(error.message);
    else {
      toast.success(`Band ${uid} retired`);
      load();
    }
  };

  const moveBand = async (candidate: TransferCandidate) => {
    setWorking(candidate.uid);
    const { error } = await supabase
      .from("rfid_tags")
      .update({ attendee_id: candidate.toAttendeeId, reason: "Moved after RegFox transfer" })
      .eq("uid", candidate.uid);
    setWorking(null);
    if (error) toast.error(error.message);
    else {
      toast.success(`Band ${candidate.uid} moved to ${candidate.toName}`);
      load();
    }
  };

  const exportCsv = () => {
    const header = "Name,Order,Band,Band status,Retired\n";
    const body = cancelled
      .map((r) => {
        const retired = r.status === "assigned" || r.status === "active" ? "No" : "Yes";
        return [r.name, r.orderId ?? "", r.uid, r.status, retired]
          .map((v) => `"${String(v).replace(/"/g, '""')}"`)
          .join(",");
      })
      .join("\n");
    const blob = new Blob([header + body], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cancelled-registrations-with-bands-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const stillWorking = cancelled.filter((r) => r.status === "assigned" || r.status === "active");
  const retired = cancelled.filter((r) => r.status !== "assigned" && r.status !== "active");

  return (
    <Card>
      <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <CardTitle className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5" />
            Registration Integrity
          </CardTitle>
          <CardDescription>
            Cancelled registrations that still hold a working band, and transfers that need the
            band moved.
          </CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading} className="shrink-0">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          <span className="ml-2">Refresh</span>
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        {!loading && cancelled.length === 0 && transfers.length === 0 && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CheckCircle2 className="h-4 w-4 text-primary" />
            No cancelled registrations are holding a band. Nothing to resolve.
          </div>
        )}

        {cancelled.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-semibold">Cancelled but band still works</h4>
            {cancelled.map((row) => (
              <div
                key={row.uid}
                className="flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{row.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    Band {row.uid} · Order {row.orderId ?? "—"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="destructive">{row.status}</Badge>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={working === row.uid}
                    onClick={() => retireBand(row.uid)}
                  >
                    {working === row.uid ? <Loader2 className="h-4 w-4 animate-spin" /> : "Retire band"}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {transfers.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-semibold">Possible transfers</h4>
            {transfers.map((c) => (
              <div
                key={`${c.uid}-${c.toAttendeeId}`}
                className="flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="flex items-center gap-2 truncate font-medium">
                    {c.fromName}
                    <ArrowLeftRight className="h-4 w-4 shrink-0" />
                    {c.toName}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    Band {c.uid} · Order {c.orderId ?? "—"}
                  </p>
                </div>
                <Button size="sm" disabled={working === c.uid} onClick={() => moveBand(c)}>
                  {working === c.uid ? <Loader2 className="h-4 w-4 animate-spin" /> : "Move band"}
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
