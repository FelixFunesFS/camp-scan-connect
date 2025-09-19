import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Users, Smartphone, AlertCircle, CheckCircle2 } from "lucide-react";
import { formatPhoneNumber } from "@/lib/phoneUtils";
import { MobileAttendeeCard } from "@/components/shared/MobileAttendeeCard";
import type { PhoneLookupResult } from "@/services/phoneActivationService";

interface MobileActivationPreviewProps {
  phoneNumber: string;
  lookupResult: PhoneLookupResult;
  isProcessing: boolean;
  onActivatePhoneGroup: () => void;
  onActivateEntireOrder: () => void;
  onBack: () => void;
}

export function MobileActivationPreview({
  phoneNumber,
  lookupResult,
  isProcessing,
  onActivatePhoneGroup,
  onActivateEntireOrder,
  onBack
}: MobileActivationPreviewProps) {
  const hasCompanions = lookupResult.order_companions && lookupResult.order_companions.length > 0;
  const directCount = lookupResult.attendee_details?.length || 0;
  const companionCount = lookupResult.order_companions?.length || 0;
  const totalInOrder = directCount + companionCount;

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
                {lookupResult.order_id && (
                  <Badge variant="secondary" className="text-xs font-mono">
                    #{lookupResult.order_id}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Direct Phone Matches */}
      {directCount > 0 && (
        <div className="space-y-3">
          <h4 className="font-medium flex items-center gap-2">
            <Users className="h-4 w-4" />
            Your Registration ({directCount})
          </h4>
          <div className="space-y-2">
            {lookupResult.attendee_details?.map((attendee: any, index: number) => (
              <MobileAttendeeCard
                key={`direct-${index}`}
                attendee={attendee}
                type="direct"
                showDetails={true}
              />
            ))}
          </div>
        </div>
      )}

      {/* Order Companions */}
      {hasCompanions && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-accent" />
            <h4 className="font-medium">
              Order Companions ({companionCount})
            </h4>
          </div>
          <p className="text-sm text-muted-foreground">
            These people are in the same order but have different phone numbers:
          </p>
          <div className="space-y-2">
            {lookupResult.order_companions?.map((companion: any, index: number) => (
              <MobileAttendeeCard
                key={`companion-${index}`}
                attendee={companion}
                type="companion"
                showDetails={true}
              />
            ))}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="sticky bottom-0 bg-background/95 backdrop-blur-sm border-t border-border/50 p-4 -m-4 mt-6">
        <div className="space-y-3">
          {/* Primary Action: Activate Phone Group */}
          <Button
            onClick={onActivatePhoneGroup}
            disabled={isProcessing}
            size="lg"
            className="w-full h-12 text-base font-medium"
          >
            {isProcessing ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Activating...
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5" />
                Activate My Registration ({directCount})
              </div>
            )}
          </Button>

          {/* Secondary Action: Activate Entire Order (if applicable) */}
          {hasCompanions && (
            <Button
              onClick={onActivateEntireOrder}
              disabled={isProcessing}
              variant="outline"
              size="lg"
              className="w-full h-12 text-base font-medium border-accent text-accent hover:bg-accent hover:text-accent-foreground"
            >
              {isProcessing ? "Activating..." : `Activate Entire Order (${totalInOrder})`}
            </Button>
          )}

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