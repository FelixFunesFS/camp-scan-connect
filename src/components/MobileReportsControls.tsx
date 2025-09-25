import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  BarChart3, 
  RefreshCw, 
  Download,
  ChevronDown, 
  ChevronUp,
  Expand,
  Minimize,
  Clock
} from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { TimePeriod, formatTimePeriod } from "@/utils/etTimezone";

interface MobileReportsControlsProps {
  selectedPeriod: TimePeriod;
  onPeriodChange: (period: TimePeriod) => void;
  onRefresh: () => void;
  onExport: () => void;
  onExpandAll: () => void;
  onCollapseAll: () => void;
  isRefreshing: boolean;
}

export const MobileReportsControls: React.FC<MobileReportsControlsProps> = ({
  selectedPeriod,
  onPeriodChange,
  onRefresh,
  onExport,
  onExpandAll,
  onCollapseAll,
  isRefreshing
}) => {
  const [actionsExpanded, setActionsExpanded] = useState(false);

  return (
    <div className="space-y-4">
      {/* Header Info */}
      <Card>
        <CardContent className="mobile-card">
          <div className="flex items-center gap-3">
            <BarChart3 className="h-5 w-5 text-primary" />
            <div className="flex-1">
              <h1 className="font-semibold">Admin Reports</h1>
              <p className="text-sm text-muted-foreground">
                Real-time data • {formatTimePeriod(selectedPeriod)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Time Period Selector */}
      <div className="space-y-2">
        <label className="text-sm font-medium flex items-center gap-2">
          <Clock className="h-4 w-4" />
          Time Period
        </label>
        <Select value={selectedPeriod} onValueChange={onPeriodChange}>
          <SelectTrigger className="touch-target">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="yesterday">Yesterday</SelectItem>
            <SelectItem value="this_event">This Event</SelectItem>
            <SelectItem value="all_time">All Time</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Quick Actions */}
      <div className="mobile-stack">
        <Button
          onClick={onRefresh}
          disabled={isRefreshing}
          variant="outline"
          className="touch-target flex-1"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          {isRefreshing ? 'Refreshing...' : 'Refresh'}
        </Button>
        
        <Button
          onClick={onExport}
          variant="secondary"
          className="touch-target flex-1"
        >
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Collapsible Advanced Actions */}
      <Collapsible open={actionsExpanded} onOpenChange={setActionsExpanded}>
        <CollapsibleTrigger asChild>
          <Button variant="outline" className="w-full touch-target">
            <Expand className="h-4 w-4 mr-2" />
            Section Controls
            {actionsExpanded ? (
              <ChevronUp className="h-4 w-4 ml-auto" />
            ) : (
              <ChevronDown className="h-4 w-4 ml-auto" />
            )}
          </Button>
        </CollapsibleTrigger>
        
        <CollapsibleContent className="space-y-3 pt-4">
          <Button
            onClick={onExpandAll}
            variant="outline"
            className="w-full touch-target"
          >
            <Expand className="h-4 w-4 mr-2" />
            Expand All Sections
          </Button>
          
          <Button
            onClick={onCollapseAll}
            variant="outline"
            className="w-full touch-target"
          >
            <Minimize className="h-4 w-4 mr-2" />
            Collapse All Sections
          </Button>
        </CollapsibleContent>
      </Collapsible>

      {/* Auto-refresh Badge */}
      <div className="text-center">
        <Badge variant="outline" className="text-xs">
          Auto-refreshing every 30 seconds ✓
        </Badge>
      </div>
    </div>
  );
};