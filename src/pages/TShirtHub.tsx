import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Shirt, Search, Package, CheckCircle2, Loader2, RefreshCw, ScanLine, ChevronDown } from "lucide-react";

import { InlineCameraScanner } from "@/components/InlineCameraScanner";
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
  unitIndex?: number;
  unitCount?: number;
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

const SIZE_ORDER = ["xs", "s", "sm", "small", "m", "md", "med", "medium", "l", "lg", "large", "xl", "2x", "2xl", "3x", "3xl", "4x", "4xl", "5x", "5xl"];

function sizeRank(size: string): number {
  const key = (size || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  const idx = SIZE_ORDER.indexOf(key);
  return idx === -1 ? 999 : idx;
}


export default function TShirtHub() {
  const [people, setPeople] = useState<HubPerson[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"pending" | "complete" | "all">("pending");
  const [productFilter, setProductFilter] = useState("all");
  const [selected, setSelected] = useState<Record<string, string[]>>({});
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [openLines, setOpenLines] = useState<string[]>([]);


  const handleScan = useCallback((code: string) => {
    const value = (code || "").trim();
    if (!value) return;
    setSearch(value);
    setFilter("all");
    setScannerOpen(false);
    toast.success(`Scanned band ${value}`);
  }, []);

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
    // productLine -> style/fit -> size -> counts
    const lines = new Map<
      string,
      {
        ordered: number;
        picked: number;
        styles: Map<string, { ordered: number; picked: number; sizes: Map<string, { ordered: number; picked: number }> }>;
      }
    >();

    people.forEach((p) =>
      p.orders.forEach((o) => {
        if (productFilter !== "all" && o.productLine !== productFilter) return;
        const up = o.pickedUpCount ?? (o.isPickedUp ? o.quantity : 0);
        ordered += o.quantity;
        picked += up;

        const lineKey = o.productLine || "Other";
        const styleKey = o.style || "T-Shirt";
        const sizeKey = o.size || "Unknown";

        if (!lines.has(lineKey)) lines.set(lineKey, { ordered: 0, picked: 0, styles: new Map() });
        const line = lines.get(lineKey)!;
        line.ordered += o.quantity;
        line.picked += up;

        if (!line.styles.has(styleKey))
          line.styles.set(styleKey, { ordered: 0, picked: 0, sizes: new Map() });
        const style = line.styles.get(styleKey)!;
        style.ordered += o.quantity;
        style.picked += up;

        if (!style.sizes.has(sizeKey)) style.sizes.set(sizeKey, { ordered: 0, picked: 0 });
        const size = style.sizes.get(sizeKey)!;
        size.ordered += o.quantity;
        size.picked += up;
      })
    );

    const inventory = Array.from(lines.entries())
      .map(([productLine, line]) => ({
        productLine,
        ordered: line.ordered,
        picked: line.picked,
        remaining: line.ordered - line.picked,
        styles: Array.from(line.styles.entries())
          .map(([style, s]) => ({
            style,
            ordered: s.ordered,
            picked: s.picked,
            remaining: s.ordered - s.picked,
            sizes: Array.from(s.sizes.entries())
              .map(([size, v]) => ({
                size,
                ordered: v.ordered,
                picked: v.picked,
                remaining: v.ordered - v.picked,
              }))
              .sort((a, b) => sizeRank(a.size) - sizeRank(b.size) || a.size.localeCompare(b.size)),
          }))
          .sort((a, b) => a.style.localeCompare(b.style)),
      }))
      .sort((a, b) => a.productLine.localeCompare(b.productLine));

    return { ordered, picked, remaining: ordered - picked, inventory };
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


      {stats.inventory.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex flex-wrap items-center justify-between gap-2 text-base">
              <span className="flex items-center gap-2">
                <Package className="h-4 w-4" />
                Shirts left by style, fit and size
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-9 px-2 text-xs"
                onClick={() =>
                  setOpenLines(
                    openLines.length === stats.inventory.length
                      ? []
                      : stats.inventory.map((l) => l.productLine)
                  )
                }
              >
                {openLines.length === stats.inventory.length ? "Collapse all" : "Expand all"}
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {stats.inventory.map((line) => {
              const open = openLines.includes(line.productLine);
              return (
                <Collapsible
                  key={line.productLine}
                  open={open}
                  onOpenChange={(v) =>
                    setOpenLines((prev) =>
                      v ? [...prev, line.productLine] : prev.filter((l) => l !== line.productLine)
                    )
                  }
                >
                  <CollapsibleTrigger asChild>
                    <button
                      type="button"
                      className="flex min-h-[56px] w-full items-center justify-between gap-2 rounded-md border p-3 text-left active:bg-muted/60"
                    >
                      <span className="flex min-w-0 flex-wrap items-center gap-2">
                        <ApparelProductBadge productLine={line.productLine as any} />
                        <span className="text-sm text-muted-foreground">
                          {line.remaining} to collect of {line.ordered}
                        </span>
                      </span>
                      <ChevronDown
                        className={`h-4 w-4 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
                      />
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-3 px-1 pb-2 pt-3">
                    {line.styles.map((style) => (
                      <div key={style.style} className="space-y-2">
                        <div className="flex flex-wrap items-baseline justify-between gap-1">
                          <p className="break-words text-sm font-medium">{style.style}</p>
                          <p className="text-xs text-muted-foreground">
                            {style.remaining} left of {style.ordered}
                          </p>
                        </div>
                        <div className="grid grid-cols-3 gap-2 xs:grid-cols-4 sm:grid-cols-6 lg:grid-cols-8">
                          {style.sizes.map((s) => (
                            <div
                              key={s.size}
                              className="rounded-md border bg-muted/40 p-2 text-center"
                            >
                              <p className="truncate text-[11px] uppercase text-muted-foreground">
                                {s.size}
                              </p>
                              <p className="text-sm font-semibold">
                                {s.remaining}
                                <span className="text-xs font-normal text-muted-foreground">
                                  {" "}
                                  / {s.ordered}
                                </span>
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </CollapsibleContent>
                </Collapsible>
              );
            })}
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
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant={scannerOpen ? "default" : "outline"}
              onClick={() => setScannerOpen((v) => !v)}
              className="h-11 flex-1 justify-center"
              aria-expanded={scannerOpen}
            >
              <ScanLine className="mr-2 h-4 w-4" />
              {scannerOpen ? "Hide scanner" : "Scan wristband"}
            </Button>
            {search && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => setSearch("")}
                className="h-11 shrink-0 px-3"
              >
                Clear
              </Button>
            )}
          </div>

          {scannerOpen && (
            <InlineCameraScanner
              autoStart
              compact
              onScan={handleScan}
              className="[&_video]:max-h-[32vh]"
            />
          )}

          <Tabs value={filter} onValueChange={(v) => setFilter(v as any)}>
            <TabsList className="grid h-11 w-full grid-cols-3">
              <TabsTrigger value="pending" className="h-9 min-w-0 text-xs sm:text-sm">To collect</TabsTrigger>
              <TabsTrigger value="complete" className="h-9 min-w-0 text-xs sm:text-sm">Collected</TabsTrigger>
              <TabsTrigger value="all" className="h-9 min-w-0 text-xs sm:text-sm">All</TabsTrigger>
            </TabsList>
          </Tabs>

          {productLines.length > 1 && (
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant={productFilter === "all" ? "default" : "outline"}
                onClick={() => setProductFilter("all")}
                className="h-9 max-w-full"
              >
                <span className="truncate">All shirts</span>
              </Button>
              {productLines.map((line) => (
                <Button
                  key={line}
                  size="sm"
                  variant={productFilter === line ? "default" : "outline"}
                  onClick={() => setProductFilter(line)}
                  className="h-9 max-w-full"
                >
                  <span className="truncate">{line}</span>
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
                  <CardContent className="space-y-3 p-3 sm:p-4">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <p className="break-words font-semibold leading-tight">{person.name}</p>
                        <p className="break-words text-xs text-muted-foreground">
                          {person.phone ? formatPhoneNumber(person.phone) : "No phone"}
                          <span className="hidden sm:inline"> · Order {person.orderId || "—"}</span>
                          {" · Band "}
                          {person.rfidUid || "none"}
                        </p>
                      </div>
                      <Badge
                        variant="outline"
                        className={`w-fit shrink-0 whitespace-nowrap ${
                          complete
                            ? "bg-success/10 text-success border-success/20"
                            : "bg-warning/10 text-warning border-warning/20"
                        }`}
                      >
                        {person.totalPickedUp}/{person.totalOrdered} handed out
                      </Badge>
                    </div>

                    <ul className="space-y-2">
                      {person.orders.map((order) => {
                        const picked = order.pickedUpCount ?? (order.isPickedUp ? order.quantity : 0);
                        const done = picked >= order.quantity;
                        const rowContent = (
                          <>
                            {!done && (
                              <Checkbox
                                checked={chosen.includes(order.id)}
                                onCheckedChange={(c) => toggleOrder(person.id, order.id, c === true)}
                                className="h-5 w-5 shrink-0"
                                aria-label={`Select ${order.productLine} ${order.size} for ${person.name}`}
                              />
                            )}
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <ApparelProductBadge productLine={order.productLine as any} />
                                <span className="break-words text-sm font-medium">
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
                              <Badge className="shrink-0 bg-success text-success-foreground text-xs">
                                <CheckCircle2 className="mr-1 h-3 w-3" />
                                Collected
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="shrink-0 text-xs">
                                {picked}/{order.quantity}
                              </Badge>
                            )}
                          </>
                        );
                        return (
                          <li key={order.id}>
                            {done ? (
                              <div className="flex min-h-[56px] items-center gap-3 rounded-md border p-3">
                                {rowContent}
                              </div>
                            ) : (
                              <label
                                className="flex min-h-[56px] cursor-pointer items-center gap-3 rounded-md border p-3 active:bg-muted/60"
                                onClick={(e) => {
                                  if ((e.target as HTMLElement).closest("button")) return;
                                  if ((e.target as HTMLElement).getAttribute("role") === "checkbox") return;
                                  e.preventDefault();
                                  toggleOrder(person.id, order.id, !chosen.includes(order.id));
                                }}
                              >
                                {rowContent}
                              </label>
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
