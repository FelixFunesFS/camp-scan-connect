// Standardized date/time utilities for consistent display across all stations
import { format, formatDistanceToNow, isToday, isYesterday } from 'date-fns';

export interface DateTimeDisplayOptions {
  showRelative?: boolean;
  showTimezone?: boolean;
  compact?: boolean;
}

/**
 * Standard date/time format for all stations: "MMM d, h:mm a"
 * Example: "Jan 15, 2:30 PM"
 */
export const formatStandardDateTime = (
  date: Date | string, 
  options: DateTimeDisplayOptions = {}
): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(dateObj.getTime())) {
    return 'Invalid Date';
  }

  const { compact = false, showTimezone = false } = options;
  
  // Compact format for mobile/small spaces
  if (compact) {
    if (isToday(dateObj)) {
      return format(dateObj, 'h:mm a');
    }
    if (isYesterday(dateObj)) {
      return `Yesterday ${format(dateObj, 'h:mm a')}`;
    }
    return format(dateObj, 'MMM d, h:mm a');
  }
  
  // Standard format
  const baseFormat = 'MMM d, h:mm a';
  const timezoneSuffix = showTimezone ? ' ET' : '';
  
  return format(dateObj, baseFormat) + timezoneSuffix;
};

/**
 * Format with relative time for recent activities
 * Example: "Jan 15, 2:30 PM (2 hours ago)"
 */
export const formatWithRelativeTime = (
  date: Date | string,
  options: DateTimeDisplayOptions = {}
): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(dateObj.getTime())) {
    return 'Invalid Date';
  }

  const standardTime = formatStandardDateTime(dateObj, options);
  const relativeTime = formatDistanceToNow(dateObj, { addSuffix: true });
  
  // For very recent items (< 1 hour), prioritize relative time
  const hoursDiff = (Date.now() - dateObj.getTime()) / (1000 * 60 * 60);
  
  if (hoursDiff < 1) {
    return `${relativeTime} (${format(dateObj, 'h:mm a')})`;
  }
  
  return `${standardTime} (${relativeTime})`;
};

/**
 * Format duration for equipment checkout times
 * Example: "2h 30m" or "45m"
 */
export const formatDuration = (minutes: number): string => {
  if (minutes < 60) {
    return `${minutes}m`;
  }
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  if (remainingMinutes === 0) {
    return `${hours}h`;
  }
  
  return `${hours}h ${remainingMinutes}m`;
};

/**
 * Format time period label for display
 */
export const formatTimePeriodDisplay = (startDate: Date, endDate?: Date): string => {
  const start = format(startDate, 'MMM d, h:mm a');
  
  if (!endDate) {
    return `Since ${start}`;
  }
  
  if (isToday(startDate) && isToday(endDate)) {
    return `Today ${format(startDate, 'h:mm a')} - ${format(endDate, 'h:mm a')}`;
  }
  
  const end = format(endDate, 'MMM d, h:mm a');
  return `${start} - ${end}`;
};

/**
 * Get relative time badge variant based on age
 */
export const getTimeBasedVariant = (date: Date | string): 'default' | 'secondary' | 'outline' => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const hoursDiff = (Date.now() - dateObj.getTime()) / (1000 * 60 * 60);
  
  if (hoursDiff < 1) return 'default';     // Recent (green)
  if (hoursDiff < 24) return 'secondary';  // Today (blue)
  return 'outline';                        // Older (gray)
};

/**
 * Check if a checkout duration should be highlighted as prolonged
 */
export const isProlongedCheckout = (minutes: number, thresholdMinutes: number = 180): boolean => {
  return minutes > thresholdMinutes;
};