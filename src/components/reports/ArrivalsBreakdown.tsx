import { getCurrentEventId } from "@/lib/eventRuntime";
import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Caravan, Users, Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useBackgroundRefresh } from "@/hooks/useBackgroundRefresh";
import { formatTicketType, getTicketTypeStyle, getTicketTypeOrder } from "@/lib/ticketTypes";

interface TicketTypeStats {
  ticket_type: string;
  total: number;
  activated: number;
  remaining: number;
  percentage: number;
}

interface ArrivalsBreakdownProps {
  refreshTrigger?: number;
}

export const ArrivalsBreakdown = ({ refreshTrigger }: ArrivalsBreakdownProps) => {
  const [stats, setStats] = useState<TicketTypeStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchArrivalsData = useCallback(async () => {
    try {
      // Get attendee counts by ticket type with activation status
      const { data: attendees } = await supabase
        .from('attendees')
        .select(`
          id,
          ticket_type,
          activated_at,
          rfid_tags!inner(uid, status)
        `)
        .eq('event_id', getCurrentEventId())
        .eq('registration_status', 'registered')
        .eq('rfid_tags.status', 'active');

      const { data: allAttendees } = await supabase
        .from('attendees')
        .select('id, ticket_type, activated_at')
        .eq('event_id', getCurrentEventId())
        .eq('registration_status', 'registered');

      if (!allAttendees) return;

      // Get attendees with active RFID
      const attendeesWithActiveRfid = attendees?.map(a => a.id) || [];

      // Group by ticket type
      const ticketTypeGroups = allAttendees.reduce((acc, attendee) => {
        const type = attendee.ticket_type;
        if (!acc[type]) {
          acc[type] = { total: 0, activated: 0 };
        }
        acc[type].total++;
        
        // Count as activated if they have activated_at OR active RFID
        if (attendee.activated_at || attendeesWithActiveRfid.includes(attendee.id)) {
          acc[type].activated++;
        }
        
        return acc;
      }, {} as Record<string, { total: number; activated: number }>);

      // Convert to stats array with proper formatting
      const ticketStats: TicketTypeStats[] = Object.entries(ticketTypeGroups).map(([type, data]) => {
        const remaining = data.total - data.activated;
        const percentage = data.total > 0 ? Math.round((data.activated / data.total) * 100) : 0;
        
        return {
          ticket_type: type,
          total: data.total,
          activated: data.activated,
          remaining,
          percentage
        };
      });

      // Consistent category order across the app
      ticketStats.sort(
        (a, b) =>
          getTicketTypeOrder(a.ticket_type) - getTicketTypeOrder(b.ticket_type) ||
          b.total - a.total
      );

      setStats(ticketStats);
    } catch (error) {
      console.error('Error fetching arrivals data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useBackgroundRefresh({
    onRefresh: fetchArrivalsData,
    refreshTrigger
  });

  const getTicketTypeColors = getTicketTypeStyle;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Caravan className="h-5 w-5" />
            Arrivals by Ticket Type
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1,2,3,4,5,6,7,8].map(i => (
              <div key={i} className="h-24 bg-muted rounded animate-pulse"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <TooltipProvider>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Caravan className="h-5 w-5" />
            Arrivals by Ticket Type
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map((stat) => (
              <Tooltip key={stat.ticket_type}>
                <TooltipTrigger asChild>
                  <Card className={`cursor-help transition-all hover:scale-105 ${getTicketTypeColors(stat.ticket_type).background}`}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="font-medium text-sm">
                          {formatTicketType(stat.ticket_type)}
                        </div>
                        <Badge 
                          variant="secondary" 
                          className={`text-xs ${getTicketTypeColors(stat.ticket_type).badge}`}
                        >
                          {stat.percentage}%
                        </Badge>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-2xl font-bold">
                            {stat.activated}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            of {stat.total}
                          </span>
                        </div>
                        
                        <Progress 
                          value={stat.percentage} 
                          className={`h-2 [&>div]:${getTicketTypeColors(stat.ticket_type).progress}`}
                        />
                        
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>{stat.remaining} remaining</span>
                          <div className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            <span>{stat.total} total</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TooltipTrigger>
                <TooltipContent>
                  <div className="text-sm">
                    <p className="font-medium">{formatTicketType(stat.ticket_type)} Details</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Processed: {stat.activated} / {stat.total} ({stat.percentage}%)
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Still pending: {stat.remaining} attendees
                    </p>
                    <div className="flex items-center gap-1 mt-2">
                      <Info className="h-3 w-3" />
                      <span className="text-xs">
                        {formatTicketType(stat.ticket_type)} ticket holders
                      </span>
                    </div>
                  </div>
                </TooltipContent>
              </Tooltip>
            ))}
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
};