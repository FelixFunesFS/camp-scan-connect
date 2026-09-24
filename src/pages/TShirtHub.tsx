import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shirt, Search, Package, CheckCircle2, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getCurrentEventId } from "@/lib/eventRuntime";
import { TShirtService } from "@/services/tshirtService";
import { formatPhoneNumber } from "@/lib/phoneUtils";
import { formatStandardDateTime } from "@/utils/dateTimeUtils";
import { ApparelProductBadge } from "@/components/ApparelProductBadge";

interface HubOrder {
  id: string;
  productLine: string;
  style: string;
  size: string;
  quantity: number;
  isPickedUp: boolean;
  pickedUpCount?: number;
  pickupTime?: string;
}

interface HubPerson {
  id: string;
  name: string;
  phone: string | null;
  orderId: string | null;
  rfidUid: string | null;
  orders: HubOrder[];
  totalOrdered: number;
  totalPickedUp: number;
}

const PAGE_SIZE = 25;

export default function TShirtHub() {
  const [people, setPeople] = useState<HubPerson[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"pending" | "complete" | "all">("pending");
  const [productFilter, setProductFilter] = useState("all");
  const [selected, setSelected] = useState<Record<string, string[]>>({});
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const eventId = getCurrentEventId();
      const [{ data: attendees, error }, { data: pickups }] = await Promise.all([
        supabase
          .from("attendees")
          .select("id, first_name, last_name, phone, order_id, custom_fields, t_shirt_size, rfid_tags(uid, status)")
          .eq("event_id", eventId)
          .in("registration_status", ["registered", "pending"]),
        supabase
          .from("station_transactions")
          .select("attendee_id, extra_data, created_at")
          .eq("event_id", eventId)
          .eq("station_type", "tshirts")
          .eq("transaction_type", "tshirt_pickup"),
      ]);

      if (error) throw error;

      const byAttendee = new Map<string, Array<{ extra_data: any; created_at: string }>>();
      (pickups || []).forEach((tx: any) => {
        const list = byAttendee.get(tx.attendee_id) || [];
        list.push({ extra_data: tx.extra_data, created_at: tx.created_at });
        byAttendee.set(tx.attendee_id, list);
      });

      const rows: HubPerson[] = (attendees || [])
        .map((a: any) => {
          const info = TShirtService.computeAttendeeTShirtInfo(
            a.id,
            a.custom_fields,
            a.t_shirt_size,
            byAttendee.get(a.id) || []
          );
          const tags = Array.isArray(a.rfid_tags) ? a.rfid_tags : a.rfid_tags ? [a.rfid_tags] : [];
          const totalOrdered = info.orders.reduce((s, o) => s + o.quantity, 0);
          const totalPickedUp = info.orders.reduce(
            (s, o) => s + (o.pickedUpCount ?? (o.isPickedUp ? o.quantity : 0)),
            0
          );
          return {
            id: a.id,
            name: `${a.first_name} ${a.last_name}`.trim(),
            phone: a.phone,
            orderId: a.order_id,
            rfidUid: tags[0]?.uid ?? null,
            orders: info.orders as HubOrder[],
            totalOrdered,
            totalPickedUp,
          };
        })
        .filter((p) => p.totalOrdered > 0)
        .sort((a, b) => a.name.localeCompare(b.name));

      setPeople(rows);
    } catch (e) {
      console.error("Error loading t-shirt hub data", e);
      toast.error("Could not load shirt orders");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const productLines = useMemo(() => {
    const set = new Set<string>();
    people.forEach((p) => p.orders.forEach((o) => set.add(o.productLine)));
    return Array.from(set).sort();
  }, [people]);

  const stats = useMemo(() => {
    let ordered = 0;
    let picked = 0;
    const sizes: Record<string, { ordered: number; picked: number }> = {};
    people.forEach((p) =>
      p.orders.forEach((o) => {
        if (productFilter !== "all" && o.productLine !== productFilter) return;
        const up = o.pickedUpCount ?? (o.isPickedUp ? o.quantity : 0);
        ordered += o.quantity;
        picked += up;
        const key = o.size || "Unknown";
        sizes[key] = sizes[key] || { ordered: 0, picked: 0 };
        sizes[key].ordered += o.quantity;
        sizes[key].picked += up;
      })
    );
    return { ordered, picked, remaining: ordered - picked, sizes };
  }, [people, productFilter]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    const digits = term.replace(/\D/g, "");
    return people.filter((p) => {
      if (productFilter !== "all" && !p.orders.some((o) => o.productLine === productFilter)) return false;
      const complete = p.totalPickedUp >= p.totalOrdered;
      if (filter === "pending" && complete) return false;
      if (filter === "complete" && !complete) return false;
      if (!term) return true;
      return (
        p.name.toLowerCase().includes(term) ||
        (p.orderId || "").toLowerCase().includes(term) ||
        (p.rfidUid || "").toLowerCase().includes(term) ||
        (digits.length >= 3 && (p.phone || "").replace(/\D/g, "").includes(digits))
      );
    });
  }, [people, search, filter, productFilter]);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [search, filter, productFilter]);

  const toggleOrder = (personId: string, orderId: string, checked: boolean) => {
    setSelected((prev) => {
      const current = prev[personId] || [];
      return {
        ...prev,
        [personId]: checked ? [...current, orderId] : current.filter((id) => id !== orderId),
      };
    });
  };

  const handlePickup = async (person: HubPerson) => {
    const ids = selected[person.id] || [];
    const orders = person.orders.filter((o) => ids.includes(o.id) && !o.isPickedUp);
    if (!orders.length) {
      toast.error("Select at least one shirt to hand out");
      return;
    }
    setProcessingId(person.id);
    try {
      await TShirtService.recordTShirtPickups(person.id, orders as any, person.rfidUid || undefined);
      toast.success(`Recorded ${orders.length} pickup${orders.length > 1 ? "s" : ""} for ${person.name}`);
      setSelected((prev) => ({ ...prev, [person.id]: [] }));
      await load();
    } catch (e: any) {
      toast.error(e?.message || "Could not record pickup");
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="container mx-auto space-y-4 p-3 pb-24 sm:space-y-6 sm:p-6">
      <div className="flex flex-row items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <div className="rounded-lg bg-muted p-2 sm:p-3">
            <Shirt className="h-5 w-5 sm:h-6 sm:w-6" />
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-xl font-bold sm:text-3xl">T-Shirt Hub</h1>
            <p className="truncate text-xs text-muted-foreground sm:text-sm">
              Search shirt orders and hand out shirts
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          onClick={load}
          disabled={loading}
          className="h-11 w-11 shrink-0 p-0 sm:w-auto sm:px-4"
          aria-label="Refresh shirt orders"
        >
          <RefreshCw className={`h-4 w-4 sm:mr-2 ${loading ? "animate-spin" : ""}`} />
          <span className="hidden sm:inline">Refresh</span>
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <Card>
          <CardContent className="p-3 sm:p-4">
            <p className="text-[11px] leading-tight text-muted-foreground sm:text-sm">Ordered</p>
            <p className="text-xl font-bold sm:text-2xl">{stats.ordered}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4">
            <p className="text-[11px] leading-tight text-muted-foreground sm:text-sm">Handed out</p>
            <p className="text-xl font-bold text-success sm:text-2xl">{stats.picked}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4">
            <p className="text-[11px] leading-tight text-muted-foreground sm:text-sm">To collect</p>
            <p className="text-xl font-bold text-warning sm:text-2xl">{stats.remaining}</p>
          </CardContent>
        </Card>
      </div>


      {Object.keys(stats.sizes).length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Package className="h-4 w-4" />
              Remaining by size
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.sizes)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([size, v]) => (
                  <Badge key={size} variant="outline" className="text-xs">
                    {size}: {v.ordered - v.picked} left of {v.ordered}
                  </Badge>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="sticky top-0 z-20 shadow-sm">
        <CardContent className="space-y-3 p-3 sm:p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, phone, order or band"
              className="h-11 pl-9 text-base"
              inputMode="search"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="none"
              aria-label="Search shirt orders"
            />
          </div>
          <Tabs value={filter} onValueChange={(v) => setFilter(v as any)}>
            <TabsList className="grid h-11 w-full grid-cols-3">
              <TabsTrigger value="pending" className="h-9 text-xs sm:text-sm">To collect</TabsTrigger>
              <TabsTrigger value="complete" className="h-9 text-xs sm:text-sm">Collected</TabsTrigger>
              <TabsTrigger value="all" className="h-9 text-xs sm:text-sm">All</TabsTrigger>
            </TabsList>
          </Tabs>

          {productLines.length > 1 && (
            <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
              <Button
                size="sm"
                variant={productFilter === "all" ? "default" : "outline"}
                onClick={() => setProductFilter("all")}
                className="h-9 shrink-0"
              >
                All shirts
              </Button>
              {productLines.map((line) => (
                <Button
                  key={line}
                  size="sm"
                  variant={productFilter === line ? "default" : "outline"}
                  onClick={() => setProductFilter(line)}
                  className="h-9 shrink-0"
                >
                  {line}
                </Button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {loading ? (
        <Card>
          <CardContent className="flex items-center justify-center gap-2 p-10 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading shirt orders…
          </CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            No shirt orders match this search.
          </CardContent>
        </Card>
      ) : (
        <>
          <p className="text-xs text-muted-foreground">
            Showing {Math.min(visibleCount, filtered.length)} of {filtered.length} people
          </p>
          <div className="space-y-3">
            {filtered.slice(0, visibleCount).map((person) => {
              const complete = person.totalPickedUp >= person.totalOrdered;
              const chosen = selected[person.id] || [];
              return (
                <Card key={person.id}>
                  <CardContent className="space-y-3 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate font-semibold">{person.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {person.phone ? formatPhoneNumber(person.phone) : "No phone"} · Order{" "}
                          {person.orderId || "—"} · Band {person.rfidUid || "none"}
                        </p>
                      </div>
                      <Badge
                        variant="outline"
                        className={
                          complete
                            ? "bg-success/10 text-success border-success/20"
                            : "bg-warning/10 text-warning border-warning/20"
                        }
                      >
                        {person.totalPickedUp}/{person.totalOrdered} handed out
                      </Badge>
                    </div>

                    <ul className="space-y-2">
                      {person.orders.map((order) => {
                        const picked = order.pickedUpCount ?? (order.isPickedUp ? order.quantity : 0);
                        const done = picked >= order.quantity;
                        return (
                          <li
                            key={order.id}
                            className="flex flex-wrap items-center gap-3 rounded-md border p-3"
                          >
                            {!done && (
                              <Checkbox
                                checked={chosen.includes(order.id)}
                                onCheckedChange={(c) => toggleOrder(person.id, order.id, c === true)}
                                aria-label={`Select ${order.productLine} ${order.size} for ${person.name}`}
                              />
                            )}
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <ApparelProductBadge productLine={order.productLine as any} />
                                <span className="text-sm font-medium">
                                  {order.style} · {order.size}
                                  {order.quantity > 1 ? ` ×${order.quantity}` : ""}
                                </span>
                              </div>
                              {order.pickupTime && (
                                <p className="mt-1 text-xs text-muted-foreground">
                                  Last handed out {formatStandardDateTime(order.pickupTime)}
                                </p>
                              )}
                            </div>
                            {done ? (
                              <Badge className="bg-success text-success-foreground text-xs">
                                <CheckCircle2 className="mr-1 h-3 w-3" />
                                Collected
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs">
                                {picked}/{order.quantity}
                              </Badge>
                            )}
                          </li>
                        );
                      })}
                    </ul>

                    {!complete && (
                      <Button
                        className="h-11 w-full"
                        disabled={chosen.length === 0 || processingId === person.id}
                        onClick={() => handlePickup(person)}
                      >
                        {processingId === person.id ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Shirt className="mr-2 h-4 w-4" />
                        )}
                        Mark selected as handed out
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
          {visibleCount < filtered.length && (
            <Button
              variant="outline"
              className="h-11 w-full"
              onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
            >
              Show more
            </Button>
          )}
        </>
      )}
    </div>
  );
}
