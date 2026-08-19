import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Loader2, ExternalLink, Table2, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { toast } from "sonner";
import { useEvent } from "@/contexts/EventContext";

const TABS = [
  "Attendees",
  "Credentials",
  "Transactions",
  "Waivers",
  "Scans",
  "Assistance",
  "SyncLog",
  "Tasks",
  "Events",
] as const;

type SyncResult = {
  tab: string;
  rows: number;
  truncated: boolean;
  error?: string;
};

type SyncResponse = {
  success: boolean;
  spreadsheet_url?: string;
  duration_ms?: number;
  synced_at?: string;
  results?: SyncResult[];
  error?: string;
};

export const SheetsSyncPanel = () => {
  const { eventId, eventYear } = useEvent();
  const [selected, setSelected] = useState<string[]>([...TABS]);
  const [running, setRunning] = useState(false);
  const [response, setResponse] = useState<SyncResponse | null>(null);

  const toggle = (tab: string) => {
    setSelected((prev) =>
      prev.includes(tab) ? prev.filter((t) => t !== tab) : [...prev, tab],
    );
  };

  const runSync = async () => {
    if (selected.length === 0) {
      toast.error("Select at least one table to sync");
      return;
    }

    setRunning(true);
    setResponse(null);

    try {
      const { data, error } = await supabase.functions.invoke("sync-to-sheets", {
        body: { tables: selected, event_id: eventId ?? undefined },
      });

      if (error) {
        const details =
          error instanceof FunctionsHttpError
            ? await error.context.text()
            : error.message;
        throw new Error(details);
      }

      const result = data as SyncResponse;
      setResponse(result);

      const failures = result.results?.filter((r) => r.error) ?? [];
      if (failures.length > 0) {
        toast.error(`${failures.length} table(s) failed to sync`);
      } else {
        toast.success("Google Sheets workbook updated");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setResponse({ success: false, error: message });
      toast.error("Sheets sync failed");
    } finally {
      setRunning(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Table2 className="h-5 w-5" />
              Google Sheets Mirror
            </CardTitle>
            <CardDescription>
              Replace each tab in the connected workbook with the current {eventYear} database contents.
            </CardDescription>
          </div>
          {response?.spreadsheet_url && (
            <Button asChild variant="outline" size="sm">
              <a href={response.spreadsheet_url} target="_blank" rel="noreferrer">
                Open workbook
                <ExternalLink className="ml-2 h-4 w-4" />
              </a>
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {TABS.map((tab) => (
            <div key={tab} className="flex items-center gap-2">
              <Checkbox
                id={`sheet-${tab}`}
                checked={selected.includes(tab)}
                onCheckedChange={() => toggle(tab)}
                disabled={running}
              />
              <Label htmlFor={`sheet-${tab}`} className="cursor-pointer text-sm">
                {tab}
              </Label>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={runSync} disabled={running}>
            {running && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {running ? "Syncing…" : "Sync now"}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            disabled={running}
            onClick={() => setSelected(selected.length === TABS.length ? [] : [...TABS])}
          >
            {selected.length === TABS.length ? "Clear all" : "Select all"}
          </Button>
          {response?.synced_at && (
            <span className="text-sm text-muted-foreground">
              Last sync {new Date(response.synced_at).toLocaleString()} ·{" "}
              {Math.round((response.duration_ms ?? 0) / 100) / 10}s
            </span>
          )}
        </div>

        {response?.error && (
          <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm">
            <AlertTriangle className="mt-0.5 h-4 w-4 text-destructive" />
            <span className="break-all">{response.error}</span>
          </div>
        )}

        {response?.results && response.results.length > 0 && (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {response.results.map((result) => (
              <div
                key={result.tab}
                className="flex items-center justify-between rounded-md border p-2 text-sm"
              >
                <span className="font-medium">{result.tab}</span>
                {result.error ? (
                  <Badge variant="destructive">Failed</Badge>
                ) : (
                  <span className="flex items-center gap-2 text-muted-foreground">
                    {result.rows.toLocaleString()} rows
                    {result.truncated && <Badge variant="outline">truncated</Badge>}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
