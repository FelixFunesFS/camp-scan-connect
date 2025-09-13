import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LucideIcon } from "lucide-react";

interface ScoreCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  trend?: {
    value: number;
    label: string;
    isPositive?: boolean;
  };
  variant?: "default" | "success" | "warning" | "error";
  isLoading?: boolean;
}

export const ScoreCard: React.FC<ScoreCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  variant = "default",
  isLoading
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case "success":
        return "border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-950/50";
      case "warning":
        return "border-yellow-200 bg-yellow-50/50 dark:border-yellow-800 dark:bg-yellow-950/50";
      case "error":
        return "border-red-200 bg-red-50/50 dark:border-red-800 dark:bg-red-950/50";
      default:
        return "border-primary/20 bg-card hover:bg-accent/5";
    }
  };

  const getIconColor = () => {
    switch (variant) {
      case "success":
        return "text-green-600 dark:text-green-400";
      case "warning":
        return "text-yellow-600 dark:text-yellow-400";
      case "error":
        return "text-red-600 dark:text-red-400";
      default:
        return "text-primary";
    }
  };

  return (
    <Card className={`transition-all duration-200 ${getVariantStyles()}`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        {Icon && <Icon className={`h-4 w-4 ${getIconColor()}`} />}
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
          {isLoading ? (
            <div className="h-8 w-20 bg-muted animate-pulse rounded" />
          ) : (
            <div className="text-2xl font-bold text-foreground">
              {typeof value === 'number' ? value.toLocaleString() : value}
            </div>
          )}
          
          <div className="flex items-center gap-2">
            {subtitle && (
              <p className="text-xs text-muted-foreground">
                {subtitle}
              </p>
            )}
            {trend && (
              <Badge 
                variant={trend.isPositive ? "default" : "secondary"}
                className={`text-xs ${
                  trend.isPositive 
                    ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" 
                    : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                }`}
              >
                {trend.isPositive ? "+" : ""}{trend.value}% {trend.label}
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};