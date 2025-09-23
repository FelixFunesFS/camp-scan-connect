/**
 * Utility functions for parking assignment handling
 */

export interface ParkingAssignment {
  type: string;
  assignment: string;
  display: string;
}

/**
 * Parse parking assignment string into structured data
 */
export function parseParkingAssignment(parkingString: string | null): ParkingAssignment {
  if (!parkingString || parkingString === 'Not Assigned' || parkingString.trim() === '') {
    return {
      type: 'none',
      assignment: 'Not Assigned',
      display: 'Not Assigned'
    };
  }

  // Extract type and assignment from strings like "Premium Tent: greenSpaceForTent42"
  const parts = parkingString.split(': ');
  if (parts.length < 2) {
    return {
      type: 'unknown',
      assignment: parkingString,
      display: parkingString
    };
  }

  const type = parts[0].toLowerCase();
  const assignment = parts.slice(1).join(': ');

  // Determine parking type category with enhanced detection
  let category = 'unknown';
  if (type.includes('premium tent')) {
    category = 'premium-tent';
  } else if (type.includes('premium rv')) {
    category = 'premium-rv';
  } else if (type.includes('dry camping rv')) {
    category = 'dry-camping-rv';
  } else if (type.includes('tailgate rv')) {
    category = 'tailgate-rv';
  } else if (type.includes('tailgate tent')) {
    category = 'tailgate-tent';
  } else if (type.includes('green space tent')) {
    category = 'green-space-tent';
  } else if (type.includes('cabin')) {
    category = 'cabin';
  } else if (type.includes('paved tailgate')) {
    category = 'paved-tailgate';
  } else if (type.includes('glamping')) {
    category = type.includes('double queen') ? 'glamping-queen' : 'glamping-king';
  }

  return {
    type: category,
    assignment: assignment,
    display: `${parts[0]}: ${assignment}`
  };
}

/**
 * Get badge variant for parking assignment type
 */
export function getParkingBadgeVariant(parkingType: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (parkingType) {
    case 'premium-tent':
      return 'default'; // Teal
    case 'premium-rv':
      return 'secondary'; // Blue
    case 'dry-camping-rv':
      return 'outline'; // Green
    case 'tailgate-rv':
      return 'outline'; // Green
    case 'tailgate-tent':
      return 'destructive'; // Orange
    case 'green-space-tent':
      return 'secondary'; // Blue
    case 'cabin':
      return 'secondary'; // Brown
    case 'paved-tailgate':
      return 'default'; // Purple
    case 'glamping-queen':
    case 'glamping-king':
      return 'outline'; // Pink/Rose
    case 'none':
      return 'secondary'; // Gray
    default:
      return 'outline';
  }
}

/**
 * Get display color class for parking assignment type
 */
export function getParkingColorClass(parkingType: string): string {
  switch (parkingType) {
    case 'premium-tent':
      return 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200';
    case 'premium-rv':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
    case 'dry-camping-rv':
      return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200';
    case 'tailgate-rv':
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
    case 'tailgate-tent':
      return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
    case 'green-space-tent':
      return 'bg-lime-100 text-lime-800 dark:bg-lime-900 dark:text-lime-200';
    case 'cabin':
      return 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200';
    case 'paved-tailgate':
      return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
    case 'glamping-queen':
      return 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200';
    case 'glamping-king':
      return 'bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-200';
    case 'none':
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
  }
}

/**
 * Format parking assignment for display with proper truncation
 */
export function formatParkingForDisplay(parkingString: string | null, maxLength: number = 20): string {
  const parsed = parseParkingAssignment(parkingString);
  
  if (parsed.type === 'none') {
    return 'Not Assigned';
  }

  // For display, show just the assignment part if it's long
  if (parsed.assignment.length > maxLength) {
    return parsed.assignment.substring(0, maxLength) + '...';
  }

  return parsed.assignment;
}