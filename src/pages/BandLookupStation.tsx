import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Search, User, AlertCircle, CheckCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getCurrentEventId } from "@/lib/eventRuntime";
import { normalizeCredential } from "@/lib/credentialFormat";
import { describeUnknownCredential, resolveCredential } from "@/lib/credentialLookup";
import { InlineCameraScanner } from "@/components/InlineCameraScanner";
import { LensScanner } from "@/components/LensScanner";
import { GateQuickSearch } from "@/components/GateQuickSearch";
import { StaffPasscodeGate } from "@/components/StaffPasscodeGate";
import { useStaffAuth } from "@/contexts/StaffAuthContext";
import { formatMealPlan, formatPhoneNumber } from "@/lib/phoneUtils";
import { formatSiteDisplayName } from "@/utils/siteLocationUtils";

interface OwnerRecord {
  id: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  email: string | null;
  order_id: string | null;
  ticket_type: string | null;
  meal_plan: string | null;
  t_shirt_size: string | null;
  site_location_assignment: string | null;
  site_detail: string | null;
  arrival_window: string | null;
  waiver_signed: boolean | null;
  checked_in_at: string | null;
  is_veteran: boolean | null;
}

interface LookupResult {
  code: string;
  bandStatus: string;
  owner: OwnerRecord;
  partySize: number;
  shirtPickedUp: boolean;
}

