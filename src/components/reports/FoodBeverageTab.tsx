import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScoreCard } from "./shared/ScoreCard";
import { ExportButton } from "./shared/ExportButton";
import { supabase } from "@/integrations/supabase/client";
import { 
  Utensils, 
  Coffee, 
  TrendingUp,
  Clock,
  Users
} from "lucide-react";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  BarChart,
  Bar,
  Area,
  AreaChart
} from "recharts";

interface FoodBeverageTabProps {
  isRefreshing: boolean;
}

interface FBStats {
  totalMeals: number;
  totalDrinks: number;
  breakfastServed: number;
  lunchServed: number;
  dinnerServed: number;
}

interface HourlyData {
  hour: string;
  meals: number;
  drinks: number;
  timestamp: string;
}

export const FoodBeverageTab: React.FC<FoodBeverageTabProps> = ({ isRefreshing }) => {
  const [stats, setStats] = useState<FBStats>({
    totalMeals: 0,
    totalDrinks: 0,
    breakfastServed: 0,
    lunchServed: 0,
    dinnerServed: 0
  });
  const [hourlyData, setHourlyData] = useState<HourlyData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchFoodBeverageData = async () => {
    try {
      setIsLoading(true);

      // Get station transactions for meal and drink stations
      const { data: transactions, error } = await supabase
        .from('station_transactions')
        .select('*')
        .in('station_type', ['meal', 'drinks']);

      if (error) throw error;

      // Process statistics
      const mealTransactions = transactions?.filter(t => t.station_type === 'meal') || [];
      const drinkTransactions = transactions?.filter(t => t.station_type === 'drinks') || [];

      // Count meals by type based on actual transaction times
      const totalMeals = mealTransactions.length;
      const totalDrinks = drinkTransactions.length;

      // Classify meals by time of day (realistic meal time classification)
      let breakfastServed = 0;
      let lunchServed = 0;
      let dinnerServed = 0;

      mealTransactions.forEach(transaction => {
        const hour = new Date(transaction.created_at).getHours();
        if (hour >= 6 && hour < 11) {
          breakfastServed++;
        } else if (hour >= 11 && hour < 16) {
          lunchServed++;
        } else {
          dinnerServed++;
        }
      });

      setStats({
        totalMeals,
        totalDrinks,
        breakfastServed,
        lunchServed,
        dinnerServed
      });

      // Generate hourly trend data
      const hourlyMap = new Map<string, { meals: number; drinks: number }>();
      
      // Initialize 24 hours
      for (let i = 0; i < 24; i++) {
        const hour = i.toString().padStart(2, '0') + ':00';
        hourlyMap.set(hour, { meals: 0, drinks: 0 });
      }

      // Process transactions by hour
      [...mealTransactions, ...drinkTransactions].forEach(transaction => {
        const hour = new Date(transaction.created_at).getHours().toString().padStart(2, '0') + ':00';
        const current = hourlyMap.get(hour) || { meals: 0, drinks: 0 };
        
        if (transaction.station_type === 'meal') {
          current.meals += 1;
        } else {
          current.drinks += 1;
        }
        
        hourlyMap.set(hour, current);
      });

      const hourlyArray = Array.from(hourlyMap.entries()).map(([hour, data]) => ({
        hour,
        meals: data.meals,
        drinks: data.drinks,
        timestamp: hour
      }));

      setHourlyData(hourlyArray);

    } catch (error) {
      console.error("Error fetching food & beverage data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFoodBeverageData();
  }, []);

  useEffect(() => {
    if (isRefreshing) {
      fetchFoodBeverageData();
    }
  }, [isRefreshing]);

  // Set up real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel('station-transactions-fb')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'station_transactions',
        filter: 'station_type=in.(meal,drinks)'
      }, () => {
        fetchFoodBeverageData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const chartConfig = {
    meals: {
      label: "Meals",
      color: "hsl(var(--primary))",
    },
    drinks: {
      label: "Drinks",
      color: "hsl(var(--secondary))",
    },
  };

  // Prepare data for different charts
  const mealBreakdownData = [
    { name: 'Breakfast', value: stats.breakfastServed, color: 'hsl(var(--primary))' },
    { name: 'Lunch', value: stats.lunchServed, color: 'hsl(var(--secondary))' },
    { name: 'Dinner', value: stats.dinnerServed, color: 'hsl(var(--accent))' }
  ];

  // Peak hours data (filter for high activity periods)
  const peakHours = hourlyData.filter(d => d.meals > 0 || d.drinks > 0);

  const exportData = [
    { metric: "Total Meals Served", value: stats.totalMeals },
    { metric: "Total Drinks Served", value: stats.totalDrinks },
    { metric: "Breakfast Meals", value: stats.breakfastServed },
    { metric: "Lunch Meals", value: stats.lunchServed },
    { metric: "Dinner Meals", value: stats.dinnerServed },
    ...hourlyData.map(d => ({
      hour: d.hour,
      meals: d.meals,
      drinks: d.drinks,
      total: d.meals + d.drinks
    }))
  ];

  return (
    <div className="space-y-6" data-export-target>
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-primary">Food & Beverage Analytics</h2>
          <p className="text-muted-foreground">Service metrics and consumption patterns</p>
        </div>
        <ExportButton 
          data={exportData}
          filename="food-beverage-analytics"
          title="Food & Beverage Analytics Report"
        />
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <ScoreCard
          title="Total Meals Served"
          value={stats.totalMeals}
          icon={Utensils}
          isLoading={isLoading}
          variant="default"
        />
        <ScoreCard
          title="Total Drinks Served"
          value={stats.totalDrinks}
          icon={Coffee}
          isLoading={isLoading}
          variant="default"
        />
        <ScoreCard
          title="Breakfast"
          value={stats.breakfastServed}
          subtitle="Morning service"
          icon={Utensils}
          isLoading={isLoading}
          variant="success"
        />
        <ScoreCard
          title="Lunch"
          value={stats.lunchServed}
          subtitle="Midday service"
          icon={Utensils}
          isLoading={isLoading}
          variant="success"
        />
        <ScoreCard
          title="Dinner"
          value={stats.dinnerServed}
          subtitle="Evening service"
          icon={Utensils}
          isLoading={isLoading}
          variant="success"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Hourly Trend */}
        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Hourly Service Trends
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80 w-full">
              <ChartContainer config={chartConfig}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={hourlyData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis 
                      dataKey="hour" 
                      tick={{ fontSize: 10 }}
                      interval={2}
                    />
                    <YAxis tick={{ fontSize: 12 }} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Area
                      type="monotone"
                      dataKey="meals"
                      stackId="1"
                      stroke="hsl(var(--primary))"
                      fill="hsl(var(--primary))"
                      fillOpacity={0.6}
                      name="Meals"
                    />
                    <Area
                      type="monotone"
                      dataKey="drinks"
                      stackId="1"
                      stroke="hsl(var(--secondary))"
                      fill="hsl(var(--secondary))"
                      fillOpacity={0.6}
                      name="Drinks"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartContainer>
            </div>
          </CardContent>
        </Card>

        {/* Meal Type Breakdown */}
        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Utensils className="h-5 w-5 text-primary" />
              Meal Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={mealBreakdownData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <ChartTooltip 
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-background border border-border rounded-lg shadow-lg p-3">
                            <p className="font-medium">{label}</p>
                            <p className="text-primary">
                              Served: {payload[0].value?.toLocaleString()}
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar 
                    dataKey="value" 
                    fill="hsl(var(--primary))"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Station Performance Summary */}
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Station Performance Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Meals Station */}
            <div className="space-y-4">
              <h4 className="font-semibold text-primary">Meal Station</h4>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Peak Hour</span>
                  <span className="font-medium">
                    {hourlyData.reduce((max, current) => 
                      current.meals > max.meals ? current : max, 
                      { hour: '12:00', meals: 0 }
                    ).hour}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Average per Hour</span>
                  <span className="font-medium">
                    {peakHours.length > 0 ? Math.round(stats.totalMeals / peakHours.length) : 0}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Most Popular</span>
                  <span className="font-medium">
                    {stats.lunchServed >= stats.breakfastServed && stats.lunchServed >= stats.dinnerServed 
                      ? 'Lunch' 
                      : stats.dinnerServed >= stats.breakfastServed 
                        ? 'Dinner' 
                        : 'Breakfast'}
                  </span>
                </div>
              </div>
            </div>

            {/* Drinks Station */}
            <div className="space-y-4">
              <h4 className="font-semibold text-primary">Drinks Station</h4>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Peak Hour</span>
                  <span className="font-medium">
                    {hourlyData.reduce((max, current) => 
                      current.drinks > max.drinks ? current : max, 
                      { hour: '14:00', drinks: 0 }
                    ).hour}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Average per Hour</span>
                  <span className="font-medium">
                    {peakHours.length > 0 ? Math.round(stats.totalDrinks / peakHours.length) : 0}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Total Served</span>
                  <span className="font-medium">{stats.totalDrinks.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};