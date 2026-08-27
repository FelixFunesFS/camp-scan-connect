import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Users, Smartphone, AlertCircle, CheckCircle2, FileWarning } from "lucide-react";
import { FileSignature } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { formatPhoneNumber } from "@/lib/phoneUtils";
import { MobileAttendeeCard } from "@/components/shared/MobileAttendeeCard";
import type { PhoneLookupResult } from "@/services/phoneActivationService";

interface MobileActivationPreviewProps {
  phoneNumber: string;
  lookupResult: PhoneLookupResult;
  isProcessing: boolean;
  onActivateSelected: (attendeeIds: string[]) => void;
  onBack: () => void;
  onSignWaiver: (attendee: any) => void;
}

function attendeeId(a: any): string {
  return a.attendee_id ?? a.id;
}

function isSelectable(a: any): boolean {
  return !a.blocked_reason && !a.is_active;
}

export function MobileActivationPreview({
  phoneNumber,
  lookupResult,
  isProcessing,
  onActivateSelected,
  onBack,
  onSignWaiver
}: MobileActivationPreviewProps) {
  const all: any[] = lookupResult.attendee_details ?? [];
  const companions: any[] = lookupResult.order_companions ?? [];
  const companionIds = new Set(companions.map((c: any) => attendeeId(c)));
  const direct = all.filter((a: any) => !companionIds.has(attendeeId(a)));
  const hasCompanions = companions.length > 0;
  const totalInOrder = all.length;

  const waiverBlocked = all.filter((a: any) => a.blocked_reason === 'waiver_required');
  const needsRfid = all.filter((a: any) => a.blocked_reason === 'needs_rfid');

  const allCheckedIn = useMemo(
    () => all.length > 0 && eligibleIds.length === 0 && all.every((a: any) => a.is_active || a.activated_at),
    [all, eligibleIds]
  );

  const eligibleIds = useMemo(
    () => all.filter(isSelectable).map(attendeeId),
    [all]
  );

  // Same person listed twice on one phone number — staff must pick deliberately.
  const duplicateNames = useMemo(() => {
    const counts = new Map<string, number>();
    all.forEach((a: any) => {
      const key = String(a.name ?? '').trim().toLowerCase();
      if (key) counts.set(key, (counts.get(key) ?? 0) + 1);
    });
    return all
      .filter((a: any) => (counts.get(String(a.name ?? '').trim().toLowerCase()) ?? 0) > 1)
      .map((a: any) => a.name)
      .filter((name: string, i: number, arr: string[]) => arr.indexOf(name) === i);
  }, [all]);


  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set(eligibleIds));

  const toggleSelected = (a: any) => {
    if (!isSelectable(a)) return;
    const id = attendeeId(a);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectedCount = selectedIds.size;
  const allEligibleSelected = eligibleIds.length > 0 && eligibleIds.every((id) => selectedIds.has(id));

  const renderSelectableCard = (attendee: any, type: 'direct' | 'companion', key: string) => {
    const selectable = isSelectable(attendee);
    const id = attendeeId(attendee);
    return (
      <div key={key} className="flex items-start gap-3">
        <Checkbox
          checked={selectedIds.has(id)}
          onCheckedChange={() => toggleSelected(attendee)}
          disabled={!selectable || isProcessing}
          className="mt-4 shrink-0"
          aria-label={`Select ${attendee.name}`}
        />
        <div className={selectable ? "flex-1" : "flex-1 opacity-60"}>
          <MobileAttendeeCard attendee={attendee} type={type} />
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header Summary */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Smartphone className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-lg truncate">
                {formatPhoneNumber(phoneNumber)}
              </h3>
              <p className="text-muted-foreground text-sm">
                Found {lookupResult.attendee_count} {lookupResult.attendee_count === 1 ? 'person' : 'people'}
              </p>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="outline" className="text-xs">
                  {lookupResult.has_group_order ? 'Group Order' : 'Individual Registration'}
                </Badge>
                {allCheckedIn && (
                  <Badge variant="default" className="text-xs bg-success text-success-foreground">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Checked In
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Waiver gate */}
      {waiverBlocked.length > 0 && (
        <Alert variant="destructive">
          <FileWarning className="h-4 w-4" />
          <AlertDescription className="space-y-3">
            <p>
              <span className="font-medium">Liability waiver required.</span> Each person signs for
              themselves — everyone else on this order can still check in.
            </p>
            <div className="space-y-2">
              {waiverBlocked.map((a: any) => (
                <div
                  key={attendeeId(a)}
                  className="flex items-center justify-between gap-3 rounded-md bg-background/60 p-2"
                >
                  <span className="text-sm font-medium truncate">{a.name}</span>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="shrink-0"
                    disabled={isProcessing}
                    onClick={() => onSignWaiver(a)}
                  >
                    <FileSignature className="h-4 w-4 mr-1.5" />
                    Sign Waiver
                  </Button>
                </div>
              ))}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {needsRfid.length > 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No wristband is assigned yet for {needsRfid.map((a: any) => a.name).join(', ')}.
            A staff member needs to assign one.
          </AlertDescription>
        </Alert>
      )}

      {duplicateNames.length > 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <span className="font-medium">Duplicate registration:</span>{' '}
            {duplicateNames.join(', ')} appears more than once on this phone number. Check the order
            number and wristband status on each card before checking someone in.
          </AlertDescription>
        </Alert>
      )}


      {/* Select-all shortcut for group orders */}
      {eligibleIds.length > 1 && (
        <div className="flex items-center justify-between rounded-md border border-border/60 px-3 py-2">
          <span className="text-sm text-muted-foreground">
            {selectedCount} of {eligibleIds.length} selected
          </span>
          <Button
            variant="ghost"
            size="sm"
            disabled={isProcessing}
            onClick={() =>
              setSelectedIds(allEligibleSelected ? new Set() : new Set(eligibleIds))
            }
          >
            {allEligibleSelected ? "Clear selection" : "Select everyone"}
          </Button>
        </div>
      )}

      {/* Direct Phone Matches */}
      {direct.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-medium flex items-center gap-2">
            <Users className="h-4 w-4" />
            Your Registration ({direct.length})
          </h4>
          <div className="space-y-2">
            {direct.map((attendee: any, index: number) =>
              renderSelectableCard(attendee, "direct", `direct-${index}`)
            )}
          </div>
        </div>
      )}

      {/* Order Companions */}
      {hasCompanions && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-accent" />
            <h4 className="font-medium">
              Order Companions ({companions.length})
            </h4>
          </div>
          <p className="text-sm text-muted-foreground">
            These people are in the same order but have different phone numbers:
          </p>
          <div className="space-y-2">
            {companions.map((companion: any, index: number) =>
              renderSelectableCard(companion, "companion", `companion-${index}`)
            )}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="sticky bottom-0 bg-background/95 backdrop-blur-sm border-t border-border/50 p-4 -m-4 mt-6">
        <div className="space-y-3">
          {waiverBlocked.length > 0 && (
            <p className="text-xs text-center text-muted-foreground">
              {waiverBlocked.length} {waiverBlocked.length === 1 ? "person still needs" : "people still need"} to sign the waiver before they can be checked in.
            </p>
          )}
          {/* Primary Action: Check-In Selected */}
          <Button
            onClick={() => onActivateSelected(Array.from(selectedIds))}
            disabled={isProcessing || selectedCount === 0}
            size="lg"
            className="w-full h-12 text-base font-medium"
          >
            {isProcessing ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Checking in...
              </div>
            ) : selectedCount === 0 ? (
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                {allCheckedIn ? "Already checked in" : "Nothing to check in"}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5" />
                Check-In {selectedCount === eligibleIds.length
                  ? `Everyone (${selectedCount})`
                  : `Selected (${selectedCount} of ${totalInOrder})`}
              </div>
            )}
          </Button>

          {/* Back Button */}
          <Button
            onClick={onBack}
            variant="ghost"
            size="lg"
            className="w-full h-12 text-base"
            disabled={isProcessing}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>
      </div>
    </div>
  );
}
