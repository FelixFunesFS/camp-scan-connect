import { Badge } from "@/components/ui/badge";
import { parseSiteLocationAssignment, getSiteLocationColorClass, formatSiteLocationForDisplay } from "@/utils/siteLocationUtils";

interface SiteLocationBadgeProps {
  siteLocationAssignment?: string | null;
  maxLength?: number;
  className?: string;
}

export function SiteLocationBadge({ siteLocationAssignment, maxLength = 20, className }: SiteLocationBadgeProps) {
  const parsed = parseSiteLocationAssignment(siteLocationAssignment);
  const colorClass = getSiteLocationColorClass(parsed.type);
  const displayText = formatSiteLocationForDisplay(siteLocationAssignment, maxLength);

  return (
    <Badge 
      variant="outline" 
      className={`${colorClass} border-0 text-xs font-medium ${className}`}
      title={parsed.display}
    >
      {displayText}
    </Badge>
  );
}