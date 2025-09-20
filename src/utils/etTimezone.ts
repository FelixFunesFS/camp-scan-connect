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
  // Create a new date at 3 AM ET on the given date
  const year = date.getFullYear();
  const month = date.getMonth();
  const day = date.getDate();
  
  // Create the date string for 3 AM ET
  const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}T03:00:00-05:00`;
  
  // Return the date object in UTC for database queries
  return new Date(dateStr);
};

// Get time boundaries for operational data based on 3 AM ET cutoff
export const getTimeBoundaries = (period: TimePeriod): TimeBoundary => {
  const now = new Date();
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  switch (period) {
    case 'today': {
      const start3AM = get3AMET(today); // 3 AM today
      return {
        start: start3AM,
        end: now,
        label: 'Today (since 3AM ET)'
      };
    }
    
    case 'yesterday': {
      const start3AM = get3AMET(yesterday); // 3 AM yesterday
      const end3AM = get3AMET(today); // 3 AM today
      return {
        start: start3AM,
        end: end3AM,
        label: 'Yesterday (3AM-3AM ET)'
      };
    }
    
    case 'this_event': {
      // Current event start date - September 19, 2025
      const eventStart = new Date('2025-09-19'); 
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