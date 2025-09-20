import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
import { GlassWater, Clock, TrendingUp, Users, ArrowUp, ArrowDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { TimePeriod, getTimeBoundaries, getComparisonBoundaries, formatTimePeriod } from "@/utils/etTimezone";
import { useBackgroundRefresh } from "@/hooks/useBackgroundRefresh";

interface AnalyticsData {
  drinkCount: number;
  drinkHourlyData: Array<{ hour: string; drinks: number }>;
  drinkPeakHour: { hour: string; drinks: number } | null;
  averagePartyTimeMinutes: number;
  peakHours: Array<{ hour: string; checkouts: number }>;
  mealCounts: {
    breakfast: number;
    lunch: number;
    dinner: number;
  };
  comparison?: {
    drinkChange: number;
    partyTimeChange: number;
  };
}

interface AnalyticsCardsProps {
  selectedPeriod: TimePeriod;
  refreshTrigger?: number;
}

export const AnalyticsCards = ({ selectedPeriod, refreshTrigger }: AnalyticsCardsProps) => {
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    drinkCount: 0,
    drinkHourlyData: [],
    drinkPeakHour: null,
    averagePartyTimeMinutes: 0,
    peakHours: [],
    mealCounts: { breakfast: 0, lunch: 0, dinner: 0 }
  });
  const [isLoading, setIsLoading] = useState(true);

  const fetchAnalytics = useCallback(async () => {
      try {
        const boundaries = getTimeBoundaries(selectedPeriod);
        const comparisonBoundaries = getComparisonBoundaries(selectedPeriod);
        
        // Get drink counts for selected period
        const { data: drinks } = await supabase
          .from('station_transactions')
          .select('*')
          .eq('station_type', 'drinks')
          .eq('transaction_type', 'drink')
          .gte('created_at', boundaries.start.toISOString())
          .lt('created_at', boundaries.end.toISOString());

        const drinkCount = drinks?.length || 0;

        // Get hourly drink data
        const drinkHourlyData = Array.from({ length: 24 }, (_, i) => ({
          hour: `${i}:00`,
          drinks: 0
        }));

        drinks?.forEach(drink => {
          const hour = new Date(drink.created_at).getHours();
          drinkHourlyData[hour].drinks++;
        });

        // Find peak hour for drinks
        const drinkPeakHour = drinkHourlyData
          .filter(h => h.drinks > 0)
          .sort((a, b) => b.drinks - a.drinks)[0] || null;

        // Get headphone data to calculate average party time
        const { data: headphoneTransactions } = await supabase
          .from('station_transactions')
          .select('attendee_id, created_at, transaction_type')
          .eq('station_type', 'headphones')
          .in('transaction_type', ['headphone_checkout', 'headphone_checkin'])
          .gte('created_at', boundaries.start.toISOString())
          .lt('created_at', boundaries.end.toISOString())
          .order('created_at', { ascending: true });

        // Calculate average party time from headphone sessions
        let totalPartyMinutes = 0;
        let completedSessions = 0;
        const sessionMap = new Map<string, Date>();

        if (headphoneTransactions) {
          headphoneTransactions.forEach(transaction => {
            const key = transaction.attendee_id;
            const time = new Date(transaction.created_at);
            
            if (transaction.transaction_type === 'headphone_checkout') {
              sessionMap.set(key, time);
            } else if (transaction.transaction_type === 'headphone_checkin' && sessionMap.has(key)) {
              const checkoutTime = sessionMap.get(key)!;
              const sessionMinutes = Math.floor((time.getTime() - checkoutTime.getTime()) / (1000 * 60));
              totalPartyMinutes += sessionMinutes;
              completedSessions++;
              sessionMap.delete(key);
            }
          });
        }

        const avgPartyTime = completedSessions > 0 ? Math.round(totalPartyMinutes / completedSessions) : 0;

        // Get hourly breakdown for peak usage
        const { data: allTransactions } = await supabase
          .from('station_transactions')
          .select('created_at, transaction_type')
          .gte('created_at', boundaries.start.toISOString())
          .lt('created_at', boundaries.end.toISOString());

        const hourlyData = Array.from({ length: 24 }, (_, i) => ({
          hour: `${i}:00`,
          checkouts: 0
        }));

        allTransactions?.forEach(transaction => {
          const hour = new Date(transaction.created_at).getHours();
          hourlyData[hour].checkouts++;
        });

        // Get top 6 peak hours
        const peakHours = hourlyData
          .filter(h => h.checkouts > 0)
          .sort((a, b) => b.checkouts - a.checkouts)
          .slice(0, 6);

        // Get meal counts by type
        const { data: meals } = await supabase
          .from('station_transactions')
          .select('transaction_type')
          .eq('station_type', 'meal')
          .like('transaction_type', 'meal_%')
          .gte('created_at', boundaries.start.toISOString())
          .lt('created_at', boundaries.end.toISOString());

        const mealCounts = {
          breakfast: meals?.filter(m => m.transaction_type.includes('breakfast')).length || 0,
          lunch: meals?.filter(m => m.transaction_type.includes('lunch')).length || 0,
          dinner: meals?.filter(m => m.transaction_type.includes('dinner')).length || 0
        };

        // Get comparison data if available
        let comparison = undefined;
        if (comparisonBoundaries) {
          const { data: compDrinks } = await supabase
            .from('station_transactions')
            .select('*')
            .eq('station_type', 'drinks')
            .eq('transaction_type', 'drink')
            .gte('created_at', comparisonBoundaries.start.toISOString())
            .lt('created_at', comparisonBoundaries.end.toISOString());

          const { data: compHeadphones } = await supabase
            .from('station_transactions')
            .select('attendee_id, created_at, transaction_type')
            .eq('station_type', 'headphones')
            .in('transaction_type', ['headphone_checkout', 'headphone_checkin'])
            .gte('created_at', comparisonBoundaries.start.toISOString())
            .lt('created_at', comparisonBoundaries.end.toISOString())
            .order('created_at', { ascending: true });

          // Calculate comparison party time
          let compTotalMinutes = 0;
          let compCompletedSessions = 0;
          const compSessionMap = new Map<string, Date>();

          if (compHeadphones) {
            compHeadphones.forEach(transaction => {
              const key = transaction.attendee_id;
              const time = new Date(transaction.created_at);
              
              if (transaction.transaction_type === 'headphone_checkout') {
                compSessionMap.set(key, time);
              } else if (transaction.transaction_type === 'headphone_checkin' && compSessionMap.has(key)) {
                const checkoutTime = compSessionMap.get(key)!;
                const sessionMinutes = Math.floor((time.getTime() - checkoutTime.getTime()) / (1000 * 60));
                compTotalMinutes += sessionMinutes;
                compCompletedSessions++;
                compSessionMap.delete(key);
              }
            });
          }

          const compAvgPartyTime = compCompletedSessions > 0 ? Math.round(compTotalMinutes / compCompletedSessions) : 0;
          const compDrinkCount = compDrinks?.length || 0;

          comparison = {
            drinkChange: compDrinkCount > 0 ? ((drinkCount - compDrinkCount) / compDrinkCount) * 100 : 0,
            partyTimeChange: compAvgPartyTime > 0 ? ((avgPartyTime - compAvgPartyTime) / compAvgPartyTime) * 100 : 0
          };
        }

        setAnalytics({
          drinkCount,
          drinkHourlyData,
          drinkPeakHour,
          averagePartyTimeMinutes: avgPartyTime,
          peakHours,
          mealCounts,
          comparison
        });

      } catch (error) {
        console.error('Error fetching analytics:', error);
      } finally {
        setIsLoading(false);
      }
    }, [selectedPeriod]);

    useBackgroundRefresh({
      onRefresh: fetchAnalytics,
      refreshTrigger
    });

  const formatTime = (minutes: number): string => {
    if (minutes === 0) return '0m';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const formatHour = (hour: string): string => {
    const h = parseInt(hour.split(':')[0]);
    if (h === 0) return '12AM';
    if (h === 12) return '12PM';
    if (h > 12) return `${h - 12}PM`;
    return `${h}AM`;
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[1,2,3,4].map(i => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="animate-pulse space-y-4">
                <div className="h-6 bg-muted rounded w-1/2"></div>
                <div className="h-32 bg-muted rounded"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Drinks Counter */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <GlassWater className="h-5 w-5" />
              Drinks Served {formatTimePeriod(selectedPeriod)}
            </div>
            {analytics.comparison && (
              <div className="flex items-center gap-1 text-sm">
                {analytics.comparison.drinkChange > 0 ? (
                  <ArrowUp className="h-3 w-3 text-success" />
                ) : analytics.comparison.drinkChange < 0 ? (
                  <ArrowDown className="h-3 w-3 text-destructive" />
                ) : null}
                <span className={analytics.comparison.drinkChange > 0 ? 'text-success' : analytics.comparison.drinkChange < 0 ? 'text-destructive' : 'text-muted-foreground'}>
                  {analytics.comparison.drinkChange > 0 ? '+' : ''}{Math.round(analytics.comparison.drinkChange)}%
                </span>
              </div>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Total Count */}
            <div className="text-center space-y-2">
              <div className="text-4xl font-bold text-info">{analytics.drinkCount}</div>
              <div className="text-muted-foreground">Total beverages served</div>
            </div>
            
            {/* Mini Chart */}
            <div className="h-16">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.drinkHourlyData}>
                  <XAxis 
                    dataKey="hour" 
                    tick={{ fontSize: 10 }}
                    tickFormatter={formatHour}
                    interval="preserveStartEnd"
                  />
                  <YAxis hide />
                  <Tooltip 
                    formatter={(value) => [value, 'Drinks']}
                    labelFormatter={(hour) => `Time: ${formatHour(hour)}`}
                  />
                  <Bar 
                    dataKey="drinks" 
                    fill="hsl(var(--info))" 
                    radius={[2, 2, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
            
            {/* Peak Hour Indicator */}
            {analytics.drinkPeakHour && (
              <div className="text-center text-sm text-muted-foreground">
                Peak: {formatHour(analytics.drinkPeakHour.hour)} ({analytics.drinkPeakHour.drinks} drinks)
              </div>
            )}
            
            <div className="text-center">
              <Badge variant="outline" className="bg-info/10 text-info">
                Live Counter
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Average Party Time */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Average Party Time
            </div>
            {analytics.comparison && (
              <div className="flex items-center gap-1 text-sm">
                {analytics.comparison.partyTimeChange > 0 ? (
                  <ArrowUp className="h-3 w-3 text-success" />
                ) : analytics.comparison.partyTimeChange < 0 ? (
                  <ArrowDown className="h-3 w-3 text-destructive" />
                ) : null}
                <span className={analytics.comparison.partyTimeChange > 0 ? 'text-success' : analytics.comparison.partyTimeChange < 0 ? 'text-destructive' : 'text-muted-foreground'}>
                  {analytics.comparison.partyTimeChange > 0 ? '+' : ''}{Math.round(analytics.comparison.partyTimeChange)}%
                </span>
              </div>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center space-y-4">
            <div className="text-4xl font-bold text-success">
              {formatTime(analytics.averagePartyTimeMinutes)}
            </div>
            <div className="text-muted-foreground">
              Based on headphone usage patterns
            </div>
            <Badge variant="outline" className="bg-success/10 text-success">
              {analytics.averagePartyTimeMinutes > 120 ? 'Great Engagement!' : 'Building Up'}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Peak Usage Hours */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Peak Usage Hours
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.peakHours}>
                <XAxis 
                  dataKey="hour" 
                  tick={{ fontSize: 12 }}
                  tickFormatter={formatHour}
                />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip 
                  formatter={(value) => [value, 'Activities']}
                  labelFormatter={(hour) => `Time: ${formatHour(hour)}`}
                />
                <Bar dataKey="checkouts" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Meal Service Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Meal Service Today
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-3 bg-warning/10 rounded-lg">
                <div className="text-2xl font-bold text-warning">
                  {analytics.mealCounts.breakfast}
                </div>
                <div className="text-sm text-muted-foreground">Breakfast</div>
              </div>
              <div className="text-center p-3 bg-info/10 rounded-lg">
                <div className="text-2xl font-bold text-info">
                  {analytics.mealCounts.lunch}
                </div>
                <div className="text-sm text-muted-foreground">Lunch</div>
              </div>
              <div className="text-center p-3 bg-primary/10 rounded-lg">
                <div className="text-2xl font-bold text-primary">
                  {analytics.mealCounts.dinner}
                </div>
                <div className="text-sm text-muted-foreground">Dinner</div>
              </div>
            </div>
            <div className="text-center">
              <Badge variant="outline" className="text-success">
                Total: {analytics.mealCounts.breakfast + analytics.mealCounts.lunch + analytics.mealCounts.dinner} meals served
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};