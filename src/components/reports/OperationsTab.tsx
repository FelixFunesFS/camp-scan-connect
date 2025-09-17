import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ScoreCard } from "./shared/ScoreCard";
import { ExportButton } from "./shared/ExportButton";
import { supabase } from "@/integrations/supabase/client";
import { 
  Utensils, 
  Coffee, 
  Headphones,
  Activity,
  Users,
  TrendingUp,
  Clock,
  Plus,
  Edit2,
  Trash2,
  Save,
  X,
  Eye,
  EyeOff,
  Info
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
  AreaChart,
  Area
} from "recharts";

interface OperationsTabProps {
  isRefreshing: boolean;
}

interface OperationsData {
  // Food & Beverage
  totalMeals: number;
  totalDrinks: number;
  breakfastServed: number;
  lunchServed: number;
  dinnerServed: number;
  
  // Equipment
  headphonesCheckedOut: number;
  headphonesAvailable: number;
  totalHeadphones: number;
  
  // Activities
  activities: ActivityData[];
  totalParticipants: number;
  
  // Timeline data
  hourlyData: HourlyData[];
  timelineData: TimelineData[];
}

interface ActivityData {
  id: string;
  name: string;
  participant_count: number;
  recorded_at: string;
  notes?: string;
}

interface HourlyData {
  hour: string;
  meals: number;
  drinks: number;
  timestamp: string;
}

interface TimelineData {
  time: string;
  checkouts: number;
  checkins: number;
}

