import { useCallback, useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { Activity, AlertCircle, CheckCircle2, Clock, Webhook } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useEvent } from "@/contexts/EventContext";

interface Delivery {
  id: string;
  event_type: string | null;
  regfox_registration_id: string | null;
  status: string;
  received_at: string;
  processed_at: string | null;
  error_message: string | null;
}

export const WebhookRegistrantTimeline = () => {
  const { selectedEvent } = useEvent();
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!selectedEvent?.regfox_form_id) {
      setDeliveries([]);
      setLoading(false);
      return;
    }
    const { data, error } = await supabase
      .from("regfox_webhook_deliveries")
      .select("id,event_type,regfox_registration_id,status,received_at,processed_at,error_message")
      .eq("regfox_form_id", selectedEvent.regfox_form_id)
      .order("received_at", { ascending: false })
      .limit(50);
    if (error) console.error("Failed to load RegFox webhook activity:", error);
    setDeliveries(data ?? []);
    setLoading(false);
  }, [selectedEvent?.regfox_form_id]);

  useEffect(() => {
    load();
    const channel = supabase.channel("regfox-webhook-deliveries")
      .on("postgres_changes", { event: "*", schema: "public", table: "regfox_webhook_deliveries" }, load)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [load]);

  const successful = deliveries.filter((item) => item.status === "processed").length;
  const failed = deliveries.filter((item) => item.status === "error").length;
  const latest = deliveries[0] ?? null;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Webhook deliveries</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{deliveries.length}</div><p className="text-xs text-muted-foreground">Latest 50 for this event</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Processed</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{successful}</div><p className="text-xs text-muted-foreground">{failed} failed deliveries</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Last signal</CardTitle></CardHeader><CardContent><div className="text-sm font-semibold">{latest ? formatDistanceToNow(new Date(latest.received_at), { addSuffix: true }) : "Not received yet"}</div><p className="text-xs text-muted-foreground">No signal is shown as live until received</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Webhook className="h-5 w-5" />RegFox Webhook Activity</CardTitle><CardDescription>Actual change notifications received from RegFox for {selectedEvent?.name ?? "the selected event"}.</CardDescription></CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px]">
            <div className="space-y-3">
              {loading && <p className="py-8 text-center text-muted-foreground">Loading webhook activity…</p>}
              {!loading && deliveries.length === 0 && <div className="py-12 text-center text-muted-foreground"><Activity className="mx-auto mb-3 h-8 w-8 opacity-50" /><p className="font-medium">No webhook deliveries received</p><p className="text-sm">The hourly API sync remains the recovery path.</p></div>}
              {deliveries.map((delivery) => (
                <div key={delivery.id} className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0"><p className="font-medium">{delivery.event_type ?? "Registration change"}</p><p className="break-words text-sm text-muted-foreground">Registration {delivery.regfox_registration_id ?? "not supplied"} · {formatDistanceToNow(new Date(delivery.received_at), { addSuffix: true })}</p>{delivery.error_message && <p className="mt-1 text-sm text-destructive">{delivery.error_message}</p>}</div>
                  <Badge variant={delivery.status === "error" ? "destructive" : "outline"} className="w-fit gap-1">{delivery.status === "processed" ? <CheckCircle2 className="h-3 w-3" /> : delivery.status === "error" ? <AlertCircle className="h-3 w-3" /> : <Clock className="h-3 w-3" />}{delivery.status}</Badge>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};