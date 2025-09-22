// ET Timezone utilities for operational data (drinks, headphones)
// Handles automatic DST conversion for 3 AM ET boundaries

export type TimePeriod = 'today' | 'yesterday' | 'this_event' | 'all_time';

export interface TimeBoundary {
  start: Date;
  end: Date;
  label: string;
}

// Helper function to determine if a date is during Daylight Saving Time in ET
const isDST = (date: Date): boolean => {
  // DST in ET timezone runs from second Sunday in March to first Sunday in November
  const year = date.getFullYear();
  
  // Calculate second Sunday in March
  const marchFirst = new Date(year, 2, 1); // March 1
  const marchSecondSunday = new Date(year, 2, (7 - marchFirst.getDay() + 7) + 1);
  
  // Calculate first Sunday in November  
  const novemberFirst = new Date(year, 10, 1); // November 1
  const novemberFirstSunday = new Date(year, 10, (7 - novemberFirst.getDay()) + 1);
  
  return date >= marchSecondSunday && date < novemberFirstSunday;
};

// Get 3 AM ET for a given date (automatically handles DST)
export const get3AMET = (date: Date): Date => {
  const year = date.getFullYear();
  const month = date.getMonth();
  const day = date.getDate();
  
  // Create the date string for 3 AM ET, using correct offset for DST
  const offset = isDST(date) ? '-04:00' : '-05:00';
  const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}T03:00:00${offset}`;
  
  // Return the date object in UTC for database queries
  return new Date(dateStr);
};

// Helper function to get current ET date (not UTC date)
export const getCurrentETDate = (): Date => {
  const now = new Date();
  
  // Use JavaScript's built-in timezone conversion - much more reliable
  const etDateString = now.toLocaleString("en-US", {
    timeZone: "America/New_York",
    year: 'numeric',
    month: '2-digit', 
    day: '2-digit'
  });
  
  // Parse the ET date string to get year, month, day
  const [month, day, year] = etDateString.split('/');
  return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
};

// Get time boundaries for drinks/headphones operational data based on 3 AM ET cutoff
export const getDrinksHeadphonesTimeBoundaries = (period: TimePeriod): TimeBoundary => {
  const now = new Date();
  const today = getCurrentETDate(); // Use ET-based today
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
      return getDrinksHeadphonesTimeBoundaries('today');
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

// Get midnight ET for a given date (standard cutoff)
export const getMidnightET = (date: Date): Date => {
  const year = date.getFullYear();
  const month = date.getMonth();
  const day = date.getDate();
  
  // Create the date string for midnight ET, using correct offset for DST
  const offset = isDST(date) ? '-04:00' : '-05:00';
  const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}T00:00:00${offset}`;
  
  // Return the date object in UTC for database queries
  return new Date(dateStr);
};

// Get time boundaries for standard data based on midnight ET cutoff
export const getStandardTimeBoundaries = (period: TimePeriod): TimeBoundary => {
  const now = new Date();
  const today = getCurrentETDate(); // Use ET-based today
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  switch (period) {
    case 'today': {
      const startMidnight = getMidnightET(today); // Midnight today
      return {
        start: startMidnight,
        end: now,
        label: 'Today (since midnight ET)'
      };
    }
    
    case 'yesterday': {
      const startMidnight = getMidnightET(yesterday); // Midnight yesterday
      const endMidnight = getMidnightET(today); // Midnight today
      return {
        start: startMidnight,
        end: endMidnight,
        label: 'Yesterday (midnight-midnight ET)'
      };
    }
    
    case 'this_event': {
      // Current event start date - September 19, 2025
      const eventStart = new Date('2025-09-19'); 
      const startMidnight = getMidnightET(eventStart);
      return {
        start: startMidnight,
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
      return getStandardTimeBoundaries('today');
  }
};

// Get comparison period for trend calculations (drinks/headphones)
export const getDrinksHeadphonesComparisonBoundaries = (period: TimePeriod): TimeBoundary | null => {
  switch (period) {
    case 'today':
      return getDrinksHeadphonesTimeBoundaries('yesterday');
    case 'yesterday': {
      const today = getCurrentETDate();
      const threeDaysAgo = new Date(today);
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
      const fourDaysAgo = new Date(today);  
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

// Get comparison period for trend calculations (standard data)
export const getStandardComparisonBoundaries = (period: TimePeriod): TimeBoundary | null => {
  switch (period) {
    case 'today':
      return getStandardTimeBoundaries('yesterday');
    case 'yesterday': {
      const today = getCurrentETDate();
      const threeDaysAgo = new Date(today);
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
      const fourDaysAgo = new Date(today);
      fourDaysAgo.setDate(fourDaysAgo.getDate() - 4);
      return {
        start: getMidnightET(fourDaysAgo),
        end: getMidnightET(threeDaysAgo),
        label: 'Day Before Yesterday'
      };
    }
    default:
      return null;
  }
};

// Backward compatibility exports (use specific functions above instead)
export const getTimeBoundaries = getDrinksHeadphonesTimeBoundaries;
export const getComparisonBoundaries = getDrinksHeadphonesComparisonBoundaries;