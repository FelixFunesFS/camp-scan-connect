import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { useScanFocus } from "@/hooks/useScanFocus";
import { normalizeCredential, inferCredentialType } from "@/lib/credentialFormat";
import { lookupCredential, type CredentialLookup } from "@/lib/credentialLookup";
import { ScanBarcode, CheckCircle2, XCircle, AlertTriangle, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface ScanEntry {
  raw: string;
  normalized: string;
  timestamp: Date;
  result: CredentialLookup | null;
}

/** Renders a scanned string with invisible characters made visible. */
function visualize(raw: string): string {
  return raw
    .replace(/ /g, "␣")
    .replace(/\t/g, "⇥")
    .replace(/\r/g, "␍")
    .replace(/\n/g, "␊");
}

function CharBreakdown({ value }: { value: string }) {
  if (!value) return null;
  return (
    <div className="flex flex-wrap gap-1">
      {Array.from(value).map((ch, i) => (
        <div
          key={i}
          className="flex flex-col items-center rounded border bg-muted px-1.5 py-0.5 font-mono"
        >
          <span className="text-sm font-semibold">{visualize(ch)}</span>
          <span className="text-[10px] text-muted-foreground">U+{ch.codePointAt(0)!.toString(16).toUpperCase().padStart(4, "0")}</span>
        </div>
      ))}
    </div>
  );
}

const ScanTester = () => {
  const navigate = useNavigate();
  const [value, setValue] = useState("");
  const [current, setCurrent] = useState<ScanEntry | null>(null);
  const [history, setHistory] = useState<ScanEntry[]>([]);
  const { inputRef, isFocused, focusProps } = useScanFocus([current]);

  const handleScan = async (raw: string) => {
    const normalized = normalizeCredential(raw);
    let result: CredentialLookup | null = null;
    if (normalized) {
      result = await lookupCredential(normalized);
    }
    const entry: ScanEntry = { raw, normalized, timestamp: new Date(), result };
    setCurrent(entry);
    setHistory((h) => [entry, ...h].slice(0, 20));
  };

  const mismatch = current ? current.raw !== current.normalized : false;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6 space-y-6 max-w-4xl">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate("/dev")} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Dev Dashboard
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <ScanBarcode className="h-6 w-6" />
              Scan Tester
            </h1>
            <p className="text-sm text-muted-foreground">
              Diagnostic only — see exactly what the scanner picks up. Nothing is recorded.
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Raw Capture</CardTitle>
            <CardDescription>
              Aim the scanner and pull the trigger. The field stays focused automatically.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              ref={inputRef}
              {...focusProps}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (value) {
                    handleScan(value);
                    setValue("");
                  }
                }
              }}
              placeholder="Scan a barcode or wristband…"
              className="font-mono text-lg"
              autoFocus
            />
            <div className="flex items-center gap-2">
              <div className={`h-2 w-2 rounded-full ${isFocused ? "bg-green-500 animate-pulse" : "bg-destructive"}`} />
              <span className="text-xs text-muted-foreground">
                {isFocused ? "Scanner armed — field focused" : "Field not focused — click it before scanning"}
              </span>
            </div>
          </CardContent>
        </Card>

        {current && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Last Scan
                {mismatch && (
                  <Badge variant="destructive" className="gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    Raw ≠ Normalized
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3">
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">
                    RAW — exactly what was received ({current.raw.length} chars)
                  </p>
                  <p className="font-mono text-lg break-all rounded bg-muted p-2">
                    {visualize(current.raw) || <span className="text-muted-foreground">(empty)</span>}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Per-character breakdown</p>
                  <CharBreakdown value={current.raw} />
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">
                    NORMALIZED — what lookup uses ({current.normalized.length} chars, type guess: {inferCredentialType(current.raw)})
                  </p>
                  <p className="font-mono text-lg break-all rounded bg-muted p-2">{current.normalized}</p>
                </div>
              </div>

              <Separator />

              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">Resolution (active event)</p>
                {current.result?.found && !current.result.wrong_event ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                      <span className="font-semibold text-lg">{current.result.attendee_name ?? "Unassigned code"}</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline">Event {current.result.event_year}</Badge>
                      <Badge variant="outline">Status: {current.result.credential_status}</Badge>
                      <Badge variant={current.result.is_checked_in ? "default" : "secondary"}>
                        {current.result.is_checked_in ? "Checked in" : "Not checked in"}
                      </Badge>
                      <Badge variant={current.result.waiver_signed ? "default" : "secondary"}>
                        {current.result.waiver_signed ? "Waiver signed" : "Waiver not signed"}
                      </Badge>
                    </div>
                  </div>
                ) : current.result?.found && current.result.wrong_event ? (
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-amber-500" />
                    <span>Code exists but belongs to the {current.result.event_year} event — not this year.</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <XCircle className="h-5 w-5 text-destructive" />
                    <span>No match in the system for this code.</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {history.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Session History (last {history.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1 font-mono text-sm">
                {history.map((entry, i) => (
                  <div key={i} className="flex items-center gap-3 rounded px-2 py-1.5 hover:bg-muted">
                    <span className="text-xs text-muted-foreground w-20 shrink-0">
                      {entry.timestamp.toLocaleTimeString()}
                    </span>
                    <span className="break-all flex-1">{visualize(entry.raw)}</span>
                    <span className="text-xs text-muted-foreground shrink-0">{entry.raw.length}ch</span>
                    {entry.raw !== entry.normalized && (
                      <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                    )}
                    {entry.result?.found && !entry.result.wrong_event ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                    ) : (
                      <XCircle className="h-4 w-4 text-destructive shrink-0" />
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default ScanTester;
