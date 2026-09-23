import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getCurrentEventId } from "@/lib/eventRuntime";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { FileSignature, ChevronDown, Download, Search, FileDown } from "lucide-react";
import { toast } from "sonner";
import { downloadWaiverArchive, downloadWaiverReceipt } from "@/lib/waiverReceipt";
import { getWaiverReceiptUrl } from "@/services/waiverStorageService";
import { formatPhoneNumber } from "@/lib/phoneUtils";

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
  receipt_path: string | null;
}

interface WaiverStatusPanelProps {
  /** Bump to force a refresh from the parent's background refresh cycle. */
  refreshTrigger?: number;
  /** Jump the attendee list to the unsigned cohort. */
  onFilterUnsigned?: () => void;
}

export function WaiverStatusPanel({ refreshTrigger, onFilterUnsigned }: WaiverStatusPanelProps) {
  const [attendees, setAttendees] = useState<WaiverAttendee[]>([]);
  const [signatures, setSignatures] = useState<Map<string, SignatureRecord>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [recordSearch, setRecordSearch] = useState("");

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
        .select("attendee_id, typed_name, agreement_version, name_match, signed_at, receipt_path")
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
              receipt_path: s.receipt_path ?? null,
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

  /** Opens the PDF copy stored in the backend at signing time. */
  const openStoredCopy = async (attendeeId: string, path: string | null) => {
    if (!path) {
      toast.info("No stored copy for this signature — use PDF to regenerate it.");
      return;
    }
    const url = await getWaiverReceiptUrl(path);
    if (!url) {
      toast.error("Could not open the stored waiver copy.");
      return;
    }
    window.open(url, "_blank", "noopener,noreferrer");
  };

  /** One combined PDF with every in-app signature for this event. */
  const downloadAllSigned = () => {
    const nameById = new Map(attendees.map((a) => [a.id, `${a.first_name} ${a.last_name}`]));
    const records = Array.from(signatures.entries()).map(([attendeeId, record]) => ({
      attendeeName: nameById.get(attendeeId) || record.typed_name,
      typedName: record.typed_name,
      signedAt: record.signed_at,
      agreementVersion: record.agreement_version,
      nameMatch: record.name_match,
    }));
    if (!records.length) {
      toast.info("No in-app signatures captured yet.");
      return;
    }
    downloadWaiverArchive(records);
    toast.success(`Downloaded ${records.length} signed waivers`);
  };

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
    <Card className="border-dashed">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader className="p-3 sm:p-4">
          <CollapsibleTrigger className="w-full min-h-11 text-left">
            <CardTitle className="flex flex-wrap items-center justify-between gap-2 text-base">
              <span className="flex items-center gap-2">
                <FileSignature className="h-5 w-5" />
                Waiver records &amp; exports
              </span>
              <span className="flex items-center gap-2">
                {!isLoading && <Badge variant="outline">{unsigned.length} missing</Badge>}
                <ChevronDown
                  className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
                />
              </span>
            </CardTitle>
          </CollapsibleTrigger>
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="space-y-4 border-t pt-4">
            {isLoading ? (
              <div className="h-12 animate-pulse rounded bg-muted" />
            ) : (
              <>
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <Badge variant="outline">Signed: {signed.length}</Badge>
                  <Badge variant="outline">Signed in app: {signatures.size}</Badge>
                  <Badge variant="outline">Imported: {Math.max(signed.length - signatures.size, 0)}</Badge>
                  {onFilterUnsigned && (
                    <Button variant="outline" size="sm" className="min-h-11 sm:min-h-9" onClick={onFilterUnsigned}>
                      Show {unsigned.length} missing
                    </Button>
                  )}
                  <Button variant="outline" size="sm" className="min-h-11 sm:min-h-9" onClick={exportUnsigned}>
                    <Download className="h-4 w-4 mr-2" />
                    Missing CSV
                  </Button>
                  <Button variant="outline" size="sm" className="min-h-11 sm:min-h-9" onClick={downloadAllSigned}>
                    <FileDown className="h-4 w-4 mr-2" />
                    All signed PDFs
                  </Button>
                </div>
                <div className="space-y-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      className="pl-9"
                      placeholder="Find a signed waiver by name, phone, or order..."
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
                                <div className="flex gap-2 shrink-0">
                                  {record.receipt_path && (
                                    <Button
                                      size="sm"
                                      variant="secondary"
                                      onClick={() => openStoredCopy(a.id, record.receipt_path)}
                                    >
                                      <FileDown className="h-4 w-4 mr-2" />
                                      Stored copy
                                    </Button>
                                  )}
                                  <Button
                                    size="sm"
                                    variant="outline"
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
                                </div>

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

    </Card>
  );
}
