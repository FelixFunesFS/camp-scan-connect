import { useEffect, useMemo, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, X, UserSearch, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getCurrentEventId } from "@/lib/eventRuntime";
import { WORKING_STATUSES } from "@/lib/registrationStatus";
import { formatPhoneNumber } from "@/lib/phoneUtils";

interface GateSearchRow {
  id: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  order_id: string | null;
  ticket_type: string | null;
  site_detail: string | null;
  waiver_signed: boolean | null;
  credential_uid: string | null;
  credential_status: string | null;
}

interface GateQuickSearchProps {
  /** Called with the credential code of the person the volunteer picked. */
  onSelectCredential: (uid: string) => void;
  disabled?: boolean;
}

const MAX_RESULTS = 8;

/**
 * Line-busting lookup for the gate: type a name, phone number or order number
 * and tap the person to run them through exactly like a scan.
 */
export function GateQuickSearch({ onSelectCredential, disabled }: GateQuickSearchProps) {
  const [term, setTerm] = useState("");
  const [rows, setRows] = useState<GateSearchRow[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const requestRef = useRef(0);

  const trimmed = term.trim();
  const digits = useMemo(() => trimmed.replace(/\D/g, ""), [trimmed]);

  useEffect(() => {
    if (trimmed.length < 2 && digits.length < 2) {
      setRows([]);
      setSearched(false);
      setIsSearching(false);
      return;
    }

    const requestId = ++requestRef.current;
    setIsSearching(true);

    const timer = setTimeout(async () => {
      try {
        const eventId = getCurrentEventId();
        const like = `%${trimmed.replace(/[%,]/g, "")}%`;
        const filters = [
          `first_name.ilike.${like}`,
          `last_name.ilike.${like}`,
          `order_id.ilike.${like}`,
        ];
        if (digits.length >= 3) {
          filters.push(`phone.ilike.%${digits}%`);
        }

        let query = supabase
          .from("attendees")
          .select(
            "id, first_name, last_name, phone, order_id, ticket_type, site_detail, waiver_signed"
          )
          .eq("event_id", eventId)
          .in("registration_status", WORKING_STATUSES as unknown as string[])
          .or(filters.join(","))
          .order("last_name", { ascending: true })
          .limit(MAX_RESULTS * 3);

        // Full-name typing ("jane doe") — match both halves.
        const parts = trimmed.split(/\s+/).filter(Boolean);
        if (parts.length >= 2 && digits.length === 0) {
          query = supabase
            .from("attendees")
            .select(
              "id, first_name, last_name, phone, order_id, ticket_type, site_detail, waiver_signed"
            )
            .eq("event_id", eventId)
            .in("registration_status", WORKING_STATUSES as unknown as string[])
            .ilike("first_name", `%${parts[0]}%`)
            .ilike("last_name", `%${parts.slice(1).join(" ")}%`)
            .order("last_name", { ascending: true })
            .limit(MAX_RESULTS * 3);
        }

        const { data, error } = await query;
        if (error) throw error;
        if (requestRef.current !== requestId) return;

        const attendees = data ?? [];
        let tagByAttendee = new Map<string, { uid: string; status: string }>();

        if (attendees.length > 0) {
          const { data: tags } = await supabase
            .from("rfid_tags")
            .select("uid, attendee_id, status")
            .eq("event_id", eventId)
            .in(
              "attendee_id",
              attendees.map((a) => a.id)
            )
            .in("status", ["assigned", "active"]);

          tagByAttendee = new Map(
            (tags ?? [])
              .filter((t) => t.attendee_id)
              .map((t) => [t.attendee_id as string, { uid: t.uid, status: t.status as string }])
          );
        }

        if (requestRef.current !== requestId) return;

        setRows(
          attendees.slice(0, MAX_RESULTS).map((a) => {
            const tag = tagByAttendee.get(a.id);
            return {
              id: a.id,
              first_name: a.first_name,
              last_name: a.last_name,
              phone: a.phone,
              order_id: a.order_id,
              ticket_type: a.ticket_type,
              site_detail: a.site_detail,
              waiver_signed: a.waiver_signed,
              credential_uid: tag?.uid ?? null,
              credential_status: tag?.status ?? null,
            };
          })
        );
        setSearched(true);
      } catch (err) {
        console.error("Gate quick search failed:", err);
        if (requestRef.current === requestId) {
          setRows([]);
          setSearched(true);
        }
      } finally {
        if (requestRef.current === requestId) setIsSearching(false);
      }
    }, 220);

    return () => clearTimeout(timer);
  }, [trimmed, digits]);

  const clear = () => {
    setTerm("");
    setRows([]);
    setSearched(false);
  };

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          data-exclude-rfid="true"
          value={term}
          disabled={disabled}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="Search name, phone or order number"
          className="h-12 pl-9 pr-10 text-base"
          autoComplete="off"
        />
        {term && (
          <button
            type="button"
            onClick={clear}
            aria-label="Clear search"
            className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-muted"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {isSearching && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Searching...
        </div>
      )}

      {!isSearching && searched && rows.length === 0 && (
        <div className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <UserSearch className="h-4 w-4" />
            No one found. Try a last name or the last 4 digits of their phone.
          </div>
        </div>
      )}

      {rows.length > 0 && (
        <ul className="space-y-2">
          {rows.map((row) => {
            const hasBand = !!row.credential_uid;
            return (
              <li key={row.id}>
                <button
                  type="button"
                  disabled={!hasBand || disabled}
                  onClick={() => row.credential_uid && onSelectCredential(row.credential_uid)}
                  className={`w-full rounded-lg border p-3 text-left transition ${
                    hasBand
                      ? "hover:border-primary hover:bg-muted/60 active:bg-muted"
                      : "cursor-not-allowed border-dashed opacity-80"
                  }`}
                >
                  <div className="flex min-w-0 items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-semibold">
                        {row.first_name} {row.last_name}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {[
                          row.phone ? formatPhoneNumber(row.phone) : null,
                          row.site_detail || undefined,
                          row.order_id || undefined,
                        ]
                          .filter(Boolean)
                          .join(" • ")}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      {hasBand ? (
                        <Badge
                          variant="secondary"
                          className="font-mono text-[11px]"
                        >
                          {row.credential_uid}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[11px]">
                          Needs band
                        </Badge>
                      )}
                    </div>
                  </div>
                  {!hasBand && (
                    <p className="mt-2 text-xs font-medium text-orange-700">
                      Send to the Credential Tent for a wristband.
                    </p>
                  )}
                  {hasBand && !row.waiver_signed && (
                    <p className="mt-2 text-xs font-medium text-orange-700">
                      Waiver not signed yet.
                    </p>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {rows.length > 0 && (
        <Button variant="ghost" size="sm" className="w-full" onClick={clear}>
          Clear and search the next person
        </Button>
      )}
    </div>
  );
}
