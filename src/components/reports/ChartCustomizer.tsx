import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  Settings, 
  BarChart3, 
  LineChart, 
  PieChart,
  TrendingUp,
  Calendar,
  Users,
  Utensils,
  Activity,
  Plus,
  X,
  Play,
  Save,
  Info,
  Palette,
  Filter,
  Download
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ResponsiveChartContainer } from "./shared/ResponsiveChartContainer";

interface ChartCustomizerProps {
  onChartGenerated?: (chartConfig: CustomChartConfig) => void;
}

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
}

interface DataSource {
  id: string;
  name: string;
  table: string;
  description: string;
  metrics: string[];
  groupOptions: string[];
  filterOptions: string[];
}

const dataSources: DataSource[] = [
  {
    id: 'attendees',
    name: 'Attendee Data',
    table: 'attendees',
    description: 'Registration and activation data',
    metrics: ['count', 'activation_rate', 'ticket_type_distribution', 'early_access'],
    groupOptions: ['ticket_type', 'date', 'registration_status'],
    filterOptions: ['ticket_type', 'waiver_signed', 'activated_at', 'early_access']
  },
  {
    id: 'transactions',
    name: 'Station Transactions',
    table: 'station_transactions',
    description: 'Service usage and interactions',
    metrics: ['count', 'station_usage', 'hourly_patterns', 'daily_counts'],
    groupOptions: ['station_type', 'hour', 'date', 'transaction_type'],
    filterOptions: ['station_type', 'transaction_type', 'date_range']
  },
  {
    id: 'activities',
    name: 'Activities & Events',
    table: 'activities',
    description: 'Event participation data',
    metrics: ['participant_count', 'activity_frequency', 'engagement_score'],
    groupOptions: ['date', 'activity_type'],
    filterOptions: ['date_range', 'participant_count_min']
  }
];

const chartTypes = [
  { id: 'bar', name: 'Bar Chart', icon: BarChart3, description: 'Best for comparing categories' },
  { id: 'line', name: 'Line Chart', icon: LineChart, description: 'Best for trends over time' },
  { id: 'pie', name: 'Pie Chart', icon: PieChart, description: 'Best for part-to-whole relationships' },
  { id: 'area', name: 'Area Chart', icon: TrendingUp, description: 'Best for cumulative data' }
];

const colorSchemes = [
  { name: 'Primary', colors: ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))'] },
  { name: 'Success', colors: ['hsl(142, 76%, 36%)', 'hsl(142, 76%, 56%)', 'hsl(142, 76%, 76%)'] },
  { name: 'Warning', colors: ['hsl(38, 92%, 50%)', 'hsl(38, 92%, 70%)', 'hsl(38, 92%, 90%)'] },
  { name: 'Ocean', colors: ['hsl(199, 89%, 48%)', 'hsl(199, 89%, 68%)', 'hsl(199, 89%, 88%)'] },
  { name: 'Sunset', colors: ['hsl(14, 100%, 57%)', 'hsl(34, 100%, 57%)', 'hsl(54, 100%, 57%)'] }
];

