/**
 * Utility functions for site location assignment handling
 */

export interface SiteLocationAssignment {
  type: string;
  assignment: string;
  display: string;
}

/**
 * Parse site location assignment string into structured data
 */
export function parseSiteLocationAssignment(siteLocationString: string | null): SiteLocationAssignment {
  if (!siteLocationString || siteLocationString === 'Not Assigned' || siteLocationString.trim() === '') {
    return {
      type: 'none',
      assignment: 'Not Assigned',
      display: 'Not Assigned'
    };
  }

  // Handle Day Pass Only attendees
  if (siteLocationString === 'Day Pass Only') {
    return {
      type: 'day-pass-only',
      assignment: 'Day Pass Only',
      display: 'Day Pass Only'
    };
  }

  // Extract type and assignment from strings like "Premium Tent: greenSpaceForTent42"
  const parts = siteLocationString.split(': ');
  if (parts.length < 2) {
    return {
      type: 'unknown',
      assignment: siteLocationString,
      display: siteLocationString
    };
  }

  const type = parts[0].toLowerCase();
  const assignment = parts.slice(1).join(': ');

  // Determine site location type category with enhanced types
  let category = 'unknown';
  if (type.includes('day pass only')) {
    category = 'day-pass-only';
  } else if (type.includes('premium tent')) {
    category = 'premium-tent';
  } else if (type.includes('premium rv')) {
    category = 'premium-rv';
  } else if (type.includes('premium van/rooftop')) {
    category = 'premium-van-rooftop';
  } else if (type.includes('tailgate van/rooftop')) {
    category = 'tailgate-van-rooftop';
  } else if (type.includes('tailgate rv')) {
    category = 'tailgate-rv';
  } else if (type.includes('tailgate tent site')) {
    category = 'tailgate-tent-site';
  } else if (type.includes('tailgate tent')) {
    category = 'tailgate-tent';
  } else if (type.includes('dry camping rv')) {
    category = 'dry-camping-rv';
  } else if (type.includes('green space tent')) {
    category = 'green-space-tent';
  } else if (type.includes('tent site')) {
    category = 'tent-site';
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
 * Get badge variant for site location assignment type
 */
export function getSiteLocationBadgeVariant(siteLocationType: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (siteLocationType) {
    case 'day-pass-only':
      return 'secondary'; // Neutral gray for day pass
    case 'premium-tent':
      return 'default'; // Teal
    case 'premium-rv':
      return 'secondary'; // Blue
    case 'premium-van-rooftop':
      return 'default'; // Teal variant
    case 'tailgate-van-rooftop':
      return 'destructive'; // Orange variant
    case 'tailgate-rv':
      return 'outline'; // Green
    case 'tailgate-tent':
    case 'tailgate-tent-site':
      return 'destructive'; // Orange
    case 'dry-camping-rv':
      return 'outline'; // Green variant
    case 'green-space-tent':
      return 'default'; // Teal variant
    case 'tent-site':
      return 'secondary'; // Blue variant
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
 * Get display color class for site location assignment type
 */
export function getSiteLocationColorClass(siteLocationType: string): string {
  switch (siteLocationType) {
    case 'day-pass-only':
      return 'bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-200';
    case 'premium-tent':
      return 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200';
    case 'premium-rv':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
    case 'premium-van-rooftop':
      return 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200';
    case 'tailgate-van-rooftop':
      return 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200';
    case 'tailgate-rv':
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
    case 'tailgate-tent':
    case 'tailgate-tent-site':
      return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
    case 'dry-camping-rv':
      return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200';
    case 'green-space-tent':
      return 'bg-lime-100 text-lime-800 dark:bg-lime-900 dark:text-lime-200';
    case 'tent-site':
      return 'bg-sky-100 text-sky-800 dark:bg-sky-900 dark:text-sky-200';
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
 * Format site location assignment for display with proper truncation
 */
export function formatSiteLocationForDisplay(siteLocationString: string | null, maxLength: number = 20): string {
  const parsed = parseSiteLocationAssignment(siteLocationString);
  
  if (parsed.type === 'none') {
    return 'Not Assigned';
  }

  if (parsed.type === 'day-pass-only') {
    return 'Day Pass Only';
  }

  // For display, show just the assignment part if it's long
  if (parsed.assignment.length > maxLength) {
    return parsed.assignment.substring(0, maxLength) + '...';
  }

  return parsed.assignment;
}