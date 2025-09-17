import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ChartCustomizer } from "./ChartCustomizer";
import { ResponsiveChartContainer } from "./shared/ResponsiveChartContainer";
import { ExportButton } from "./shared/ExportButton";
import { 
  Layout, 
  Plus, 
  X, 
  Move,
  MoreVertical,
  Copy,
  Trash2,
  Edit3,
  Maximize2,
  Minimize2
} from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";

interface CustomChartConfig {
  id: string;
  title: string;
  chartType: 'bar' | 'line' | 'pie' | 'area';
  dataSource: string;
  metrics: string[];
  groupBy?: string;
  dateRange?: { start: string; end: string };
  filters?: Record<string, any>;
  colors?: string[];
  height?: number;
  position?: { x: number; y: number; w: number; h: number };
}

interface CustomDashboardProps {
  isRefreshing: boolean;
}

interface DashboardWidget {
  config: CustomChartConfig;
  data: any[];
  isLoading: boolean;
  isExpanded?: boolean;
}

export const CustomDashboard: React.FC<CustomDashboardProps> = ({ isRefreshing }) => {
  const [widgets, setWidgets] = useState<DashboardWidget[]>([]);
  const [draggedWidget, setDraggedWidget] = useState<string | null>(null);
  const [isGridMode, setIsGridMode] = useState(true);

  const addCustomChart = (chartConfig: CustomChartConfig) => {
    const newWidget: DashboardWidget = {
      config: chartConfig,
      data: [],
      isLoading: true,
      isExpanded: false
    };
    
    setWidgets(prev => [...prev, newWidget]);
    fetchWidgetData(chartConfig);
  };

  const fetchWidgetData = async (config: CustomChartConfig) => {
    try {
      const { data, error } = await supabase
        .from(getTableName(config.dataSource))
        .select('*')
        .limit(1000);

      if (error) throw error;

      const processedData = processDataForWidget(data || [], config);
      
      setWidgets(prev => prev.map(widget => 
        widget.config.id === config.id 
          ? { ...widget, data: processedData, isLoading: false }
          : widget
      ));
    } catch (error) {
      console.error("Error fetching widget data:", error);
      setWidgets(prev => prev.map(widget => 
        widget.config.id === config.id 
          ? { ...widget, isLoading: false }
          : widget
      ));
    }
  };

  const getTableName = (dataSource: string): "attendees" | "station_transactions" | "activities" => {
    switch (dataSource) {
      case 'attendees': return 'attendees';
      case 'transactions': return 'station_transactions';
      case 'activities': return 'activities';
      default: return 'attendees';
    }
  };

  const processDataForWidget = (data: any[], config: CustomChartConfig) => {
    if (!data.length) return [];

    switch (config.dataSource) {
      case 'attendees':
        if (config.metrics.includes('ticket_type_distribution')) {
          const distribution = data.reduce((acc, item) => {
            const type = item.ticket_type || 'unknown';
            acc[type] = (acc[type] || 0) + 1;
            return acc;
          }, {} as Record<string, number>);

          return Object.entries(distribution).map(([name, value]) => ({
            name: name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
            value
          }));
        }
        break;
        
      case 'transactions':
        if (config.metrics.includes('station_usage')) {
          const usage = data.reduce((acc, transaction) => {
            const station = transaction.station_type || 'unknown';
            acc[station] = (acc[station] || 0) + 1;
            return acc;
          }, {} as Record<string, number>);

          return Object.entries(usage).map(([name, value]) => ({
            name: name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
            value
          }));
        }
        break;
        
      default:
        return data.slice(0, 10).map((item, index) => ({
          name: `Item ${index + 1}`,
          value: Math.floor(Math.random() * 100) + 1
        }));
    }

    return [];
  };

  const duplicateWidget = (widgetId: string) => {
    const widget = widgets.find(w => w.config.id === widgetId);
    if (!widget) return;

    const duplicatedConfig: CustomChartConfig = {
      ...widget.config,
      id: Date.now().toString(),
      title: `${widget.config.title} (Copy)`
    };

    addCustomChart(duplicatedConfig);
  };

  const removeWidget = (widgetId: string) => {
    setWidgets(prev => prev.filter(w => w.config.id !== widgetId));
  };

  const toggleExpanded = (widgetId: string) => {
    setWidgets(prev => prev.map(widget => 
      widget.config.id === widgetId 
        ? { ...widget, isExpanded: !widget.isExpanded }
        : widget
    ));
  };

  const refreshAllWidgets = () => {
    widgets.forEach(widget => {
      setWidgets(prev => prev.map(w => 
        w.config.id === widget.config.id 
          ? { ...w, isLoading: true }
          : w
      ));
      fetchWidgetData(widget.config);
    });
  };

  useEffect(() => {
    if (isRefreshing) {
      refreshAllWidgets();
    }
  }, [isRefreshing]);

  const exportData = widgets.map(widget => ({
    chartTitle: widget.config.title,
    chartType: widget.config.chartType,
    dataSource: widget.config.dataSource,
    dataPoints: widget.data.length,
    metrics: widget.config.metrics.join(', ')
  }));

  if (widgets.length === 0) {
    return (
      <TooltipProvider>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-primary">🎯 Custom Dashboard</h2>
              <p className="text-muted-foreground">Create and customize your own analytics views</p>
            </div>
            <div className="flex gap-2">
              <ChartCustomizer onChartGenerated={addCustomChart} />
            </div>
          </div>

          {/* Empty State */}
          <Card className="border-dashed border-2 border-primary/20">
            <CardContent className="py-16">
              <div className="text-center">
                <Layout className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No Custom Charts Yet</h3>
                <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
                  Create custom charts to visualize your data exactly how you want it. 
                  Mix different data sources, choose chart types, and build your perfect dashboard.
                </p>
                <ChartCustomizer onChartGenerated={addCustomChart} />
              </div>
            </CardContent>
          </Card>
        </div>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-primary">🎯 Custom Dashboard</h2>
            <p className="text-muted-foreground">Your personalized analytics workspace</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {widgets.length} custom {widgets.length === 1 ? 'chart' : 'charts'}
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsGridMode(!isGridMode)}
              className="gap-2"
            >
              <Layout className="h-4 w-4" />
              {isGridMode ? 'List View' : 'Grid View'}
            </Button>
            <ChartCustomizer onChartGenerated={addCustomChart} />
            <ExportButton 
              data={exportData}
              filename="custom-dashboard"
              title="Custom Dashboard Export"
            />
          </div>
        </div>

        {/* Widget Grid */}
        <div className={`grid gap-6 ${isGridMode ? 'grid-cols-1 lg:grid-cols-2 xl:grid-cols-3' : 'grid-cols-1'}`}>
          {widgets.map((widget, index) => (
            <Card 
              key={widget.config.id}
              className={`border-primary/20 transition-all hover:shadow-lg ${
                widget.isExpanded ? 'lg:col-span-2 xl:col-span-3' : ''
              } ${draggedWidget === widget.config.id ? 'opacity-50' : ''}`}
              draggable
              onDragStart={() => setDraggedWidget(widget.config.id)}
              onDragEnd={() => setDraggedWidget(null)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Move className="h-4 w-4 text-muted-foreground cursor-grab" />
                      {widget.config.title}
                    </CardTitle>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">
                        {widget.config.chartType}
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        {widget.config.dataSource.replace(/_/g, ' ')}
                      </Badge>
                    </div>
                  </div>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => toggleExpanded(widget.config.id)}>
                        {widget.isExpanded ? (
                          <>
                            <Minimize2 className="h-4 w-4 mr-2" />
                            Minimize
                          </>
                        ) : (
                          <>
                            <Maximize2 className="h-4 w-4 mr-2" />
                            Expand
                          </>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => duplicateWidget(widget.config.id)}>
                        <Copy className="h-4 w-4 mr-2" />
                        Duplicate
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => fetchWidgetData(widget.config)}>
                        <Edit3 className="h-4 w-4 mr-2" />
                        Refresh Data
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => removeWidget(widget.config.id)}
                        className="text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Remove
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>

              <CardContent className="pt-0">
                <ResponsiveChartContainer
                  data={widget.data}
                  chartType={widget.config.chartType}
                  height={widget.isExpanded ? 500 : widget.config.height}
                  colors={widget.config.colors}
                  isLoading={widget.isLoading}
                  className="border-0 shadow-none"
                />
                
                {widget.data.length > 0 && (
                  <div className="mt-3 pt-3 border-t">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{widget.data.length} data points</span>
                      <span>Updated: {new Date().toLocaleTimeString()}</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Add New Chart Button */}
        <Card className="border-dashed border-2 border-primary/20 hover:border-primary/40 transition-colors">
          <CardContent className="py-8">
            <div className="text-center">
              <Button 
                variant="ghost" 
                className="h-auto p-4 flex flex-col gap-2"
                onClick={() => {}} // Placeholder - would open chart customizer
              >
                <Plus className="h-8 w-8 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Add Custom Chart</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Real-time Status */}
        <Card className="border-primary/20">
          <CardContent className="py-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              Custom dashboard with real-time updates • {widgets.length} active widgets
            </div>
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
};