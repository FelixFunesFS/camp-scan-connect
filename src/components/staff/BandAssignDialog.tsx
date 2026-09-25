import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Camera, CheckCircle2, Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getCurrentEventId } from "@/lib/eventRuntime";
import { inferCredentialType, normalizeCredential } from "@/lib/credentialFormat";
import { CameraBraceletScanner } from "@/components/CameraBraceletScanner";

interface BandAssignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  attendeeId: string;
  attendeeName: string;
  currentUid?: string | null;
  onAssigned: () => void;
}

export function BandAssignDialog({
  open,
  onOpenChange,
  attendeeId,
  attendeeName,
  currentUid,
  onAssigned,
}: BandAssignDialogProps) {
  const [uid, setUid] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [cameraOpen, setCameraOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setUid("");
      setError("");
      const t = setTimeout(() => inputRef.current?.focus(), 150);
      return () => clearTimeout(t);
    }
  }, [open, attendeeId]);

  const [clashName, setClashName] = useState<string | null>(null);

  const assign = async (raw: string, force = false) => {
    const code = normalizeCredential(raw);
    if (!code) {
      setError("Scan or type the wristband code first.");
      return;
    }
    setBusy(true);
    setError("");
    setClashName(null);
    try {
      const eventId = getCurrentEventId();
      const now = new Date().toISOString();

      // Already on someone else?
      const { data: clash } = await supabase
        .from("rfid_tags")
        .select("attendee_id, attendees(first_name, last_name)")
        .eq("event_id", eventId)
        .eq("uid", code)
        .in("status", ["assigned", "active"])
        .maybeSingle();

      if (clash?.attendee_id && clash.attendee_id !== attendeeId && !force) {
        const other = clash.attendees as { first_name?: string; last_name?: string } | null;
        const name = `${other?.first_name ?? "another camper"} ${other?.last_name ?? ""}`.trim();
        setClashName(name);
        setError(`That band is linked to ${name}.`);
        return;
      }

      // Retire the band this person currently holds.
      const { data: held } = await supabase
        .from("rfid_tags")
        .select("uid, status")
        .eq("event_id", eventId)
        .eq("attendee_id", attendeeId)
        .in("status", ["assigned", "active"])
        .maybeSingle();

      // Was this camper already checked in? Then the new band carries it over.
      const { data: person } = await supabase
        .from("attendees")
        .select("checked_in_at, activated_at")
        .eq("id", attendeeId)
        .maybeSingle();
      const carryActive = held?.status === "active" || !!person?.checked_in_at || !!person?.activated_at;

      if (held?.uid && held.uid !== code) {
        await supabase
          .from("rfid_tags")
          .update({
            status: "replaced",
            deactivated_at: now,
            reason: "Replaced at Staff Hub",
          })
          .eq("uid", held.uid)
          .eq("event_id", eventId);
      }

      const statusFields = carryActive
        ? { status: "active" as const, activated_at: now, activation_method: "staff_assisted" }
        : { status: "assigned" as const };

      const { data: tag } = await supabase
        .from("rfid_tags")
        .select("uid")
        .eq("event_id", eventId)
        .eq("uid", code)
        .maybeSingle();

      if (tag) {
        const { error: upErr } = await supabase
          .from("rfid_tags")
          .update({
            attendee_id: attendeeId,
            ...statusFields,
            issued_at: now,
            deactivated_at: null,
            reason: force && clash?.attendee_id ? `Taken over from previous holder at Staff Hub` : null,
          })
          .eq("uid", code)
          .eq("event_id", eventId);
        if (upErr) throw upErr;
      } else {
        const { error: insErr } = await supabase.from("rfid_tags").insert({
          uid: code,
          attendee_id: attendeeId,
          ...statusFields,
          issued_at: now,
          event_id: eventId,
          credential_type: inferCredentialType(code),
        });
        if (insErr) throw insErr;
      }

      await supabase.from("station_transactions").insert({
        attendee_id: attendeeId,
        rfid_uid: code,
        station_type: "rfid_assignment",
        transaction_type: "rfid_assign" as never,
        event_id: eventId,
        extra_data: {
          assignment_context: "staff_hub",
          assignment_source: "staff_hub",
          previous_rfid: held?.uid ?? null,
        },
      });

      toast.success(`${code} assigned to ${attendeeName}`);
      onAssigned();
      onOpenChange(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save the wristband.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md w-[calc(100vw-1.5rem)] max-h-[calc(100dvh-2rem)] overflow-y-auto pb-[max(1rem,env(safe-area-inset-bottom))]">
          <DialogHeader>
            <DialogTitle>{currentUid ? "Replace wristband" : "Assign wristband"}</DialogTitle>
            <DialogDescription>
              {attendeeName}
              {currentUid ? ` · currently ${currentUid}` : ""}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Button
              variant="secondary"
              className="w-full h-12"
              onClick={() => setCameraOpen(true)}
              disabled={busy}
            >
              <Camera className="h-5 w-5 mr-2" />
              Scan with camera
            </Button>

            <div className="space-y-1.5">
              <Label htmlFor="band-code">Or type the code</Label>
              <Input
                id="band-code"
                ref={inputRef}
                value={uid}
                onChange={(e) => {
                  setUid(e.target.value.toUpperCase());
                  setError("");
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !busy) assign(uid);
                }}
                placeholder="ABC-1234"
                autoComplete="off"
                className="h-12 text-base font-mono"
              />
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {clashName && (
              <Button
                variant="outline"
                className="w-full h-12 border-destructive text-destructive"
                disabled={busy}
                onClick={() => assign(uid, true)}
              >
                Take over this band from {clashName}
              </Button>
            )}

            <Button className="w-full h-12" disabled={busy || !uid.trim()} onClick={() => assign(uid)}>
              {busy ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Saving…
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-5 w-5 mr-2" />
                  {currentUid ? "Replace band" : "Assign band"}
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <CameraBraceletScanner
        isOpen={cameraOpen}
        onClose={() => setCameraOpen(false)}
        onScan={(code) => {
          setCameraOpen(false);
          setUid(normalizeCredential(code));
          assign(code);
        }}
      />
    </>
  );
}
