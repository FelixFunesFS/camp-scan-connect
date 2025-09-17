import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart as RechartsPieChart,
  Pie,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Cell
} from "recharts";

interface ResponsiveChartContainerProps {
  title?: string;
  data: any[];
  chartType?: 'bar' | 'line' | 'pie' | 'area';
  height?: number;
  colors?: string[];
  isLoading?: boolean;
  showTooltip?: boolean;
  children?: React.ReactNode;
  className?: string;
}

const defaultColors = [
  'hsl(var(--primary))',
  'hsl(var(--secondary))',
  'hsl(var(--accent))',
  'hsl(var(--muted-foreground))'
];

export const ResponsiveChartContainer: React.FC<ResponsiveChartContainerProps> = ({
  title,
  data,
  chartType = 'bar',
  height,
  colors = defaultColors,
  isLoading = false,
  showTooltip = true,
  children,
  className = ""
}) => {
  const isMobile = useIsMobile();
  
  // Responsive height calculation
  const getResponsiveHeight = () => {
    if (height) return height;
    
    // Mobile-first approach with breakpoint-based heights
    if (isMobile) {
      switch (chartType) {
        case 'pie': return 280;
        case 'line': return 240;
        case 'area': return 240;
        default: return 260;
      }
    }
    
    // Desktop heights
    switch (chartType) {
      case 'pie': return 350;
      case 'line': return 320;
      case 'area': return 320;
      default: return 340;
    }
  };

  const chartHeight = getResponsiveHeight();
  
  // Mobile-optimized chart margins
  const getMobileMargins = () => {
    if (isMobile) {
      return { top: 10, right: 10, left: 10, bottom: 20 };
    }
    return { top: 20, right: 30, left: 20, bottom: 20 };
  };

  const margins = getMobileMargins();

  // Chart configuration for mobile optimization
  const chartConfig = {
    primary: {
      label: "Primary",
      color: colors[0],
    },
    secondary: {
      label: "Secondary", 
      color: colors[1],
    },
    accent: {
      label: "Accent",
      color: colors[2],
    },
  };

  const renderChart = () => {
    if (isLoading) {
      return (
        <div className="w-full flex items-center justify-center" style={{ height: chartHeight }}>
          <div className="space-y-3 w-full max-w-sm">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-6 w-1/2" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-6 w-2/3" />
          </div>
        </div>
      );
    }

    if (!data || data.length === 0) {
      return (
        <div className="w-full flex items-center justify-center text-muted-foreground" style={{ height: chartHeight }}>
          <div className="text-center">
            <p className="text-sm">No data available</p>
            <p className="text-xs mt-1">Data will appear here when available</p>
          </div>
        </div>
      );
    }

    // If children are provided (custom chart content), render them directly
    if (children) {
      return (
        <div className="w-full" style={{ height: chartHeight }}>
          <ChartContainer config={chartConfig}>
            <ResponsiveContainer width="100%" height="100%">
              {children as React.ReactElement}
            </ResponsiveContainer>
          </ChartContainer>
        </div>
      );
    }

    // Default chart rendering based on type
    switch (chartType) {
      case 'bar':
        return (
          <div className="w-full" style={{ height: chartHeight }}>
            <ChartContainer config={chartConfig}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} margin={margins}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fontSize: isMobile ? 10 : 12 }}
                    angle={isMobile ? -45 : 0}
                    textAnchor={isMobile ? "end" : "middle"}
                    height={isMobile ? 60 : 40}
                  />
                  <YAxis tick={{ fontSize: isMobile ? 10 : 12 }} />
                  {showTooltip && <ChartTooltip content={<ChartTooltipContent />} />}
                  <Bar 
                    dataKey="value" 
                    fill={colors[0]}
                    radius={[2, 2, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </div>
        );

      case 'line':
        return (
          <div className="w-full" style={{ height: chartHeight }}>
            <ChartContainer config={chartConfig}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data} margin={margins}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fontSize: isMobile ? 10 : 12 }}
                  />
                  <YAxis tick={{ fontSize: isMobile ? 10 : 12 }} />
                  {showTooltip && <ChartTooltip content={<ChartTooltipContent />} />}
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke={colors[0]}
                    strokeWidth={2}
                    dot={{ r: isMobile ? 3 : 4, fill: colors[0] }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          </div>
        );

      case 'area':
        return (
          <div className="w-full" style={{ height: chartHeight }}>
            <ChartContainer config={chartConfig}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data} margin={margins}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fontSize: isMobile ? 10 : 12 }}
                  />
                  <YAxis tick={{ fontSize: isMobile ? 10 : 12 }} />
                  {showTooltip && <ChartTooltip content={<ChartTooltipContent />} />}
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke={colors[0]}
                    fill={colors[0]}
                    fillOpacity={0.3}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </ChartContainer>
          </div>
        );

      case 'pie':
        return (
          <div className="w-full" style={{ height: chartHeight }}>
            <ResponsiveContainer width="100%" height="100%">
              <RechartsPieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => 
                    isMobile 
                      ? `${(percent * 100).toFixed(0)}%`
                      : `${name}: ${(percent * 100).toFixed(0)}%`
                  }
                  outerRadius={isMobile ? 60 : 80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {data.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={colors[index % colors.length]} 
                    />
                  ))}
                </Pie>
                {showTooltip && <ChartTooltip />}
              </RechartsPieChart>
            </ResponsiveContainer>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Card className={`border-primary/20 ${className}`}>
      {title && (
        <CardHeader className={`pb-2 ${isMobile ? 'px-4 py-3' : ''}`}>
          <CardTitle className={`${isMobile ? 'text-lg' : 'text-xl'}`}>
            {title}
          </CardTitle>
        </CardHeader>
      )}
      <CardContent className={`${isMobile ? 'px-4 pb-4' : 'pb-4'}`}>
        {renderChart()}
      </CardContent>
    </Card>
  );
};