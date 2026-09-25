import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Zap, PenLine, AlertTriangle, Loader2 } from "lucide-react";
import { AttendeeReadiness } from "@/types/station";

interface StationActivationPromptProps {
  attendeeName: string;
  attendeeReadiness: AttendeeReadiness;
  onStaffOverride?: () => void;
  onStaffActivation?: () => void;
  showStaffOverride?: boolean;
  needsWaiver?: boolean;
  isWorking?: boolean;
}

/**
 * One-tap resolve card shown when a scanned band can't be used yet.
 * Waiver missing -> "Sign waiver & check in" (sign, then auto-activate).
 * Just not activated -> "Activate & check in".
 */
export function StationActivationPrompt({
  attendeeName,
  attendeeReadiness,
  onStaffOverride,
  onStaffActivation,
  showStaffOverride = true,
  needsWaiver = false,
  isWorking = false,
}: StationActivationPromptProps) {
  const notActivated = !attendeeReadiness.hasActivation;
  const title = needsWaiver
    ? "Waiver needed"
    : "Band not activated yet";
  const detail = needsWaiver
    ? notActivated
      ? "Hand the phone over to sign — the band activates automatically after."
      : "Hand the phone over to sign — then they're good to go."
    : "One tap activates the band and checks them in.";

  return (
    <Card className="border-warning/40 bg-warning/5">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
          <div className="min-w-0">
            <p className="font-semibold text-base break-words">{attendeeName}</p>
            <p className="text-sm font-medium">{title}</p>
            <p className="text-sm text-muted-foreground">{detail}</p>
          </div>
        </div>

        <Button
          onClick={onStaffActivation}
          disabled={!onStaffActivation || isWorking}
          size="touch"
          className="w-full h-14 text-base"
        >
          {isWorking ? (
            <Loader2 className="h-5 w-5 mr-2 animate-spin" />
          ) : needsWaiver ? (
            <PenLine className="h-5 w-5 mr-2" />
          ) : (
            <Zap className="h-5 w-5 mr-2" />
          )}
          {isWorking ? "Activating…" : needsWaiver ? "Sign waiver & check in" : "Activate & check in"}
        </Button>

        {showStaffOverride && onStaffOverride && (
          <button
            type="button"
            onClick={onStaffOverride}
            className="w-full text-center text-xs text-muted-foreground underline underline-offset-2 py-1"
          >
            Band won't work? Staff override
          </button>
        )}
      </CardContent>
    </Card>
  );
}
