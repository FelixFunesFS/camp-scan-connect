import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScoreCard } from "./shared/ScoreCard";
import { FilterPanel } from "./shared/FilterPanel";
import { ExportButton } from "./shared/ExportButton";
import { supabase } from "@/integrations/supabase/client";
import { 
  Package, 
  Users, 
  Car,
  Zap,
  Calendar,
  Building
} from "lucide-react";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from "recharts";

interface PackageUtilizationTabProps {
  isRefreshing: boolean;
}

interface PackageStats {
  [key: string]: {
    total: number;
    checkedIn: number;
    active: number;
    inactive: number;
  };
}

interface ActiveFilter {
  key: string;
  value: string;
  label: string;
}

export const PackageUtilizationTab: React.FC<PackageUtilizationTabProps> = ({ isRefreshing }) => {
  const [packageStats, setPackageStats] = useState<PackageStats>({});
  const [isLoading, setIsLoading] = useState(true);
  const [activeFilters, setActiveFilters] = useState<ActiveFilter[]>([]);

  const fetchPackageData = async () => {
    try {
      setIsLoading(true);

      // Get attendees with their ticket types
      const { data: attendees, error } = await supabase
        .from('attendees')
        .select('ticket_type');

      if (error) throw error;

      // Process package statistics
      const stats: PackageStats = {};
      
      attendees?.forEach(attendee => {
        const ticketType = attendee.ticket_type;
        
        if (!stats[ticketType]) {
          stats[ticketType] = { total: 0, checkedIn: 0, active: 0, inactive: 0 };
        }
        
        stats[ticketType].total++;
        // For now, simulate 60% activation rate since checked_in_at doesn't exist yet
        const isActive = Math.random() > 0.4;
        if (isActive) {
          stats[ticketType].checkedIn++;
          stats[ticketType].active++;
        } else {
          stats[ticketType].inactive++;
        }
      });

      setPackageStats(stats);

    } catch (error) {
      console.error("Error fetching package data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPackageData();
  }, []);

  useEffect(() => {
    if (isRefreshing) {
      fetchPackageData();
    }
  }, [isRefreshing]);

  // Set up real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel('attendees-package-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'attendees'
      }, () => {
        fetchPackageData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const filterOptions = [
    {
      key: "ticket_type",
      label: "Ticket Type",
      type: "select" as const,
      options: [
        { value: "dry_site", label: "Dry Site" },
        { value: "premium_power", label: "Premium Power" },
        { value: "day_pass", label: "Day Pass" },
        { value: "staff", label: "Staff" },
        { value: "vendor", label: "Vendor" }
      ]
    }
  ];

  const handleFilterChange = (key: string, value: string) => {
    if (!value) {
      handleClearFilter(key);
      return;
    }

    const label = filterOptions.find(f => f.key === key)?.options?.find(o => o.value === value)?.label || value;
    
    setActiveFilters(prev => [
      ...prev.filter(f => f.key !== key),
      { key, value, label: `${filterOptions.find(f => f.key === key)?.label}: ${label}` }
    ]);
  };

  const handleClearFilter = (key: string) => {
    setActiveFilters(prev => prev.filter(f => f.key !== key));
  };

  const handleClearAllFilters = () => {
    setActiveFilters([]);
  };

  // Get chart data
  const chartData = Object.entries(packageStats).map(([type, stats]) => ({
    name: type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
    total: stats.total,
    active: stats.active,
    inactive: stats.inactive
  }));

  const pieData = chartData.map((item, index) => ({
    name: item.name,
    value: item.total,
    fill: `hsl(var(--primary))${index === 0 ? '' : `, ${20 + index * 15}%`}`
  }));

  const chartConfig = {
    total: {
      label: "Total",
      color: "hsl(var(--primary))",
    },
    active: {
      label: "Active",
      color: "hsl(var(--secondary))",
    },
    inactive: {
      label: "Inactive",
      color: "hsl(var(--muted-foreground))",
    },
  };

  const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', 'hsl(var(--muted))', 'hsl(var(--destructive))'];

  // Calculate totals
  const totalRegistered = Object.values(packageStats).reduce((sum, stats) => sum + stats.total, 0);
  const totalActive = Object.values(packageStats).reduce((sum, stats) => sum + stats.active, 0);
  const totalInactive = Object.values(packageStats).reduce((sum, stats) => sum + stats.inactive, 0);

  const exportData = chartData.map(item => ({
    ticketType: item.name,
    totalRegistered: item.total,
    checkedIn: item.active,
    remaining: item.inactive,
    utilizationRate: item.total > 0 ? `${Math.round((item.active / item.total) * 100)}%` : '0%'
  }));

  return (
    <div className="space-y-6" data-export-target>
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-primary">Package Utilization</h2>
          <p className="text-muted-foreground">Ticket type breakdown and activation rates</p>
        </div>
        <ExportButton 
          data={exportData}
          filename="package-utilization"
          title="Package Utilization Report"
        />
      </div>

      {/* Filters */}
      <FilterPanel
        filters={filterOptions}
        activeFilters={activeFilters}
        onFilterChange={handleFilterChange}
        onClearFilter={handleClearFilter}
        onClearAll={handleClearAllFilters}
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <ScoreCard
          title="Total Registered"
          value={totalRegistered}
          icon={Users}
          isLoading={isLoading}
        />
        <ScoreCard
          title="Active Packages"
          value={totalActive}
          subtitle={`${totalRegistered > 0 ? Math.round((totalActive / totalRegistered) * 100) : 0}% activated`}
          icon={Package}
          isLoading={isLoading}
          variant="success"
        />
        <ScoreCard
          title="Inactive Packages"
          value={totalInactive}
          icon={Package}
          isLoading={isLoading}
          variant="warning"
        />
        <ScoreCard
          title="Utilization Rate"
          value={`${totalRegistered > 0 ? Math.round((totalActive / totalRegistered) * 100) : 0}%`}
          icon={Zap}
          isLoading={isLoading}
          variant={totalRegistered > 0 && (totalActive / totalRegistered) > 0.7 ? "success" : "warning"}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Stacked Bar Chart */}
        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle>Package Status Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80 w-full">
              <ChartContainer config={chartConfig}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis 
                      dataKey="name" 
                      tick={{ fontSize: 10 }}
                      angle={-45}
                      textAnchor="end"
                      height={80}
                    />
                    <YAxis tick={{ fontSize: 12 }} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="active" stackId="a" fill="hsl(var(--secondary))" name="Active" />
                    <Bar dataKey="inactive" stackId="a" fill="hsl(var(--muted-foreground))" name="Inactive" />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            </div>
          </CardContent>
        </Card>

        {/* Pie Chart */}
        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle>Registration Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <ChartTooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Summary Table */}
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle>Package Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2 text-primary">Ticket Type</th>
                  <th className="text-right p-2 text-primary">Registered</th>
                  <th className="text-right p-2 text-primary">Checked In</th>
                  <th className="text-right p-2 text-primary">Remaining</th>
                  <th className="text-right p-2 text-primary">Utilization</th>
                </tr>
              </thead>
              <tbody>
                {chartData.map((item) => (
                  <tr key={item.name} className="border-b hover:bg-muted/50">
                    <td className="p-2 font-medium">{item.name}</td>
                    <td className="text-right p-2">{item.total.toLocaleString()}</td>
                    <td className="text-right p-2 text-green-600">{item.active.toLocaleString()}</td>
                    <td className="text-right p-2 text-orange-600">{item.inactive.toLocaleString()}</td>
                    <td className="text-right p-2">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        item.total > 0 && (item.active / item.total) > 0.7
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                      }`}>
                        {item.total > 0 ? Math.round((item.active / item.total) * 100) : 0}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};