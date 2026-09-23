import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { TShirtProductLine } from "@/services/tshirtService";

const productClasses: Record<TShirtProductLine, string> = {
  'Souvenir 2026': 'border-apparel-souvenir/30 bg-apparel-souvenir/10 text-apparel-souvenir',
  'Team Orange': 'border-apparel-orange/30 bg-apparel-orange/10 text-apparel-orange',
  'Team Blue': 'border-apparel-blue/30 bg-apparel-blue/10 text-apparel-blue',
  'Purpose Over Passion': 'border-apparel-purpose/30 bg-apparel-purpose/10 text-apparel-purpose',
  'Volunteer': 'border-apparel-volunteer/30 bg-apparel-volunteer/10 text-apparel-volunteer',
  'Other': 'border-border bg-muted text-muted-foreground',
};

export function ApparelProductBadge({ productLine, className }: { productLine: TShirtProductLine; className?: string }) {
  return (
    <Badge variant="outline" className={cn(productClasses[productLine], className)}>
      {productLine}
    </Badge>
  );
}