// ET Timezone utilities for operational data (drinks, headphones)
// Handles automatic DST conversion for 3 AM ET boundaries

export type TimePeriod = 'today' | 'yesterday' | 'this_event' | 'all_time';

export interface TimeBoundary {
  start: Date;
  end: Date;
  label: string;
}

// Get 3 AM ET for a given date (automatically handles DST)
export const get3AMET = (date: Date): Date => {
  const etDate = new Date(date.toLocaleString("en-US", { timeZone: "America/New_York" }));
  etDate.setHours(3, 0, 0, 0);
  
  // Convert back to local timezone for database queries
  const utcOffset = etDate.getTimezoneOffset() * 60000;
  const etOffset = new Date().toLocaleString("en-US", { timeZone: "America/New_York" });
  const etTimeMs = new Date(etOffset).getTime();
  const localTimeMs = new Date().getTime();
  const etOffsetMs = localTimeMs - etTimeMs;
  
  return new Date(etDate.getTime() - utcOffset - etOffsetMs);
};

// Get time boundaries for operational data based on 3 AM ET cutoff
export const getTimeBoundaries = (period: TimePeriod): TimeBoundary => {
  const now = new Date();
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  switch (period) {
    case 'today': {
      const start3AM = get3AMET(yesterday); // 3 AM yesterday
      const end3AM = get3AMET(today); // 3 AM today
      return {
        start: start3AM,
        end: end3AM,
        label: 'Today (3AM-3AM ET)'
      };
    }
    
    case 'yesterday': {
      const twoDaysAgo = new Date(yesterday);
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 1);
      const start3AM = get3AMET(twoDaysAgo); // 3 AM two days ago
      const end3AM = get3AMET(yesterday); // 3 AM yesterday
      return {
        start: start3AM,
        end: end3AM,
        label: 'Yesterday (3AM-3AM ET)'
      };
    }
    
    case 'this_event': {
      // Assuming event starts Thursday - adjust as needed
      const eventStart = new Date('2024-01-25'); // Example event start date
      const start3AM = get3AMET(eventStart);
      return {
        start: start3AM,
        end: now,
        label: 'This Event'
      };
    }
    
    case 'all_time': {
      return {
        start: new Date('2024-01-01'), // Far back enough to capture all data
        end: now,
        label: 'All Time'
      };
    }
    
    default:
      return getTimeBoundaries('today');
  }
};

// Format time period for display
export const formatTimePeriod = (period: TimePeriod): string => {
  switch (period) {
    case 'today': return 'Today';
    case 'yesterday': return 'Yesterday';
    case 'this_event': return 'This Event';
    case 'all_time': return 'All Time';
    default: return 'Today';
  }
};

// Get comparison period for trend calculations
export const getComparisonBoundaries = (period: TimePeriod): TimeBoundary | null => {
  switch (period) {
    case 'today':
      return getTimeBoundaries('yesterday');
    case 'yesterday': {
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
      const fourDaysAgo = new Date();
      fourDaysAgo.setDate(fourDaysAgo.getDate() - 4);
      return {
        start: get3AMET(fourDaysAgo),
        end: get3AMET(threeDaysAgo),
        label: 'Day Before Yesterday'
      };
    }
    default:
      return null;
  }
};