export const ChartCustomizer: React.FC<ChartCustomizerProps> = ({ onChartGenerated }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('data');
  const [chartConfig, setChartConfig] = useState<Partial<CustomChartConfig>>({
    title: '',
    chartType: 'bar',
    dataSource: '',
    metrics: [],
    height: 400
  });
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [savedConfigs, setSavedConfigs] = useState<CustomChartConfig[]>([]);

  const selectedDataSource = dataSources.find(ds => ds.id === chartConfig.dataSource);

  const generatePreviewData = async () => {
    if (!chartConfig.dataSource || !chartConfig.metrics?.length) return;

    try {
      setIsGenerating(true);
      
      const { data, error } = await supabase
        .from(selectedDataSource?.table as any)
        .select('*')
        .limit(100);

      if (error) throw error;

      // Transform data based on chart configuration
      const transformedData = processDataForChart(data || [], chartConfig);
      setPreviewData(transformedData);
    } catch (error) {
      console.error("Error generating preview:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const processDataForChart = (data: any[], config: Partial<CustomChartConfig>) => {
    if (!data.length) return [];

    switch (config.dataSource) {
      case 'attendees':
        if (config.metrics?.includes('ticket_type_distribution')) {
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
        if (config.metrics?.includes('station_usage')) {
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
        
      case 'activities':
        return data.map(activity => ({
          name: activity.name || 'Unknown Activity',
          value: activity.participant_count || 0,
          date: activity.recorded_at
        }));
    }

    return [];
  };

  const saveConfiguration = () => {
    if (!chartConfig.title || !chartConfig.dataSource) return;

    const newConfig: CustomChartConfig = {
      id: Date.now().toString(),
      title: chartConfig.title,
      chartType: chartConfig.chartType!,
      dataSource: chartConfig.dataSource,
      metrics: chartConfig.metrics || [],
      groupBy: chartConfig.groupBy,
      dateRange: chartConfig.dateRange,
      filters: chartConfig.filters,
      colors: chartConfig.colors,
      height: chartConfig.height || 400
    };

    setSavedConfigs(prev => [...prev, newConfig]);
    onChartGenerated?.(newConfig);
    setIsOpen(false);
  };

  useEffect(() => {
    if (chartConfig.dataSource && chartConfig.metrics?.length) {
      generatePreviewData();
    }
  }, [chartConfig.dataSource, chartConfig.metrics, chartConfig.groupBy]);

  return (
    <TooltipProvider>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button className="gap-2" variant="outline">
            <Settings className="h-4 w-4" />
            Custom Chart Builder
          </Button>
        </DialogTrigger>
        
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Custom Chart Builder
            </DialogTitle>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="data">Data Source</TabsTrigger>
              <TabsTrigger value="chart">Chart Type</TabsTrigger>
              <TabsTrigger value="style">Styling</TabsTrigger>
              <TabsTrigger value="preview">Preview</TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-auto">
              <TabsContent value="data" className="space-y-4 mt-4">
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium">Data Source</Label>
                    <Select 
                      value={chartConfig.dataSource} 
                      onValueChange={(value) => setChartConfig(prev => ({ ...prev, dataSource: value, metrics: [] }))}
                    >
                      <SelectTrigger className="mt-2">
                        <SelectValue placeholder="Select a data source" />
                      </SelectTrigger>
                      <SelectContent>
                        {dataSources.map(source => (
                          <SelectItem key={source.id} value={source.id}>
                            <div className="flex flex-col">
                              <span className="font-medium">{source.name}</span>
                              <span className="text-xs text-muted-foreground">{source.description}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedDataSource && (
                    <div>
                      <Label className="text-sm font-medium">Metrics</Label>
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        {selectedDataSource.metrics.map(metric => (
                          <div key={metric} className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              id={metric}
                              checked={chartConfig.metrics?.includes(metric)}
                              onChange={(e) => {
                                const updated = e.target.checked
                                  ? [...(chartConfig.metrics || []), metric]
                                  : (chartConfig.metrics || []).filter(m => m !== metric);
                                setChartConfig(prev => ({ ...prev, metrics: updated }));
                              }}
                            />
                            <Label htmlFor={metric} className="text-sm">
                              {metric.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedDataSource && (
                    <div>
                      <Label className="text-sm font-medium">Group By (Optional)</Label>
                      <Select 
                        value={chartConfig.groupBy || ''} 
                        onValueChange={(value) => setChartConfig(prev => ({ ...prev, groupBy: value === "none" ? undefined : value }))}
                      >
                        <SelectTrigger className="mt-2">
                          <SelectValue placeholder="Select grouping option" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No Grouping</SelectItem>
                          {selectedDataSource.groupOptions.map(option => (
                            <SelectItem key={option} value={option}>
                              {option.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="chart" className="space-y-4 mt-4">
                <div>
                  <Label className="text-sm font-medium mb-3 block">Chart Type</Label>
                  <div className="grid grid-cols-2 gap-3">
                    {chartTypes.map(type => {
                      const Icon = type.icon;
                      return (
                        <Tooltip key={type.id}>
                          <TooltipTrigger asChild>
                            <Card 
                              className={`cursor-pointer transition-all hover:shadow-md ${
                                chartConfig.chartType === type.id ? 'ring-2 ring-primary' : ''
                              }`}
                              onClick={() => setChartConfig(prev => ({ ...prev, chartType: type.id as any }))}
                            >
                              <CardContent className="p-4 text-center">
                                <Icon className="h-8 w-8 mx-auto mb-2 text-primary" />
                                <h3 className="font-medium text-sm">{type.name}</h3>
                              </CardContent>
                            </Card>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{type.description}</p>
                          </TooltipContent>
                        </Tooltip>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <Label htmlFor="chart-title" className="text-sm font-medium">Chart Title</Label>
                  <Input
                    id="chart-title"
                    value={chartConfig.title || ''}
                    onChange={(e) => setChartConfig(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Enter chart title"
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label htmlFor="chart-height" className="text-sm font-medium">Chart Height (px)</Label>
                  <Input
                    id="chart-height"
                    type="number"
                    value={chartConfig.height || 400}
                    onChange={(e) => setChartConfig(prev => ({ ...prev, height: parseInt(e.target.value) || 400 }))}
                    min={200}
                    max={800}
                    className="mt-2"
                  />
                </div>
              </TabsContent>

              <TabsContent value="style" className="space-y-4 mt-4">
                <div>
                  <Label className="text-sm font-medium mb-3 block">Color Scheme</Label>
                  <div className="space-y-2">
                    {colorSchemes.map(scheme => (
                      <Card 
                        key={scheme.name}
                        className={`cursor-pointer transition-all hover:shadow-md ${
                          chartConfig.colors === scheme.colors ? 'ring-2 ring-primary' : ''
                        }`}
                        onClick={() => setChartConfig(prev => ({ ...prev, colors: scheme.colors }))}
                      >
                        <CardContent className="p-3 flex items-center gap-3">
                          <div className="flex gap-1">
                            {scheme.colors.map((color, index) => (
                              <div 
                                key={index}
                                className="w-4 h-4 rounded-full border"
                                style={{ backgroundColor: color }}
                              />
                            ))}
                          </div>
                          <span className="font-medium text-sm">{scheme.name}</span>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="preview" className="mt-4">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-medium">Chart Preview</h3>
                    <Button 
                      onClick={generatePreviewData} 
                      disabled={isGenerating}
                      size="sm"
                      variant="outline"
                    >
                      <Play className="h-4 w-4 mr-2" />
                      {isGenerating ? 'Generating...' : 'Refresh Preview'}
                    </Button>
                  </div>

                  {chartConfig.title && chartConfig.dataSource && chartConfig.metrics?.length ? (
                    <ResponsiveChartContainer 
                      title={chartConfig.title}
                      data={previewData}
                      chartType={chartConfig.chartType}
                      height={chartConfig.height}
                      colors={chartConfig.colors}
                      isLoading={isGenerating}
                    />
                  ) : (
                    <Card className="h-64 flex items-center justify-center">
                      <div className="text-center text-muted-foreground">
                        <Info className="h-8 w-8 mx-auto mb-2" />
                        <p>Configure data source and metrics to see preview</p>
                      </div>
                    </Card>
                  )}
                </div>
              </TabsContent>
            </div>
          </Tabs>

          <div className="flex justify-between items-center pt-4 border-t">
            <div className="flex gap-2">
              <Badge variant="outline" className="text-xs">
                {savedConfigs.length} saved configurations
              </Badge>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setIsOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={saveConfiguration}
                disabled={!chartConfig.title || !chartConfig.dataSource || !chartConfig.metrics?.length}
                className="gap-2"
              >
                <Save className="h-4 w-4" />
                Save & Generate
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
};