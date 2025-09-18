import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Users, Search, AlertCircle, CheckCircle2, Phone, Mail, User, Hash } from "lucide-react";
import { MobileAttendeeCard } from "./MobileAttendeeCard";
import { formatPhoneNumber, formatMealPlan } from "@/lib/phoneUtils";
import { getOrderGroupBackgroundColor, groupAttendeesByOrder, getOrderBadgeColor } from "@/utils/orderGroupUtils";
import type { UnifiedSearchResult } from "@/services/enhancedActivationService";

interface UnifiedActivationPreviewProps {
  searchQuery: string;
  searchResult: UnifiedSearchResult;
  isProcessing: boolean;
  onActivateSearchGroup: () => void;
  onActivateEntireOrder: () => void;
  onBack: () => void;
}

export function UnifiedActivationPreview({
  searchQuery,
  searchResult,
  isProcessing,
  onActivateSearchGroup,
  onActivateEntireOrder,
  onBack
}: UnifiedActivationPreviewProps) {
  const hasCompanions = searchResult.order_companions && searchResult.order_companions.length > 0;
  const directCount = searchResult.attendee_details?.length || 0;
  const companionCount = searchResult.order_companions?.length || 0;
  const totalInOrder = directCount + companionCount;

  // Group all attendees for consistent color coding
  const allAttendees = [
    ...(searchResult.attendee_details || []),
    ...(searchResult.order_companions || [])
  ];
  const orderGroups = groupAttendeesByOrder(allAttendees);
  const uniqueOrderCount = orderGroups.filter(group => group.orderId !== null).length;

  const getSearchIcon = () => {
    switch (searchResult.searchType) {
      case 'phone': return <Phone className="h-5 w-5 text-primary" />;
      case 'email': return <Mail className="h-5 w-5 text-primary" />;
      case 'order_id': return <Hash className="h-5 w-5 text-primary" />;
      case 'name': return <User className="h-5 w-5 text-primary" />;
      default: return <Search className="h-5 w-5 text-primary" />;
    }
  };

  const getSearchTypeLabel = () => {
    switch (searchResult.searchType) {
      case 'phone': return 'Phone Number';
      case 'email': return 'Email Address';
      case 'order_id': return 'Order ID';
      case 'name': return 'Name';
      default: return 'Search';
    }
  };

  return (
    <div className="space-y-4">
      {/* Header Summary */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              {getSearchIcon()}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-lg truncate">
                {getSearchTypeLabel()}: {searchQuery}
              </h3>
              <p className="text-muted-foreground text-sm">
                Found {searchResult.attendee_count} {searchResult.attendee_count === 1 ? 'person' : 'people'}
                {uniqueOrderCount > 1 && ` across ${uniqueOrderCount} orders`}
              </p>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="outline" className="text-xs">
                  {searchResult.has_group_order ? 'Group Order' : 'Individual Registration'}
                </Badge>
                {searchResult.order_id && (
                  <Badge variant="secondary" className="text-xs font-mono">
                    #{searchResult.order_id}
                  </Badge>
                )}
                {uniqueOrderCount > 1 && (
                  <Badge variant="outline" className="text-xs bg-accent/10 text-accent">
                    {uniqueOrderCount} Orders
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Direct Search Matches */}
      {directCount > 0 && (
        <div className="space-y-3">
          <h4 className="font-medium flex items-center gap-2">
            <Users className="h-4 w-4" />
            {searchResult.searchType === 'order_id' ? 'Order Members' : 'Direct Matches'} ({directCount})
          </h4>
          <div className="space-y-2">
            {searchResult.attendee_details?.map((attendee: any, index: number) => (
              <MobileAttendeeCard 
                key={`direct-${index}`}
                attendee={attendee}
                type="direct"
                showDetails={true}
                backgroundColor={getOrderGroupBackgroundColor(attendee.order_id)}
                primarySearchOrderId={searchResult.order_id}
              />
            ))}
          </div>
        </div>
      )}

      {/* Order Companions (only for non-order searches) */}
      {hasCompanions && searchResult.searchType !== 'order_id' && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-accent" />
            <h4 className="font-medium">
              Order Companions ({companionCount})
            </h4>
          </div>
          <p className="text-sm text-muted-foreground">
            These people are in the same order:
          </p>
          <div className="space-y-2">
            {searchResult.order_companions?.map((companion: any, index: number) => (
              <MobileAttendeeCard 
                key={`companion-${index}`}
                attendee={companion}
                type="companion"
                showDetails={true}
                backgroundColor={getOrderGroupBackgroundColor(companion.order_id)}
                primarySearchOrderId={searchResult.order_id}
              />
            ))}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="sticky bottom-0 bg-background/95 backdrop-blur-sm border-t border-border/50 p-4 -m-4 mt-6">
        <div className="space-y-3">
          {/* Primary Action: Activate Search Group */}
          <Button
            onClick={onActivateSearchGroup}
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
                {searchResult.searchType === 'order_id' ? 
                  `Activate All Order Members (${directCount})` : 
                  `Activate Direct Matches (${directCount})`
                }
              </div>
            )}
          </Button>

          {/* Secondary Action: Activate Entire Order (if applicable and not order search) */}
          {hasCompanions && searchResult.searchType !== 'order_id' && (
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