export const OperationsTab: React.FC<OperationsTabProps> = ({ isRefreshing }) => {
  const [data, setData] = useState<OperationsData>({
    totalMeals: 0,
    totalDrinks: 0,
    breakfastServed: 0,
    lunchServed: 0,
    dinnerServed: 0,
    headphonesCheckedOut: 0,
    headphonesAvailable: 0,
    totalHeadphones: 50,
    activities: [],
    totalParticipants: 0,
    hourlyData: [],
    timelineData: []
  });
  const [isLoading, setIsLoading] = useState(true);
  const [visibleSeries, setVisibleSeries] = useState({
    meals: true,
    drinks: true,
    checkouts: true,
    checkins: true
  });
  
  // Activity management state
  const [newActivity, setNewActivity] = useState({ name: '', participants: 0 });
  const [showAddActivity, setShowAddActivity] = useState(false);
  const [editingActivity, setEditingActivity] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: '', participants: 0 });
  const [deletingActivity, setDeletingActivity] = useState<string | null>(null);
  const [isActionLoading, setIsActionLoading] = useState(false);

  const fetchOperationsData = async () => {
    try {
      setIsLoading(true);

      // Get station transactions for all operational data
      const { data: transactions, error: transactionsError } = await supabase
        .from('station_transactions')
        .select('*');

      if (transactionsError) throw transactionsError;

      // Get activities data
      const { data: activities, error: activitiesError } = await supabase
        .from('activities')
        .select('*')
        .order('recorded_at', { ascending: false })
        .limit(20);

      if (activitiesError) throw activitiesError;

      // Process Food & Beverage data
      const mealTransactions = transactions?.filter(t => t.station_type === 'meal') || [];
      const drinkTransactions = transactions?.filter(t => t.station_type === 'drinks') || [];
      
      const totalMeals = mealTransactions.length;
      const totalDrinks = drinkTransactions.length;

      // Classify meals by time of day
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

      // Process Equipment data
      const headphoneTransactions = transactions?.filter(t => t.station_type === 'headphones') || [];
      const checkoutTransactions = headphoneTransactions?.filter(t => t.transaction_type === 'headphone_checkout') || [];
      const checkinTransactions = headphoneTransactions?.filter(t => t.transaction_type === 'headphone_checkin') || [];
      
      const headphonesCheckedOut = Math.max(0, checkoutTransactions.length - checkinTransactions.length);
      const totalHeadphones = 50;
      const headphonesAvailable = Math.max(0, totalHeadphones - headphonesCheckedOut);

      // Process Activities data
      const totalParticipants = (activities || []).reduce((sum, activity) => sum + activity.participant_count, 0);

      // Generate hourly F&B data
      const hourlyMap = new Map<string, { meals: number; drinks: number }>();
      
      for (let i = 0; i < 24; i++) {
        const hour = i.toString().padStart(2, '0') + ':00';
        hourlyMap.set(hour, { meals: 0, drinks: 0 });
      }

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

      // Generate equipment timeline data
      const timelineMap = new Map<string, { checkouts: number; checkins: number }>();
      
      for (let i = 0; i < 24; i++) {
        const hour = i.toString().padStart(2, '0') + ':00';
        timelineMap.set(hour, { checkouts: 0, checkins: 0 });
      }

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

      setData({
        totalMeals,
        totalDrinks,
        breakfastServed,
        lunchServed,
        dinnerServed,
        headphonesCheckedOut: Math.max(0, headphonesCheckedOut),
        headphonesAvailable: Math.max(0, headphonesAvailable),
        totalHeadphones,
        activities: activities || [],
        totalParticipants,
        hourlyData: hourlyArray,
        timelineData: timelineArray
      });

    } catch (error) {
      console.error("Error fetching operations data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Activity management functions
  const addActivity = async () => {
    if (!newActivity.name.trim() || newActivity.participants <= 0) return;

    try {
      const { data: newActivityRecord, error } = await supabase
        .from('activities')
        .insert({
          name: newActivity.name,
          participant_count: newActivity.participants,
          notes: 'Manually logged via operations dashboard'
        })
        .select()
        .single();

      if (error) throw error;

      if (newActivityRecord) {
        setData(prev => ({
          ...prev,
          activities: [newActivityRecord, ...prev.activities],
          totalParticipants: prev.totalParticipants + newActivity.participants
        }));
        setNewActivity({ name: '', participants: 0 });
        setShowAddActivity(false);
      }
    } catch (error) {
      console.error("Error adding activity:", error);
    }
  };

  const startEditing = (activity: ActivityData) => {
    setEditingActivity(activity.id);
    setEditForm({ name: activity.name, participants: activity.participant_count });
  };

  const cancelEditing = () => {
    setEditingActivity(null);
    setEditForm({ name: '', participants: 0 });
  };

  const saveActivity = async (activityId: string) => {
    if (!editForm.name.trim() || editForm.participants <= 0) return;

    try {
      setIsActionLoading(true);
      const { data: updatedActivity, error } = await supabase
        .from('activities')
        .update({
          name: editForm.name,
          participant_count: editForm.participants
        })
        .eq('id', activityId)
        .select()
        .single();

      if (error) throw error;

      if (updatedActivity) {
        setData(prev => ({
          ...prev,
          activities: prev.activities.map(activity => 
            activity.id === activityId ? updatedActivity : activity
          )
        }));
        setEditingActivity(null);
        setEditForm({ name: '', participants: 0 });
      }
    } catch (error) {
      console.error("Error updating activity:", error);
    } finally {
      setIsActionLoading(false);
    }
  };

  const deleteActivity = async (activityId: string) => {
    try {
      setIsActionLoading(true);
      const { error } = await supabase
        .from('activities')
        .delete()
        .eq('id', activityId);

      if (error) throw error;

      setData(prev => ({
        ...prev,
        activities: prev.activities.filter(activity => activity.id !== activityId)
      }));
      setDeletingActivity(null);
    } catch (error) {
      console.error("Error deleting activity:", error);
    } finally {
      setIsActionLoading(false);
    }
  };

  useEffect(() => {
    fetchOperationsData();
  }, []);

  useEffect(() => {
    if (isRefreshing) {
      fetchOperationsData();
    }
  }, [isRefreshing]);

  // Set up real-time subscription
  useEffect(() => {
    const transactionsChannel = supabase
      .channel('operations-transactions')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'station_transactions'
      }, () => {
        fetchOperationsData();
      })
      .subscribe();

    const activitiesChannel = supabase
      .channel('operations-activities')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'activities'
      }, () => {
        fetchOperationsData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(transactionsChannel);
      supabase.removeChannel(activitiesChannel);
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
    checkouts: {
      label: "Check-outs",
      color: "hsl(var(--primary))",
    },
    checkins: {
      label: "Check-ins",
      color: "hsl(var(--secondary))",
    },
  };

  const toggleSeries = (series: keyof typeof visibleSeries) => {
    setVisibleSeries(prev => ({ ...prev, [series]: !prev[series] }));
  };

  const utilizationRate = data.totalHeadphones > 0 
    ? Math.round((data.headphonesCheckedOut / data.totalHeadphones) * 100)
    : 0;

  const exportData = [
    { metric: "Total Meals Served", value: data.totalMeals },
    { metric: "Total Drinks Served", value: data.totalDrinks },
    { metric: "Breakfast Meals", value: data.breakfastServed },
    { metric: "Lunch Meals", value: data.lunchServed },
    { metric: "Dinner Meals", value: data.dinnerServed },
    { metric: "Headphones Total", value: data.totalHeadphones },
    { metric: "Headphones Checked Out", value: data.headphonesCheckedOut },
    { metric: "Headphones Available", value: data.headphonesAvailable },
    { metric: "Equipment Utilization Rate", value: `${utilizationRate}%` },
    { metric: "Total Activities", value: data.activities.length },
    { metric: "Total Activity Participants", value: data.totalParticipants },
    ...data.activities.map(activity => ({
      activityName: activity.name,
      participants: activity.participant_count,
      recordedAt: new Date(activity.recorded_at).toLocaleString()
    }))
  ];

  return (
    <TooltipProvider>
      <div className="space-y-6" data-export-target>
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-primary">🍽️ Operations</h2>
            <p className="text-muted-foreground">Food service, equipment, and activity management</p>
          </div>
          <ExportButton 
            data={exportData}
            filename="operations-report"
            title="Operations Report"
          />
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Tooltip>
            <TooltipTrigger asChild>
              <div>
                <ScoreCard
                  title="Meals Served"
                  value={data.totalMeals}
                  icon={Utensils}
                  isLoading={isLoading}
                  variant="success"
                />
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Total meals served across all meal periods</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <div>
                <ScoreCard
                  title="Drinks Served"
                  value={data.totalDrinks}
                  icon={Coffee}
                  isLoading={isLoading}
                  variant="success"
                />
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Total beverages served at the bar</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <div>
                <ScoreCard
                  title="Headphones Out"
                  value={data.headphonesCheckedOut}
                  subtitle={`${utilizationRate}% utilization`}
                  icon={Headphones}
                  isLoading={isLoading}
                  variant={utilizationRate > 80 ? "warning" : "success"}
                />
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Currently checked out headphones and utilization rate</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <div>
                <ScoreCard
                  title="Available"
                  value={data.headphonesAvailable}
                  subtitle="headphones"
                  icon={Headphones}
                  isLoading={isLoading}
                  variant={data.headphonesAvailable < 20 ? "error" : "success"}
                />
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Headphones available for checkout</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <div>
                <ScoreCard
                  title="Activities"
                  value={data.activities.length}
                  icon={Activity}
                  isLoading={isLoading}
                  variant="default"
                />
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Total number of logged activities</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <div>
                <ScoreCard
                  title="Participants"
                  value={data.totalParticipants}
                  subtitle="total"
                  icon={Users}
                  isLoading={isLoading}
                  variant="success"
                />
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Total participants across all activities</p>
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Food & Beverage Timeline */}
          <Card className="border-primary/20">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-primary" />
                  F&B Service Timeline
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Toggle data series visibility</p>
                    </TooltipContent>
                  </Tooltip>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant={visibleSeries.meals ? "default" : "outline"}
                      onClick={() => toggleSeries('meals')}
                      className="h-6 px-2 text-xs"
                    >
                      {visibleSeries.meals ? <Eye className="h-3 w-3 mr-1" /> : <EyeOff className="h-3 w-3 mr-1" />}
                      Meals
                    </Button>
                    <Button
                      size="sm"
                      variant={visibleSeries.drinks ? "default" : "outline"}
                      onClick={() => toggleSeries('drinks')}
                      className="h-6 px-2 text-xs"
                    >
                      {visibleSeries.drinks ? <Eye className="h-3 w-3 mr-1" /> : <EyeOff className="h-3 w-3 mr-1" />}
                      Drinks
                    </Button>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-[240px] md:h-[320px] w-full">
                <ChartContainer config={chartConfig}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data.hourlyData} margin={{ top: 20, right: 20, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                      <XAxis 
                        dataKey="hour" 
                        tick={{ fontSize: 10 }}
                        interval={2}
                      />
                      <YAxis tick={{ fontSize: 12 }} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      {visibleSeries.meals && (
                        <Area
                          type="monotone"
                          dataKey="meals"
                          stackId="1"
                          stroke="hsl(var(--primary))"
                          fill="hsl(var(--primary))"
                          fillOpacity={0.6}
                          name="Meals"
                        />
                      )}
                      {visibleSeries.drinks && (
                        <Area
                          type="monotone"
                          dataKey="drinks"
                          stackId="1"
                          stroke="hsl(var(--secondary))"
                          fill="hsl(var(--secondary))"
                          fillOpacity={0.6}
                          name="Drinks"
                        />
                      )}
                    </AreaChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </div>
            </CardContent>
          </Card>

          {/* Equipment Timeline */}
          <Card className="border-primary/20">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Headphones className="h-5 w-5 text-primary" />
                  Equipment Activity
                </CardTitle>
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant={visibleSeries.checkouts ? "default" : "outline"}
                    onClick={() => toggleSeries('checkouts')}
                    className="h-6 px-2 text-xs"
                  >
                    {visibleSeries.checkouts ? <Eye className="h-3 w-3 mr-1" /> : <EyeOff className="h-3 w-3 mr-1" />}
                    Out
                  </Button>
                  <Button
                    size="sm"
                    variant={visibleSeries.checkins ? "default" : "outline"}
                    onClick={() => toggleSeries('checkins')}
                    className="h-6 px-2 text-xs"
                  >
                    {visibleSeries.checkins ? <Eye className="h-3 w-3 mr-1" /> : <EyeOff className="h-3 w-3 mr-1" />}
                    In
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-[240px] md:h-[320px] w-full">
                <ChartContainer config={chartConfig}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data.timelineData} margin={{ top: 20, right: 15, left: 5, bottom: 30 }}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                      <XAxis 
                        dataKey="time" 
                        tick={{ fontSize: 10 }}
                        interval={4}
                      />
                      <YAxis tick={{ fontSize: 11 }} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      {visibleSeries.checkouts && (
                        <Line
                          type="monotone"
                          dataKey="checkouts"
                          stroke="hsl(var(--primary))"
                          strokeWidth={2}
                          dot={{ r: 3, fill: 'hsl(var(--primary))' }}
                          name="Check-outs"
                        />
                      )}
                      {visibleSeries.checkins && (
                        <Line
                          type="monotone"
                          dataKey="checkins"
                          stroke="hsl(var(--secondary))"
                          strokeWidth={2}
                          dot={{ r: 3, fill: 'hsl(var(--secondary))' }}
                          name="Check-ins"
                        />
                      )}
                    </LineChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Activities Management */}
        <Card className="border-primary/20">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" />
                Activity Management
              </CardTitle>
              <Button
                size="sm"
                onClick={() => setShowAddActivity(!showAddActivity)}
                className="text-xs"
              >
                <Plus className="h-3 w-3 mr-1" />
                Add Activity
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {showAddActivity && (
              <div className="space-y-2 p-3 bg-muted/20 rounded-lg">
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
              {data.activities.slice(0, 10).map((activity) => (
                <div key={activity.id} className="flex justify-between items-center p-2 bg-muted/10 rounded group">
                  {editingActivity === activity.id ? (
                    <div className="flex-1 flex gap-2">
                      <Input
                        value={editForm.name}
                        onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                        className="text-sm"
                      />
                      <Input
                        type="number"
                        value={editForm.participants}
                        onChange={(e) => setEditForm(prev => ({ ...prev, participants: parseInt(e.target.value) || 0 }))}
                        className="text-sm w-24"
                      />
                      <Button
                        size="sm"
                        onClick={() => saveActivity(activity.id)}
                        disabled={isActionLoading}
                        className="px-2"
                      >
                        <Save className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={cancelEditing}
                        className="px-2"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div className="flex-1">
                        <div className="font-medium text-sm">{activity.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {activity.participant_count} participants • {new Date(activity.recorded_at).toLocaleDateString()}
                        </div>
                      </div>
                      {deletingActivity === activity.id ? (
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => deleteActivity(activity.id)}
                            disabled={isActionLoading}
                            className="px-2 text-xs"
                          >
                            Confirm
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setDeletingActivity(null)}
                            className="px-2 text-xs"
                          >
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => startEditing(activity)}
                            className="px-2"
                          >
                            <Edit2 className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setDeletingActivity(activity.id)}
                            className="px-2 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
};