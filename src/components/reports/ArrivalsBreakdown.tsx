import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Plane, Users, TrendingUp, Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useBackgroundRefresh } from "@/hooks/useBackgroundRefresh";

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
  const [totalStats, setTotalStats] = useState({ total: 0, activated: 0, remaining: 0, percentage: 0 });

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
        .eq('registration_status', 'registered')
        .eq('rfid_tags.status', 'active');

      const { data: allAttendees } = await supabase
        .from('attendees')
        .select('id, ticket_type, activated_at')
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

      // Sort by total count (largest first)
      ticketStats.sort((a, b) => b.total - a.total);

      // Calculate overall totals
      const overallTotal = ticketStats.reduce((sum, stat) => sum + stat.total, 0);
      const overallActivated = ticketStats.reduce((sum, stat) => sum + stat.activated, 0);
      const overallRemaining = overallTotal - overallActivated;
      const overallPercentage = overallTotal > 0 ? Math.round((overallActivated / overallTotal) * 100) : 0;

      setStats(ticketStats);
      setTotalStats({
        total: overallTotal,
        activated: overallActivated,
        remaining: overallRemaining,
        percentage: overallPercentage
      });
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

  const formatTicketType = (type: string): string => {
    switch (type) {
      case 'dry_site':
        return 'Dry Site';
      case 'glamping':
        return 'Glamping';
      case 'cabin':
        return 'Cabin';
      case 'rv_site':
        return 'RV Site';
      default:
        return type.charAt(0).toUpperCase() + type.slice(1);
    }
  };

  const getProgressColor = (percentage: number): string => {
    if (percentage >= 80) return 'bg-success';
    if (percentage >= 40) return 'bg-warning';
    return 'bg-destructive';
  };

  const getCardBackground = (percentage: number): string => {
    if (percentage >= 80) return 'bg-success/5 border-success/20';
    if (percentage >= 40) return 'bg-warning/5 border-warning/20';
    return 'bg-destructive/5 border-destructive/20';
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plane className="h-5 w-5" />
            Arrivals by Ticket Type
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-20 bg-muted rounded"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1,2,3,4].map(i => (
                <div key={i} className="h-24 bg-muted rounded"></div>
              ))}
            </div>
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
            <Plane className="h-5 w-5" />
            Arrivals by Ticket Type
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Overall Summary */}
          <div className="text-center space-y-3 p-4 bg-primary/5 rounded-lg border border-primary/20">
            <div className="text-3xl font-bold text-primary">
              {totalStats.activated} / {totalStats.total}
            </div>
            <div className="text-lg text-muted-foreground">
              Total Arrivals Processed
            </div>
            <Progress value={totalStats.percentage} className="h-3" />
            <div className="flex items-center justify-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                <span className="text-primary font-medium">{totalStats.percentage}% Complete</span>
              </div>
              <div className="text-muted-foreground">
                {totalStats.remaining} Remaining
              </div>
            </div>
          </div>

          {/* Ticket Type Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {stats.map((stat) => (
              <Tooltip key={stat.ticket_type}>
                <TooltipTrigger asChild>
                  <Card className={`cursor-help transition-all hover:scale-105 ${getCardBackground(stat.percentage)}`}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="font-medium text-sm">
                          {formatTicketType(stat.ticket_type)}
                        </div>
                        <Badge 
                          variant="secondary" 
                          className={`text-xs ${
                            stat.percentage >= 80 ? 'bg-success/20 text-success' :
                            stat.percentage >= 40 ? 'bg-warning/20 text-warning' :
                            'bg-destructive/20 text-destructive'
                          }`}
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
                          className={`h-2 ${getProgressColor(stat.percentage)}`}
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
                        {stat.percentage >= 80 ? 'High completion rate' :
                         stat.percentage >= 40 ? 'Moderate completion rate' :
                         'Low completion rate'}
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