export default function BandLookupStation() {
  const navigate = useNavigate();
  const { isUnlocked } = useStaffAuth();
  const [code, setCode] = useState("");
  const [isLooking, setIsLooking] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<LookupResult | null>(null);
  const [showLens, setShowLens] = useState(false);

  if (!isUnlocked) return <StaffPasscodeGate />;

  const runLookup = async (raw: string) => {
    const uid = normalizeCredential(raw);
    if (!uid) return;
    setIsLooking(true);
    setError("");
    setResult(null);

    try {
      const resolved = await resolveCredential(uid);
      if (!resolved || !resolved.attendee_id) {
        setError(await describeUnknownCredential(uid));
        return;
      }

      const { data: owner } = await supabase
        .from("attendees")
        .select(
          "id, first_name, last_name, phone, email, order_id, ticket_type, meal_plan, t_shirt_size, site_location_assignment, site_detail, arrival_window, waiver_signed, checked_in_at, is_veteran"
        )
        .eq("id", resolved.attendee_id)
        .maybeSingle();

      if (!owner) {
        setError(`Band ${uid} points to a camper record that no longer exists.`);
        return;
      }

      let partySize = 1;
      if (owner.order_id) {
        const { count } = await supabase
          .from("attendees")
          .select("id", { count: "exact", head: true })
          .eq("event_id", getCurrentEventId())
          .eq("order_id", owner.order_id);
        partySize = count ?? 1;
      }

      const { count: shirtCount } = await supabase
        .from("station_transactions")
        .select("id", { count: "exact", head: true })
        .eq("attendee_id", owner.id)
        .eq("transaction_type", "tshirt_pickup");

      setResult({
        code: resolved.uid,
        bandStatus: resolved.status,
        owner: owner as OwnerRecord,
        partySize,
        shirtPickedUp: (shirtCount ?? 0) > 0,
      });
      setCode("");
    } catch (err) {
      console.error(err);
      setError("Could not look that band up. Try again.");
    } finally {
      setIsLooking(false);
    }
  };

  const bandLabel: Record<string, string> = {
    active: "Active — checked in",
    assigned: "Assigned — not activated yet",
    unissued: "Not handed out",
    lost: "Reported lost",
    replaced: "Replaced by a newer band",
    deactivated: "Turned off",
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex min-w-0 items-center justify-between gap-2">
          <Button
            variant="outline"
            onClick={() => navigate("/stations")}
            className="touch-target shrink-0 gap-2 px-3"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Stations
          </Button>
          <h1 className="min-w-0 text-right text-lg font-bold sm:text-2xl">Wristband Lookup</h1>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Search className="h-4 w-4" />
              Who owns this wristband?
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Scan or type a band code. Nothing is recorded — this only tells you who it belongs to.
            </p>

            <InlineCameraScanner
              autoStart
              compact
              paused={showLens}
              onScan={runLookup}
              onExpand={() => setShowLens(true)}
            />

            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                data-exclude-rfid="true"
                placeholder="Type the printed code..."
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="flex-1 font-mono"
                onKeyPress={(e) => {
                  if (e.key === "Enter") runLookup(code);
                }}
              />
              <Button
                onClick={() => runLookup(code)}
                disabled={isLooking || !code.trim()}
                className="touch-target sm:shrink-0"
              >
                {isLooking ? "Looking up..." : "Look up"}
              </Button>
            </div>

            <div className="space-y-3 border-t pt-3">
              <p className="text-sm font-medium">No band handy? Search by name, phone or email</p>
              <GateQuickSearch disabled={isLooking} onSelectCredential={runLookup} />
            </div>

            {isLooking && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Looking up...
              </div>
            )}

            {error && (
              <div className="flex items-start gap-2 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-destructive">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span className="text-sm font-medium">{error}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {result && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <User className="h-5 w-5" />
                {result.owner.first_name} {result.owner.last_name}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary" className="font-mono">{result.code}</Badge>
                <Badge variant={result.bandStatus === "active" ? "default" : "outline"}>
                  {bandLabel[result.bandStatus] ?? result.bandStatus}
                </Badge>
                {result.owner.is_veteran && <Badge variant="secondary">Veteran</Badge>}
              </div>

              <dl className="grid grid-cols-1 gap-x-4 gap-y-3 text-sm sm:grid-cols-2">
                <Row label="Campsite" value={
                  result.owner.site_detail ||
                  formatSiteDisplayName(result.owner.site_location_assignment) ||
                  "Not assigned"
                } />
                <Row label="Checked in" value={
                  result.owner.checked_in_at
                    ? new Date(result.owner.checked_in_at).toLocaleString()
                    : "Not yet"
                } />
                <Row
                  label="Waiver"
                  value={result.owner.waiver_signed ? "Signed" : "Not signed"}
                  tone={result.owner.waiver_signed ? "good" : "warn"}
                />
                <Row label="Meals" value={formatMealPlan(result.owner.meal_plan)} />
                <Row
                  label="T-shirt"
                  value={`${result.owner.t_shirt_size || "No size on file"} — ${
                    result.shirtPickedUp ? "picked up" : "not picked up"
                  }`}
                />
                <Row label="Arrival" value={result.owner.arrival_window || "Not set"} />
                <Row label="Phone" value={result.owner.phone ? formatPhoneNumber(result.owner.phone) : "None"} />
                <Row label="Email" value={result.owner.email || "None"} />
                <Row label="Order" value={result.owner.order_id || "None"} />
                <Row
                  label="Party size"
                  value={result.partySize > 1 ? `${result.partySize} people on this order` : "Just this camper"}
                />
              </dl>

              <div className="flex flex-col gap-2 sm:flex-row">
                <Button variant="outline" className="flex-1 h-11" onClick={() => setResult(null)}>
                  Clear
                </Button>
                <Button
                  className="flex-1 h-11"
                  onClick={() => navigate(`/attendee/${result.owner.id}`)}
                >
                  Open full record
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {showLens && (
        <LensScanner
          isOpen={showLens}
          onClose={() => setShowLens(false)}
          onScan={(value) => {
            setShowLens(false);
            runLookup(value);
          }}
        />
      )}
    </div>
  );
}

function Row({ label, value, tone }: { label: string; value: string; tone?: "good" | "warn" }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd
        className={`font-medium break-words ${
          tone === "good" ? "text-green-700" : tone === "warn" ? "text-orange-700" : ""
        }`}
      >
        {tone === "good" && <CheckCircle className="mr-1 inline h-4 w-4" />}
        {value}
      </dd>
    </div>
  );
}
