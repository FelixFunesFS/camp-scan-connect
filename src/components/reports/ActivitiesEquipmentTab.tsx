import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScoreCard } from "./shared/ScoreCard";
import { ExportButton } from "./shared/ExportButton";
import { supabase } from "@/integrations/supabase/client";
import { 
  Headphones, 
  Activity, 
  Users,
  TrendingUp,
  Clock,
  Plus,
  Minus
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
  Bar
} from "recharts";

interface ActivitiesEquipmentTabProps {
  isRefreshing: boolean;
}

interface EquipmentStats {
  headphonesCheckedOut: number;
  headphonesAvailable: number;
  totalHeadphones: number;
}

interface ActivityData {
  id: string;
  name: string;
  participant_count: number;
  recorded_at: string;
  notes?: string;
}

interface TimelineData {
  time: string;
  checkouts: number;
  checkins: number;
}

export const ActivitiesEquipmentTab: React.FC<ActivitiesEquipmentTabProps> = ({ isRefreshing }) => {
  const [equipmentStats, setEquipmentStats] = useState<EquipmentStats>({
    headphonesCheckedOut: 0,
    headphonesAvailable: 0,
    totalHeadphones: 50 // Real initial inventory - can be made configurable
  });
  const [activities, setActivities] = useState<ActivityData[]>([]);
  const [timelineData, setTimelineData] = useState<TimelineData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newActivity, setNewActivity] = useState({ name: '', participants: 0 });
  const [showAddActivity, setShowAddActivity] = useState(false);

  const fetchEquipmentData = async () => {
    try {
      setIsLoading(true);

      // Get headphone transactions
      const { data: headphoneTransactions, error: headphoneError } = await supabase
        .from('station_transactions')
        .select('*')
        .eq('station_type', 'headphones');

      if (headphoneError) throw headphoneError;

      // Calculate headphone stats with real inventory count
      const checkoutTransactions = headphoneTransactions?.filter(t => t.transaction_type === 'headphone_checkout') || [];
      const checkinTransactions = headphoneTransactions?.filter(t => t.transaction_type === 'headphone_checkin') || [];
      
      const headphonesCheckedOut = Math.max(0, checkoutTransactions.length - checkinTransactions.length);
      const totalHeadphones = 50; // Real inventory count - could be made configurable via settings
      const headphonesAvailable = Math.max(0, totalHeadphones - headphonesCheckedOut);

      setEquipmentStats({
        headphonesCheckedOut: Math.max(0, headphonesCheckedOut),
        headphonesAvailable: Math.max(0, headphonesAvailable),
        totalHeadphones
      });

      // Generate timeline data
      const timelineMap = new Map<string, { checkouts: number; checkins: number }>();
      
      // Initialize 24 hours
      for (let i = 0; i < 24; i++) {
        const hour = i.toString().padStart(2, '0') + ':00';
        timelineMap.set(hour, { checkouts: 0, checkins: 0 });
      }

      // Process transactions by hour
      [...checkoutTransactions, ...checkinTransactions].forEach(transaction => {
        const hour = new Date(transaction.created_at).getHours().toString().padStart(2, '0') + ':00';
        const current = timelineMap.get(hour) || { checkouts: 0, checkins: 0 };
        
        if (transaction.transaction_type === 'headphone_checkout') {
          current.checkouts += 1;
        } else {
          current.checkins += 1;
        }
        
        timelineMap.set(hour, current);
      });

      const timelineArray = Array.from(timelineMap.entries()).map(([time, data]) => ({
        time,
        checkouts: data.checkouts,
        checkins: data.checkins
      }));

      setTimelineData(timelineArray);

    } catch (error) {
      console.error("Error fetching equipment data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchActivities = async () => {
    try {
      const { data: activities, error } = await supabase
        .from('activities')
        .select('*')
        .order('recorded_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      
      setActivities(activities || []);
    } catch (error) {
      console.error("Error fetching activities:", error);
      setActivities([]);
    }
  };

  const addActivity = async () => {
    if (!newActivity.name.trim() || newActivity.participants <= 0) return;

    try {
      const { data: newActivityRecord, error } = await supabase
        .from('activities')
        .insert({
          name: newActivity.name,
          participant_count: newActivity.participants,
          notes: 'Manually logged via dashboard'
        })
        .select()
        .single();

      if (error) throw error;

      if (newActivityRecord) {
        setActivities(prev => [newActivityRecord, ...prev]);
        setNewActivity({ name: '', participants: 0 });
        setShowAddActivity(false);
      }
    } catch (error) {
      console.error("Error adding activity:", error);
    }
  };

  useEffect(() => {
    fetchEquipmentData();
    fetchActivities();
  }, []);

  useEffect(() => {
    if (isRefreshing) {
      fetchEquipmentData();
      fetchActivities();
    }
  }, [isRefreshing]);

  // Set up real-time subscription
  useEffect(() => {
    const equipmentChannel = supabase
      .channel('equipment-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'station_transactions',
        filter: 'station_type=eq.headphones'
      }, () => {
        fetchEquipmentData();
      })
      .subscribe();

    const activitiesChannel = supabase
      .channel('activities-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'activities'
      }, () => {
        fetchActivities();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(equipmentChannel);
      supabase.removeChannel(activitiesChannel);
    };
  }, []);

  const chartConfig = {
    checkouts: {
      label: "Check-outs",
      color: "hsl(var(--primary))",
    },
    checkins: {
      label: "Check-ins", 
      color: "hsl(var(--secondary))",
    },
  };

  // Memoize timeline data to prevent unnecessary re-renders
  const memoizedTimelineData = React.useMemo(() => timelineData, [timelineData]);

  const utilizationRate = equipmentStats.totalHeadphones > 0 
    ? Math.round((equipmentStats.headphonesCheckedOut / equipmentStats.totalHeadphones) * 100)
    : 0;

  const totalParticipants = activities.reduce((sum, activity) => sum + activity.participant_count, 0);

  const exportData = [
    { metric: "Headphones Total", value: equipmentStats.totalHeadphones },
    { metric: "Headphones Checked Out", value: equipmentStats.headphonesCheckedOut },
    { metric: "Headphones Available", value: equipmentStats.headphonesAvailable },
    { metric: "Utilization Rate", value: `${utilizationRate}%` },
    { metric: "Total Activities", value: activities.length },
    { metric: "Total Participants", value: totalParticipants },
    ...activities.map(activity => ({
      activityName: activity.name,
      participants: activity.participant_count,
      recordedAt: new Date(activity.recorded_at).toLocaleString(),
      notes: activity.notes || ''
    }))
  ];

  return (
    <div className="space-y-8" data-export-target>
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-primary">Activities & Equipment</h2>
          <p className="text-muted-foreground">Equipment utilization and activity tracking</p>
        </div>
        <ExportButton 
          data={exportData}
          filename="activities-equipment"
          title="Activities & Equipment Report"
        />
      </div>

      {/* Equipment Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <ScoreCard
          title="Total Headphones"
          value={equipmentStats.totalHeadphones}
          icon={Headphones}
          isLoading={isLoading}
        />
        <ScoreCard
          title="Currently Checked Out"
          value={equipmentStats.headphonesCheckedOut}
          icon={Headphones}
          isLoading={isLoading}
          variant={utilizationRate > 80 ? "warning" : "success"}
        />
        <ScoreCard
          title="Available"
          value={equipmentStats.headphonesAvailable}
          icon={Headphones}
          isLoading={isLoading}
          variant={equipmentStats.headphonesAvailable < 20 ? "error" : "success"}
        />
        <ScoreCard
          title="Utilization Rate"
          value={`${utilizationRate}%`}
          icon={TrendingUp}
          isLoading={isLoading}
          variant={utilizationRate > 80 ? "warning" : utilizationRate > 50 ? "success" : "default"}
        />
      </div>

      {/* Equipment Timeline Chart */}
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Headphone Activity Timeline
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-4">
          {isLoading ? (
            <div className="h-[300px] md:h-[400px] w-full flex items-center justify-center bg-muted/20 rounded-lg">
              <div className="text-sm text-muted-foreground">Loading chart...</div>
            </div>
          ) : (
            <ChartContainer config={chartConfig} className="h-[300px] md:h-[400px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart 
                  data={memoizedTimelineData} 
                  margin={{ 
                    top: 20, 
                    right: 20, 
                    left: 10, 
                    bottom: 40 
                  }}
                >
                  <CartesianGrid 
                    strokeDasharray="3 3" 
                    opacity={0.3}
                    className="stroke-muted"
                  />
                  <XAxis 
                    dataKey="time" 
                    tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                    interval={window.innerWidth < 768 ? 4 : 2}
                    axisLine={{ stroke: 'hsl(var(--border))' }}
                  />
                  <YAxis 
                    tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                    axisLine={{ stroke: 'hsl(var(--border))' }}
                  />
                  <ChartTooltip 
                    content={<ChartTooltipContent />}
                    cursor={{ stroke: 'hsl(var(--muted))', strokeWidth: 1 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="checkouts"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={{ r: 3, fill: 'hsl(var(--primary))', strokeWidth: 0 }}
                    activeDot={{ r: 4, fill: 'hsl(var(--primary))' }}
                    name="Check-outs"
                  />
                  <Line
                    type="monotone"
                    dataKey="checkins"
                    stroke="hsl(var(--secondary))"
                    strokeWidth={2}
                    dot={{ r: 3, fill: 'hsl(var(--secondary))', strokeWidth: 0 }}
                    activeDot={{ r: 4, fill: 'hsl(var(--secondary))' }}
                    name="Check-ins"
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          )}
        </CardContent>
      </Card>

      {/* Activities Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Activity Metrics */}
        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              Activity Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <ScoreCard
                title="Total Activities"
                value={activities.length}
                icon={Activity}
                variant="default"
              />
              <ScoreCard
                title="Total Participants"
                value={totalParticipants}
                icon={Users}
                variant="success"
              />
            </div>
            
            <div className="pt-4 border-t">
              <div className="flex justify-between items-center mb-3">
                <h4 className="font-semibold">Recent Activities</h4>
                <Button
                  size="sm"
                  onClick={() => setShowAddActivity(!showAddActivity)}
                  className="text-xs"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add Activity
                </Button>
              </div>
              
              {showAddActivity && (
                <div className="space-y-2 p-3 bg-muted/20 rounded-lg mb-3">
                  <Input
                    placeholder="Activity name..."
                    value={newActivity.name}
                    onChange={(e) => setNewActivity(prev => ({ ...prev, name: e.target.value }))}
                    className="text-sm"
                  />
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      placeholder="Participants"
                      value={newActivity.participants || ''}
                      onChange={(e) => setNewActivity(prev => ({ ...prev, participants: parseInt(e.target.value) || 0 }))}
                      className="text-sm"
                    />
                    <Button size="sm" onClick={addActivity}>Add</Button>
                    <Button size="sm" variant="outline" onClick={() => setShowAddActivity(false)}>Cancel</Button>
                  </div>
                </div>
              )}
              
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {activities.slice(0, 10).map((activity) => (
                  <div key={activity.id} className="flex justify-between items-center p-2 bg-muted/10 rounded">
                    <div className="flex-1">
                      <div className="font-medium text-sm">{activity.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(activity.recorded_at).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="text-sm font-medium text-primary">
                      {activity.participant_count} people
                    </div>
                  </div>
                ))}
                {activities.length === 0 && (
                  <div className="text-center text-muted-foreground py-4">
                    No activities recorded yet
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Equipment Status */}
        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Headphones className="h-5 w-5 text-primary" />
              Equipment Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Availability Gauge */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Availability</span>
                  <span>{equipmentStats.headphonesAvailable} / {equipmentStats.totalHeadphones}</span>
                </div>
                <div className="w-full bg-muted rounded-full h-3">
                  <div 
                    className="bg-primary h-3 rounded-full transition-all duration-300"
                    style={{ 
                      width: `${equipmentStats.totalHeadphones > 0 ? (equipmentStats.headphonesAvailable / equipmentStats.totalHeadphones) * 100 : 0}%` 
                    }}
                  />
                </div>
              </div>

              {/* Peak Usage Times */}
              <div className="space-y-2">
                <h4 className="font-semibold text-sm">Peak Usage Analysis</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Peak Hour</span>
                    <span className="font-medium">
                      {timelineData.reduce((max, current) => 
                        current.checkouts > max.checkouts ? current : max, 
                        { time: '14:00', checkouts: 0 }
                      ).time}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Current Status</span>
                    <span className={`font-medium ${
                      utilizationRate > 80 ? 'text-orange-600' : 
                      utilizationRate > 50 ? 'text-green-600' : 
                      'text-blue-600'
                    }`}>
                      {utilizationRate > 80 ? 'High Demand' : 
                       utilizationRate > 50 ? 'Moderate Use' : 
                       'Low Usage'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Avg. Usage Rate</span>
                    <span className="font-medium">{utilizationRate}%</span>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="pt-4 border-t">
                <h4 className="font-semibold text-sm mb-2">Equipment Alerts</h4>
                {equipmentStats.headphonesAvailable < 10 && (
                  <div className="p-2 bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded text-sm">
                    ⚠️ Low inventory: Only {equipmentStats.headphonesAvailable} headphones available
                  </div>
                )}
                {utilizationRate > 90 && (
                  <div className="p-2 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded text-sm">
                    🔴 High demand: {utilizationRate}% utilization rate
                  </div>
                )}
                {utilizationRate < 30 && (
                  <div className="p-2 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded text-sm">
                    ℹ️ Low usage: Consider promotional activities
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};