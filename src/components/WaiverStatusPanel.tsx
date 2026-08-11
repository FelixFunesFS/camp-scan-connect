import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getCurrentEventId } from "@/lib/eventRuntime";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { FileSignature, ChevronDown, Download, Search, CheckCircle2, AlertTriangle, Users, FileDown } from "lucide-react";
import { toast } from "sonner";
import { WaiverSigningDialog } from "@/components/WaiverSigningDialog";
import { downloadWaiverReceipt } from "@/lib/waiverReceipt";
import { formatPhoneNumber } from "@/lib/phoneUtils";
import { useIsMobile } from "@/hooks/use-mobile";

interface WaiverAttendee {
  id: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  order_id: string | null;
  waiver_signed: boolean;
}

interface SignatureRecord {
  typed_name: string;
  agreement_version: string;
  name_match: boolean | null;
  signed_at: string;
}

interface WaiverStatusPanelProps {
  /** Bump to force a refresh from the parent's background refresh cycle. */
  refreshTrigger?: number;
  /** Jump the attendee list to the unsigned cohort. */
  onFilterUnsigned?: () => void;
}

export function WaiverStatusPanel({ refreshTrigger, onFilterUnsigned }: WaiverStatusPanelProps) {
  const isMobile = useIsMobile();
  const [attendees, setAttendees] = useState<WaiverAttendee[]>([]);
  const [signatures, setSignatures] = useState<Map<string, SignatureRecord>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [recordSearch, setRecordSearch] = useState("");
  const [signing, setSigning] = useState<WaiverAttendee | null>(null);

  useEffect(() => {
    setIsOpen(!isMobile);
  }, [isMobile]);

  const load = useCallback(async (background = false) => {
    if (!background) setIsLoading(true);
    try {
      const eventId = getCurrentEventId();

      const { data: rows, error } = await supabase
        .from("attendees")
        .select("id, first_name, last_name, phone, order_id, waiver_signed")
        .eq("event_id", eventId)
        .neq("registration_status", "cancelled")
        .order("last_name", { ascending: true });

      if (error) throw error;

      const { data: signatureRows } = await supabase
        .from("waiver_signatures")
        .select("attendee_id, typed_name, agreement_version, name_match, signed_at")
        .eq("event_id", eventId);

      setAttendees(
        (rows || []).map((r) => ({
          id: r.id,
          first_name: r.first_name,
          last_name: r.last_name,
          phone: r.phone,
          order_id: r.order_id,
          waiver_signed: !!r.waiver_signed,
        }))
      );
      setSignatures(
        new Map(
          (signatureRows || []).map((s) => [
            s.attendee_id,
            {
              typed_name: s.typed_name,
              agreement_version: s.agreement_version,
              name_match: s.name_match,
              signed_at: s.signed_at,
            },
          ])
        )
      );
    } catch (err) {
      console.error("Error loading waiver status:", err);
    } finally {
      if (!background) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load(false);
  }, [load]);

  useEffect(() => {
    if (refreshTrigger !== undefined) load(true);
  }, [refreshTrigger, load]);

  const signed = attendees.filter((a) => a.waiver_signed);
  const unsigned = attendees.filter((a) => !a.waiver_signed);
  const percent = attendees.length ? Math.round((signed.length / attendees.length) * 100) : 0;

  /** Unsigned people, grouped by order so families surface together. */
  const unsignedGroups = useMemo(() => {
    const term = search.trim().toLowerCase();
    const matches = term
      ? unsigned.filter((a) =>
          [a.first_name, a.last_name, a.phone, a.order_id]
            .some((f) => f?.toLowerCase().includes(term))
        )
      : unsigned;

    const groups = new Map<string, WaiverAttendee[]>();
    matches.forEach((a) => {
      const key = a.order_id || `solo-${a.id}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(a);
    });
    return Array.from(groups.entries()).map(([orderId, members]) => ({
      orderId: orderId.startsWith("solo-") ? null : orderId,
      members,
    }));
  }, [unsigned, search]);

  /** Signed attendees, searchable, with in-app signature detail when we captured one. */
  const signedMatches = useMemo(() => {
    const term = recordSearch.trim().toLowerCase();
    if (!term) return [];
    return signed
      .filter((a) =>
        [a.first_name, a.last_name, a.phone, a.order_id].some((f) =>
          f?.toLowerCase().includes(term)
        )
      )
      .slice(0, 25);
  }, [signed, recordSearch]);

  const exportUnsigned = () => {
    if (!unsigned.length) {
      toast.info("Every attendee has signed — nothing to export.");
      return;
    }
    const header = ["First Name", "Last Name", "Phone", "Order ID"];
    const rows = unsigned.map((a) => [
      a.first_name,
      a.last_name,
      a.phone ? formatPhoneNumber(a.phone) : "",
      a.order_id || "",
    ]);
    const csv = [header, ...rows]
      .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `unsigned-waivers-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${unsigned.length} unsigned waivers`);
  };

  return (
    <Card>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader className="pb-3">
          <CollapsibleTrigger className="w-full text-left">
            <CardTitle className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2">
                <FileSignature className="h-5 w-5" />
                Waivers
              </span>
              <span className="flex items-center gap-2">
                {!isLoading && unsigned.length > 0 && (
                  <Badge variant="outline" className="text-warning border-warning">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    {unsigned.length} not signed
                  </Badge>
                )}
                {!isLoading && unsigned.length === 0 && attendees.length > 0 && (
                  <Badge variant="outline" className="text-success border-success">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    All signed
                  </Badge>
                )}
                <ChevronDown
                  className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
                />
              </span>
            </CardTitle>
          </CollapsibleTrigger>
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="space-y-5">
            {isLoading ? (
              <div className="animate-pulse space-y-3">
                <div className="h-16 bg-muted rounded" />
                <div className="h-24 bg-muted rounded" />
              </div>
            ) : (
              <>
                {/* Headline counts */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="text-center p-3 rounded-lg bg-success/10">
                    <div className="text-2xl font-bold text-success">{signed.length}</div>
                    <div className="text-xs text-muted-foreground">Signed</div>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-warning/10">
                    <div className="text-2xl font-bold text-warning">{unsigned.length}</div>
                    <div className="text-xs text-muted-foreground">Not signed</div>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-muted/50">
                    <div className="text-2xl font-bold">{percent}%</div>
                    <div className="text-xs text-muted-foreground">Complete</div>
                  </div>
                </div>

                <Progress value={percent} className="h-2" />

                <p className="text-xs text-muted-foreground">
                  Attendees without a signed waiver cannot be activated. Sign on this device or
                  reach out before arrival.
                </p>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      className="pl-9"
                      placeholder="Search unsigned by name, phone or order..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>
                  {onFilterUnsigned && (
                    <Button variant="outline" onClick={onFilterUnsigned}>
                      <Users className="h-4 w-4 mr-2" />
                      Filter list
                    </Button>
                  )}
                  <Button variant="outline" onClick={exportUnsigned}>
                    <Download className="h-4 w-4 mr-2" />
                    Export CSV
                  </Button>
                </div>

                {/* Unsigned queue */}
                {unsignedGroups.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground text-sm">
                    {unsigned.length === 0
                      ? "Every registered attendee has a signed waiver."
                      : "No unsigned attendees match that search."}
                  </div>
                ) : (
                  <ScrollArea className="h-[320px] pr-3">
                    <div className="space-y-3">
                      {unsignedGroups.map((group) => (
                        <div
                          key={group.orderId || group.members[0].id}
                          className="rounded-lg border p-3 space-y-2"
                        >
                          {group.orderId && group.members.length > 1 && (
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Users className="h-3 w-3" />
                              Order {group.orderId} — {group.members.length} unsigned
                            </div>
                          )}
                          {group.members.map((a) => (
                            <div
                              key={a.id}
                              className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
                            >
                              <div className="min-w-0">
                                <div className="font-medium truncate">
                                  {a.first_name} {a.last_name}
                                </div>
                                <div className="text-xs text-muted-foreground truncate">
                                  {a.phone ? formatPhoneNumber(a.phone) : "No phone"}
                                  {a.order_id ? ` • Order ${a.order_id}` : ""}
                                </div>
                              </div>
                              <Button size="sm" onClick={() => setSigning(a)} className="shrink-0">
                                <FileSignature className="h-4 w-4 mr-2" />
                                Sign waiver
                              </Button>
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}

                {/* Signature records */}
                <div className="space-y-3 border-t pt-4">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="text-sm font-medium mr-1">Signature records</span>
                    <Badge variant="outline">Signed in app: {signatures.size}</Badge>
                    <Badge variant="outline">
                      Flagged by import: {Math.max(signed.length - signatures.size, 0)}
                    </Badge>
                  </div>

                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      className="pl-9"
                      placeholder="Look up a signed attendee to view or download their record..."
                      value={recordSearch}
                      onChange={(e) => setRecordSearch(e.target.value)}
                    />
                  </div>

                  {recordSearch.trim() && (
                    <div className="space-y-2">
                      {signedMatches.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-2">
                          No signed attendee matches that search.
                        </p>
                      ) : (
                        signedMatches.map((a) => {
                          const record = signatures.get(a.id);
                          const name = `${a.first_name} ${a.last_name}`;
                          return (
                            <div
                              key={a.id}
                              className="rounded-lg border p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
                            >
                              <div className="min-w-0 space-y-0.5">
                                <div className="font-medium truncate">{name}</div>
                                {record ? (
                                  <div className="text-xs text-muted-foreground">
                                    Signed in app as "{record.typed_name}" •{" "}
                                    {new Date(record.signed_at).toLocaleString()} •{" "}
                                    {record.agreement_version}
                                    {record.name_match === false && " • name mismatch"}
                                  </div>
                                ) : (
                                  <div className="text-xs text-muted-foreground">
                                    Flagged as signed at registration — no in-app signature captured
                                  </div>
                                )}
                              </div>
                              {record ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="shrink-0"
                                  onClick={() =>
                                    downloadWaiverReceipt({
                                      attendeeName: name,
                                      typedName: record.typed_name,
                                      signedAt: record.signed_at,
                                      agreementVersion: record.agreement_version,
                                      nameMatch: record.name_match,
                                    })
                                  }
                                >
                                  <FileDown className="h-4 w-4 mr-2" />
                                  PDF
                                </Button>
                              ) : (
                                <Badge variant="outline" className="shrink-0">
                                  Registration
                                </Badge>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>

      {signing && (
        <WaiverSigningDialog
          open={!!signing}
          onOpenChange={(open) => !open && setSigning(null)}
          attendeeId={signing.id}
          attendeeName={`${signing.first_name} ${signing.last_name}`}
          eventId={getCurrentEventId()}
          onSigned={() => {
            load(true);
          }}
        />
      )}
    </Card>
  );
}
