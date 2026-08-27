import { useEffect, useMemo, useRef, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, FileText, ArrowDown, Download } from "lucide-react";
import { toast } from "sonner";
import {
  ESIGN_NOTICE,
  WAIVER_ACKNOWLEDGEMENTS,
  WAIVER_SECTIONS,
  WAIVER_SUBTITLE,
  WAIVER_TITLE,
} from "@/lib/waiverContent";
import { waiverService } from "@/services/waiverService";
import { downloadWaiverReceipt } from "@/lib/waiverReceipt";
import { WAIVER_VERSION } from "@/lib/waiverContent";

interface WaiverSigningDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  attendeeId: string;
  attendeeName: string;
  eventId?: string | null;
  /** Set false when staff capture the signature with the attendee present. */
  signedBySelf?: boolean;
  witnessedBy?: string | null;
  onSigned: () => void;
}

export function WaiverSigningDialog({
  open,
  onOpenChange,
  attendeeId,
  attendeeName,
  eventId,
  signedBySelf = true,
  witnessedBy = null,
  onSigned,
}: WaiverSigningDialogProps) {
  const [scrolledToEnd, setScrolledToEnd] = useState(false);
  const [checks, setChecks] = useState<Record<string, boolean>>({});
  const [typedName, setTypedName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [receipt, setReceipt] = useState<{ typedName: string; signedAt: string } | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setScrolledToEnd(false);
      setChecks({});
      setTypedName("");
      setReceipt(null);
    }
  }, [open, attendeeId]);

  const allChecked = WAIVER_ACKNOWLEDGEMENTS.every((a) => checks[a.id]);
  const nameValid = typedName.trim().length >= 3;
  const nameMatches = useMemo(
    () => waiverService.namesMatch(typedName, attendeeName),
    [typedName, attendeeName]
  );
  const canSubmit = scrolledToEnd && allChecked && nameValid && !isSubmitting;

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 48) setScrolledToEnd(true);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await waiverService.signWaiver({
        attendeeId,
        eventId,
        typedName,
        registeredName: attendeeName,
        signedBySelf,
        witnessedBy,
      });
      toast.success(`Waiver signed for ${attendeeName}`);
      setReceipt({ typedName: typedName.trim(), signedAt: new Date().toISOString() });
      onSigned();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save the signature");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {receipt ? (
        <DialogContent className="max-w-md w-[calc(100vw-2rem)]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-success" />
              Waiver signed
            </DialogTitle>
            <DialogDescription>
              Keep a copy of what was signed — it includes the full agreement.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg border p-4 space-y-1 text-sm">
            <p>
              <span className="text-muted-foreground">Signed by: </span>
              <span className="font-medium">{receipt.typedName}</span>
            </p>
            <p>
              <span className="text-muted-foreground">Registered name: </span>
              {attendeeName}
            </p>
            <p>
              <span className="text-muted-foreground">Signed on: </span>
              {new Date(receipt.signedAt).toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground pt-1">Version {WAIVER_VERSION}</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              className="flex-1 h-11"
              onClick={() =>
                downloadWaiverReceipt({
                  attendeeName,
                  typedName: receipt.typedName,
                  signedAt: receipt.signedAt,
                })
              }
            >
              <Download className="h-4 w-4 mr-2" />
              Download PDF
            </Button>
            <Button className="flex-1 h-11" onClick={() => onOpenChange(false)}>
              Done
            </Button>
          </div>
        </DialogContent>
      ) : (
      <DialogContent className="max-w-2xl w-[calc(100vw-2rem)] p-0 gap-0 max-h-[90vh] flex flex-col">
        <DialogHeader className="p-4 sm:p-6 pb-3 border-b">
          <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
            <FileText className="h-5 w-5 shrink-0" />
            {WAIVER_TITLE}
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">{WAIVER_SUBTITLE}</DialogDescription>
          <p className="text-sm font-medium text-foreground pt-1">Signing as {attendeeName}</p>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto" onScroll={handleScroll}>
          <div className="p-4 sm:p-6 space-y-5 text-sm leading-relaxed">
            {WAIVER_SECTIONS.map((section) => (
              <section key={section.heading} className="space-y-2">
                <h3 className="font-semibold text-foreground">{section.heading}</h3>
                {section.body && <p className="text-muted-foreground">{section.body}</p>}
                {section.bullets && (
                  <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                    {section.bullets.map((b) => (
                      <li key={b}>{b}</li>
                    ))}
                  </ul>
                )}
              </section>
            ))}
            <p className="text-xs text-muted-foreground border-t pt-4">{ESIGN_NOTICE}</p>
            <div ref={bottomRef} />
          </div>
        </div>

        <div className="border-t p-4 sm:p-6 space-y-4 bg-background">
          {!scrolledToEnd ? (
            <Alert>
              <ArrowDown className="h-4 w-4" />
              <AlertDescription>
                Please scroll through the full agreement before signing.
              </AlertDescription>
            </Alert>
          ) : (
            <>
              <div className="space-y-3">
                {WAIVER_ACKNOWLEDGEMENTS.map((ack) => (
                  <label key={ack.id} className="flex items-start gap-3 cursor-pointer">
                    <Checkbox
                      checked={!!checks[ack.id]}
                      onCheckedChange={(v) =>
                        setChecks((prev) => ({ ...prev, [ack.id]: v === true }))
                      }
                      className="mt-0.5"
                    />
                    <span className="text-sm text-muted-foreground">{ack.label}</span>
                  </label>
                ))}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="waiver-typed-name">Type your full legal name</Label>
                <Input
                  id="waiver-typed-name"
                  value={typedName}
                  onChange={(e) => setTypedName(e.target.value.slice(0, 120))}
                  placeholder={attendeeName}
                  autoComplete="off"
                  className="h-11 text-base"
                />
                <p className="text-xs text-muted-foreground">
                  {nameValid && !nameMatches
                    ? "This does not match the name on the registration — it will be flagged for staff review."
                    : `Signed electronically on ${new Date().toLocaleDateString()}. Only the attendee may type their own name.`}
                </p>
              </div>
            </>
          )}

          <Button onClick={handleSubmit} disabled={!canSubmit} size="lg" className="w-full h-12">
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-current" />
                Saving signature...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5" />
                Agree &amp; Sign
              </span>
            )}
          </Button>
        </div>
      </DialogContent>
      )}
    </Dialog>
  );
}
