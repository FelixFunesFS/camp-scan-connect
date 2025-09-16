import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronUp, User, Phone, CreditCard, CheckCircle2, Clock } from "lucide-react";
import { formatPhoneNumber, formatMealPlan } from "@/lib/phoneUtils";

interface AttendeeData {
  id?: string;
  name: string;
  order_id?: string;
  phone?: string;
  meal_plan?: string;
  rfid_uid?: string;
  is_activated?: boolean;
  rfid_activated_at?: string;
  activated_at?: string;
}

interface MobileAttendeeCardProps {
  attendee: AttendeeData;
  type: 'direct' | 'companion';
  showDetails?: boolean;
  onToggleDetails?: () => void;
}

export function MobileAttendeeCard({ 
  attendee, 
  type, 
  showDetails = false, 
  onToggleDetails 
}: MobileAttendeeCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const isActivated = attendee.is_activated || attendee.activated_at;
  const hasRfid = attendee.rfid_uid;
  const isMockRfid = attendee.rfid_uid?.startsWith('MOCK');

  return (
    <Card className={`transition-all duration-200 ${
      type === 'companion' 
        ? 'border-accent/30 bg-accent/5' 
        : 'border-primary/20 bg-primary/5'
    }`}>
      <CardContent className="p-4">
        <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="font-medium truncate">{attendee.name}</span>
                {type === 'companion' && (
                  <Badge variant="outline" className="text-xs">
                    Companion
                  </Badge>
                )}
              </div>
              
              <div className="flex items-center gap-2 flex-wrap">
                {/* Activation Status */}
                {isActivated ? (
                  <Badge className="text-xs bg-green-100 text-green-800 border-green-200">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Active
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-xs text-amber-700 border-amber-200 bg-amber-50">
                    <Clock className="h-3 w-3 mr-1" />
                    Pending
                  </Badge>
                )}

                {/* Meal Plan */}
                <Badge variant="secondary" className="text-xs">
                  {formatMealPlan(attendee.meal_plan)}
                </Badge>

                {/* RFID Status */}
                {hasRfid && (
                  <Badge variant="outline" className={`text-xs ${
                    isMockRfid 
                      ? 'bg-purple-50 text-purple-700 border-purple-200' 
                      : 'bg-blue-50 text-blue-700 border-blue-200'
                  }`}>
                    <CreditCard className="h-3 w-3 mr-1" />
                    {isMockRfid ? 'Test' : 'RFID'}
                  </Badge>
                )}
              </div>
            </div>

            {showDetails && onToggleDetails && (
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="p-2">
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
              </CollapsibleTrigger>
            )}
          </div>

          {showDetails && (
            <CollapsibleContent className="mt-3 pt-3 border-t border-border/50">
              <div className="space-y-2 text-sm">
                {attendee.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-3 w-3 text-muted-foreground" />
                    <span className="text-muted-foreground">
                      {formatPhoneNumber(attendee.phone)}
                    </span>
                  </div>
                )}
                
                {attendee.order_id && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Order:</span>
                    <span className="font-mono text-xs">{attendee.order_id}</span>
                  </div>
                )}

                {hasRfid && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">RFID:</span>
                    <span className="font-mono text-xs">{attendee.rfid_uid}</span>
                  </div>
                )}

                {(attendee.activated_at || attendee.rfid_activated_at) && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Activated:</span>
                    <span className="text-xs">
                      {new Date(attendee.activated_at || attendee.rfid_activated_at || '').toLocaleString()}
                    </span>
                  </div>
                )}
              </div>
            </CollapsibleContent>
          )}
        </Collapsible>
      </CardContent>
    </Card>
  );
}