import { useCallback, useEffect, useState } from "react";
import { UserCheck, MapPin, Headphones, Shirt } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getCurrentEventId } from "@/lib/eventRuntime";
import { TimePeriod, getStandardTimeBoundaries, getDrinksHeadphonesTimeBoundaries } from "@/utils/etTimezone";
import { useBackgroundRefresh } from "@/hooks/useBackgroundRefresh";
import { TShirtService } from "@/services/tshirtService";
import { Skeleton } from "@/components/ui/skeleton";

export type KpiTarget = 'recent' | 'status' | 'services' | 'tshirts';

interface ReportsKpiStripProps {
  selectedPeriod: TimePeriod;
  refreshTrigger?: number;
  onSelect: (section: KpiTarget) => void;
}

interface KpiData {
  checkedIn: number;
  totalAttendees: number;
  onSite: number;
  headphonesOut: number;
  tshirtsPickedUp: number;
  tshirtsOrdered: number;
}

const emptyData: KpiData = {
  checkedIn: 0,
  totalAttendees: 0,
  onSite: 0,
  headphonesOut: 0,
  tshirtsPickedUp: 0,
  tshirtsOrdered: 0,
};

export const ReportsKpiStrip = ({ selectedPeriod, refreshTrigger, onSelect }: ReportsKpiStripProps) => {
  const [data, setData] = useState<KpiData>(emptyData);
  const [isLoading, setIsLoading] = useState(true);

  const fetchKpis = useCallback(async (isBackground = false) => {
    if (!isBackground) setIsLoading(true);
    try {
      const eventId = getCurrentEventId();
      const gateBoundaries = getStandardTimeBoundaries(selectedPeriod);
      const hpBoundaries = getDrinksHeadphonesTimeBoundaries(selectedPeriod);

      const [totalRes, activeRes, gateRes, hpRes, tshirtRes] = await Promise.all([
        supabase
          .from('attendees')
          .select('id', { count: 'exact', head: true })
          .eq('event_id', eventId)
          .eq('registration_status', 'registered'),
        supabase
          .from('rfid_tags')
          .select('uid', { count: 'exact', head: true })
          .eq('event_id', eventId)
          .eq('status', 'active'),
        supabase
          .from('station_transactions')
          .select('attendee_id, transaction_type, created_at')
          .eq('event_id', eventId)
          .eq('station_type', 'main_gate')
          .in('transaction_type', ['gate_entry', 'gate_exit'])
          .gte('created_at', gateBoundaries.start.toISOString())
          .lt('created_at', gateBoundaries.end.toISOString())
          .order('created_at', { ascending: true }),
        supabase
          .from('station_transactions')
          .select('attendee_id, transaction_type, created_at')
          .eq('event_id', eventId)
          .eq('station_type', 'headphones')
          .in('transaction_type', ['headphone_checkout', 'headphone_checkin'])
          .gte('created_at', hpBoundaries.start.toISOString())
          .lt('created_at', hpBoundaries.end.toISOString())
          .order('created_at', { ascending: true }),
        TShirtService.getTShirtPickupData(),
      ]);

      const onSiteMap = new Map<string, boolean>();
      (gateRes.data || []).forEach((t: any) => {
        onSiteMap.set(t.attendee_id, t.transaction_type === 'gate_entry');
      });

      const hpMap = new Map<string, boolean>();
      (hpRes.data || []).forEach((t: any) => {
        hpMap.set(t.attendee_id, t.transaction_type === 'headphone_checkout');
      });

      setData({
        totalAttendees: totalRes.count || 0,
        checkedIn: activeRes.count || 0,
        onSite: Array.from(onSiteMap.values()).filter(Boolean).length,
        headphonesOut: Array.from(hpMap.values()).filter(Boolean).length,
        tshirtsPickedUp: tshirtRes.stats.pickedUp,
        tshirtsOrdered: tshirtRes.stats.totalOrdered,
      });
    } catch (error) {
      console.error('Error loading report KPIs:', error);
    } finally {
      if (!isBackground) setIsLoading(false);
    }
  }, [selectedPeriod]);

  useBackgroundRefresh({
    onRefresh: () => fetchKpis(true),
    refreshTrigger,
  });

  useEffect(() => {
    fetchKpis(false);
  }, [fetchKpis]);

  const pct = (value: number, total: number) => (total > 0 ? Math.round((value / total) * 100) : 0);

  const cards: Array<{
    id: KpiTarget;
    label: string;
    value: string;
    sub: string;
    icon: JSX.Element;
  }> = [
    {
      id: 'recent',
      label: 'Check-ins',
      value: `${data.checkedIn}`,
      sub: `of ${data.totalAttendees} • ${pct(data.checkedIn, data.totalAttendees)}%`,
      icon: <UserCheck className="h-4 w-4 text-success" />,
    },
    {
      id: 'status',
      label: 'On-Site',
      value: `${data.onSite}`,
      sub: 'currently inside',
      icon: <MapPin className="h-4 w-4 text-primary" />,
    },
    {
      id: 'services',
      label: 'Headphones',
      value: `${data.headphonesOut}`,
      sub: 'checked out',
      icon: <Headphones className="h-4 w-4 text-primary" />,
    },
    {
      id: 'tshirts',
      label: 'T-Shirts',
      value: `${pct(data.tshirtsPickedUp, data.tshirtsOrdered)}%`,
      sub: `${data.tshirtsPickedUp} of ${data.tshirtsOrdered} picked up`,
      icon: <Shirt className="h-4 w-4 text-primary" />,
    },
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map(i => (
          <Skeleton key={i} className="h-[72px] rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-2 lg:grid-cols-4" aria-label="Key event metrics">
      {cards.map(card => (
        <button
          key={card.id}
          type="button"
          onClick={() => onSelect(card.id)}
          aria-label={`${card.label}: ${card.value} ${card.sub}. Go to section.`}
          className="flex min-h-[72px] flex-col justify-center gap-0.5 rounded-lg border bg-card p-3 text-left shadow-sm transition-colors hover:bg-accent/50 active:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
            {card.icon}
            {card.label}
          </span>
          <span className="text-xl font-bold leading-none">{card.value}</span>
          <span className="truncate text-[11px] text-muted-foreground">{card.sub}</span>
        </button>
      ))}
    </div>
  );
};
