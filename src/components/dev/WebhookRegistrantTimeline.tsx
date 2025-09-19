import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { ExternalLink, Phone, Mail, MapPin, Clock, User } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { EnhancedAttendee } from "@/types/attendee";

interface WebhookRegistrant extends EnhancedAttendee {
  created_at: string;
  ticket_type: string;
  meal_plan?: string;
  arrival_window?: string;
  registration_status: string;
}

export const WebhookRegistrantTimeline = () => {
  const [registrants, setRegistrants] = useState<WebhookRegistrant[]>([]);
  const [loading, setLoading] = useState(true);
  const [liveCount, setLiveCount] = useState(0);
  const navigate = useNavigate();

  const fetchWebhookRegistrants = async () => {
    try {
      const { data, error } = await supabase
        .from('attendees')
        .select('*')
        .eq('registration_status', 'registered')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setRegistrants(data || []);
      setLiveCount(data?.length || 0);
    } catch (error) {
      console.error('Error fetching webhook registrants:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWebhookRegistrants();

    // Set up real-time subscription for new registrants
    const channel = supabase
      .channel('webhook-registrants')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'attendees'
        },
        (payload) => {
          const newRegistrant = payload.new as WebhookRegistrant;
          if (newRegistrant.registration_status === 'registered') {
            setRegistrants(prev => [newRegistrant, ...prev.slice(0, 49)]);
            setLiveCount(prev => prev + 1);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const getTicketTypeColor = (ticketType: string) => {
    switch (ticketType.toLowerCase()) {
      case 'glamping': return 'bg-purple-500/10 text-purple-700 border-purple-500/20';
      case 'cabin': return 'bg-orange-500/10 text-orange-700 border-orange-500/20';
      case 'rv_site': return 'bg-blue-500/10 text-blue-700 border-blue-500/20';
      case 'dry_site': return 'bg-green-500/10 text-green-700 border-green-500/20';
      default: return 'bg-gray-500/10 text-gray-700 border-gray-500/20';
    }
  };

  const formatTicketType = (ticketType: string) => {
    return ticketType.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Loading registrant timeline...</CardTitle>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Live Registrants</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{liveCount}</div>
            <p className="text-xs text-muted-foreground">Total in timeline</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {registrants.filter(r => 
                new Date(r.created_at) > new Date(Date.now() - 24 * 60 * 60 * 1000)
              ).length}
            </div>
            <p className="text-xs text-muted-foreground">Last 24 hours</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Connection Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-sm font-medium">Live</span>
            </div>
            <p className="text-xs text-muted-foreground">Webhook active</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            New Registrant Timeline
          </CardTitle>
          <CardDescription>
            Real-time feed of webhook-registered attendees (most recent first)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[600px]">
            <div className="space-y-4">
              {registrants.map((registrant, index) => (
                <div key={registrant.id} className="group">
                  <div className="flex gap-4 p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="text-xs">
                        {registrant.first_name?.charAt(0)}{registrant.last_name?.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 space-y-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-medium">
                            {registrant.first_name} {registrant.last_name}
                          </h4>
                          <div className="flex items-center gap-2 mt-1">
                            <Clock className="h-3 w-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(registrant.created_at), { addSuffix: true })}
                            </span>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/attendee/${registrant.id}`)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Badge variant="outline" className={getTicketTypeColor(registrant.ticket_type)}>
                          {formatTicketType(registrant.ticket_type)}
                        </Badge>
                        {registrant.meal_plan && (
                          <Badge variant="secondary">
                            {registrant.meal_plan}
                          </Badge>
                        )}
                        {registrant.arrival_window && (
                          <Badge variant="outline">
                            {registrant.arrival_window}
                          </Badge>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-muted-foreground">
                        {registrant.email && (
                          <div className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            <span className="truncate">{registrant.email}</span>
                          </div>
                        )}
                        {registrant.phone && (
                          <div className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            <span>{registrant.phone}</span>
                          </div>
                        )}
                        {registrant.order_id && (
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            <span className="font-mono text-xs">Order: {registrant.order_id}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  {index < registrants.length - 1 && <Separator className="mt-4" />}
                </div>
              ))}
              
              {registrants.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <User className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No registrants found</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};