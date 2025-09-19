import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Users, Search, AlertCircle, CheckCircle2, Phone, Mail, User, Hash, AlertTriangle } from "lucide-react";
import { MobileAttendeeCard } from "@/components/shared/MobileAttendeeCard";
import type { NotificationState } from "@/types/attendee";
import { formatPhoneNumber, formatMealPlan } from "@/lib/phoneUtils";
import { getOrderGroupBackgroundColor, groupAttendeesByOrder, getOrderBadgeColor } from "@/utils/orderGroupUtils";
import type { UnifiedSearchResult } from "@/services/enhancedActivationService";

interface AttendeeNotification {
  attendeeId: string;
  state: NotificationState;
  message: string;
  showNotification: boolean;
}

interface UnifiedActivationPreviewProps {
  searchQuery: string;
  searchResult: UnifiedSearchResult;
  isProcessing: boolean;
  onActivateSearchGroup: (notifications: AttendeeNotification[]) => void;
  onActivateEntireOrder: (notifications: AttendeeNotification[]) => void;
  onBack: () => void;
  onRefreshResults: () => Promise<void>;
  attendeeNotifications?: AttendeeNotification[];
}

export function UnifiedActivationPreview({
  searchQuery,
  searchResult,
  isProcessing,
  onActivateSearchGroup,
  onActivateEntireOrder,
  onBack,
  onRefreshResults,
  attendeeNotifications = []
}: UnifiedActivationPreviewProps) {
  const [localNotifications, setLocalNotifications] = useState<AttendeeNotification[]>(attendeeNotifications);
  const hasCompanions = searchResult.order_companions && searchResult.order_companions.length > 0;
  const directCount = searchResult.attendee_details?.length || 0;
  const companionCount = searchResult.order_companions?.length || 0;
  const totalInOrder = directCount + companionCount;
  
  // Count attendees available for activation (have RFID but not activated)
  const availableForActivation = [...(searchResult.attendee_details || []), ...(searchResult.order_companions || [])]
    .filter(a => a.has_rfid && !a.is_activated).length;
  const directAvailableCount = searchResult.attendee_details?.filter(a => a.has_rfid && !a.is_activated).length || 0;

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

  const getAttendeeNotification = (attendeeId: string) => {
    return localNotifications.find(n => n.attendeeId === attendeeId);
  };

  const handleDismissNotification = (attendeeId: string) => {
    setLocalNotifications(prev => prev.filter(n => n.attendeeId !== attendeeId));
  };

  const handleActivateSearchGroup = async () => {
    onActivateSearchGroup(localNotifications);
    // Refresh results after a short delay to allow database updates
    setTimeout(async () => {
      await onRefreshResults();
    }, 1000);
  };

  const handleActivateEntireOrder = async () => {
    onActivateEntireOrder(localNotifications);
    // Refresh results after a short delay to allow database updates
    setTimeout(async () => {
      await onRefreshResults();
    }, 1000);
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
            {directAvailableCount !== directCount && (
              <Badge variant="secondary" className="text-xs ml-1">
                {directAvailableCount} available for activation
              </Badge>
            )}
          </h4>
          <div className="space-y-2">
            {searchResult.attendee_details?.map((attendee: any, index: number) => {
              const notification = getAttendeeNotification(attendee.id);
              return (
                <MobileAttendeeCard 
                  key={`direct-${index}`}
                  attendee={attendee}
                  type="direct"
                  showDetails={true}
                  backgroundColor={getOrderGroupBackgroundColor(attendee.order_id)}
                  primarySearchOrderId={searchResult.order_id}
                  notificationState={notification?.state}
                  notificationMessage={notification?.message}
                  showNotification={notification?.showNotification}
                  onDismissNotification={() => handleDismissNotification(attendee.id)}
                />
              );
            })}
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
            {searchResult.order_companions?.map((companion: any, index: number) => {
              const notification = getAttendeeNotification(companion.id);
              return (
                <MobileAttendeeCard 
                  key={`companion-${index}`}
                  attendee={companion}
                  type="companion"
                  showDetails={true}
                  backgroundColor={getOrderGroupBackgroundColor(companion.order_id)}
                  primarySearchOrderId={searchResult.order_id}
                  notificationState={notification?.state}
                  notificationMessage={notification?.message}
                  showNotification={notification?.showNotification}
                  onDismissNotification={() => handleDismissNotification(companion.id)}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="sticky bottom-0 bg-background/95 backdrop-blur-sm border-t border-border/50 p-4 -m-4 mt-6">
        <div className="space-y-3">
          {/* Primary Action: Activate Search Group */}
          <Button
            onClick={handleActivateSearchGroup}
            disabled={isProcessing || directAvailableCount === 0}
            size="lg"
            className="w-full h-12 text-base font-medium"
          >
            {isProcessing ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Activating...
              </div>
            ) : directAvailableCount === 0 ? (
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                No RFID Attendees Available
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5" />
                {searchResult.searchType === 'order_id' ? 
                  `Activate Available Order Members (${directAvailableCount})` : 
                  `Activate Available Direct Matches (${directAvailableCount})`
                }
              </div>
            )}
          </Button>

          {/* Secondary Action: Activate Entire Order (if applicable and not order search) */}
          {hasCompanions && searchResult.searchType !== 'order_id' && (
            <Button
              onClick={handleActivateEntireOrder}
              disabled={isProcessing || availableForActivation === 0}
              variant="outline"
              size="lg"
              className="w-full h-12 text-base font-medium border-accent text-accent hover:bg-accent hover:text-accent-foreground"
            >
              {isProcessing ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-accent"></div>
                  Activating Order...
                </div>
              ) : availableForActivation === 0 ? (
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  No RFID Attendees in Order
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Activate Entire Order ({availableForActivation})
                </div>
              )}
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