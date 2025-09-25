import { useState, useCallback } from 'react';
import { CurrentlyOnSiteAttendees } from './CurrentlyOnSiteAttendees';
import { supabase } from "@/integrations/supabase/client";
import { TimePeriod, getStandardTimeBoundaries } from "@/utils/etTimezone";
import { useBackgroundRefresh } from "@/hooks/useBackgroundRefresh";

interface OnSiteAttendee {
  name: string;
  rfid_uid: string;
  entry_time: string;
  duration_minutes: number;
}

interface CheckInStatusAndOnSiteProps {
  refreshTrigger?: number;
  selectedPeriod: TimePeriod;
}

export const CheckInStatusAndOnSite = ({ refreshTrigger, selectedPeriod }: CheckInStatusAndOnSiteProps) => {
  const [onSiteAttendees, setOnSiteAttendees] = useState<OnSiteAttendee[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchOnSiteData = useCallback(async () => {
    try {
      // Use midnight boundaries for gate access
      const boundaries = getStandardTimeBoundaries(selectedPeriod);
      
      // Get all gate transactions for the period
      const { data: gateTransactions } = await supabase
        .from('station_transactions')
        .select('*')
        .eq('station_type', 'main_gate')
        .in('transaction_type', ['gate_entry', 'gate_exit'])
        .gte('created_at', boundaries.start.toISOString())
        .lt('created_at', boundaries.end.toISOString())
        .order('created_at', { ascending: true });

      if (!gateTransactions) {
        setOnSiteAttendees([]);
        setIsLoading(false);
        return;
      }

      // Calculate current occupancy and on-site attendees
      const attendeeStatus = new Map<string, { lastTransaction: any; isOnSite: boolean }>();
      
      gateTransactions.forEach(transaction => {
        const attendeeId = transaction.attendee_id;
        const isEntry = transaction.transaction_type === 'gate_entry';
        
        attendeeStatus.set(attendeeId, {
          lastTransaction: transaction,
          isOnSite: isEntry
        });
      });

      // Get currently on-site attendees with details
      const onSiteAttendeeIds = Array.from(attendeeStatus.entries())
        .filter(([_, status]) => status.isOnSite)
        .map(([attendeeId, _]) => attendeeId);

      let onSiteAttendeesData: OnSiteAttendee[] = [];

      // If we have on-site attendees, fetch their names separately
      if (onSiteAttendeeIds.length > 0) {
        const { data: attendeeData } = await supabase
          .from('attendees')
          .select('id, first_name, last_name')
          .in('id', onSiteAttendeeIds);

        const attendeeMap = new Map(attendeeData?.map(a => [a.id, `${a.first_name} ${a.last_name}`]) || []);

        onSiteAttendeesData = Array.from(attendeeStatus.entries())
          .filter(([_, status]) => status.isOnSite)
          .map(([attendeeId, status]) => {
            const transaction = status.lastTransaction;
            const entryTime = new Date(transaction.created_at);
            const durationMinutes = Math.floor((Date.now() - entryTime.getTime()) / (1000 * 60));
            
            return {
              name: attendeeMap.get(attendeeId) || 'Unknown',
              rfid_uid: transaction.rfid_uid || 'Unknown',
              entry_time: transaction.created_at,
              duration_minutes: durationMinutes
            };
          })
          .sort((a, b) => b.duration_minutes - a.duration_minutes);
      }

      setOnSiteAttendees(onSiteAttendeesData);
    } catch (error) {
      console.error('Error fetching on-site data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [selectedPeriod]);

  useBackgroundRefresh({
    onRefresh: fetchOnSiteData,
    refreshTrigger
  });

  return (
    <CurrentlyOnSiteAttendees 
      attendees={onSiteAttendees} 
      isLoading={isLoading}
    />
  );
};