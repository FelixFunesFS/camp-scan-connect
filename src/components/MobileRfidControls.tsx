import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Search, 
  Filter, 
  RefreshCw, 
  ChevronDown, 
  ChevronUp,
  Users,
  CheckCircle,
  X,
  Zap
} from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface MobileRfidControlsProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  showOnlyUnassigned: boolean;
  onShowOnlyUnassignedChange: (value: boolean) => void;
  mealPlanFilter: string;
  onMealPlanFilterChange: (value: string) => void;
  arrivalDayFilter: string;
  onArrivalDayFilterChange: (value: string) => void;
  checkInStatusFilter: string;
  onCheckInStatusFilterChange: (value: string) => void;
  viewMode: 'individual' | 'group' | 'site-location';
  onViewModeChange: (mode: 'individual' | 'group' | 'site-location') => void;
  onSync: () => void;
  syncing: boolean;
  totalCount: number;
  assignedCount: number;
  progressPercent: number;
  onBulkActivation: () => void;
  isActivating: boolean;
}

export const MobileRfidControls: React.FC<MobileRfidControlsProps> = ({
  searchTerm,
  onSearchChange,
  showOnlyUnassigned,
  onShowOnlyUnassignedChange,
  mealPlanFilter,
  onMealPlanFilterChange,
  arrivalDayFilter,
  onArrivalDayFilterChange,
  checkInStatusFilter,
  onCheckInStatusFilterChange,
  viewMode,
  onViewModeChange,
  onSync,
  syncing,
  totalCount,
  assignedCount,
  progressPercent,
  onBulkActivation,
  isActivating
}) => {
  const [filtersExpanded, setFiltersExpanded] = useState(false);

  return (
    <div className="space-y-4">
      {/* Progress Overview */}
      <Card>
        <CardContent className="mobile-card">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                <span className="mobile-subtitle">Progress Overview</span>
              </div>
              <Badge variant="outline" className="text-xs">
                {assignedCount}/{totalCount}
              </Badge>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Assigned: {assignedCount}</span>
                <span>{progressPercent.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div 
                  className="bg-primary h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search attendees..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9 touch-target"
          data-search-input="true"
          data-exclude-rfid="true"
        />
        {searchTerm && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onSearchChange('')}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>

      {/* Quick Actions */}
      <div className="mobile-stack">
        <Button
          onClick={onSync}
          disabled={syncing}
          variant="outline"
          className="touch-target flex-1"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
          {syncing ? 'Syncing...' : 'Sync RegFox'}
        </Button>

        <Button
          onClick={onBulkActivation}
          disabled={isActivating || assignedCount === 0}
          variant="default"
          className="touch-target flex-1"
        >
          <Zap className={`h-4 w-4 mr-2 ${isActivating ? 'animate-pulse' : ''}`} />
          {isActivating ? 'Activating...' : `Activate ${assignedCount}`}
        </Button>
        
        <div className="flex items-center gap-2 flex-1">
          <Switch
            id="unassigned-only"
            checked={showOnlyUnassigned}
            onCheckedChange={onShowOnlyUnassignedChange}
          />
          <Label htmlFor="unassigned-only" className="text-sm">
            Unassigned Only
          </Label>
        </div>
      </div>

      {/* View Mode Toggle */}
      <div className="flex bg-muted p-1 rounded-lg">
        <Button
          variant={viewMode === 'individual' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => onViewModeChange('individual')}
          className="flex-1 touch-target text-xs"
        >
          Individual
        </Button>
        <Button
          variant={viewMode === 'group' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => onViewModeChange('group')}
          className="flex-1 touch-target text-xs"
        >
          By Order
        </Button>
        <Button
          variant={viewMode === 'site-location' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => onViewModeChange('site-location')}
          className="flex-1 touch-target text-xs"
        >
          By Site
        </Button>
      </div>

      {/* Collapsible Filters */}
      <Collapsible open={filtersExpanded} onOpenChange={setFiltersExpanded}>
        <CollapsibleTrigger asChild>
          <Button variant="outline" className="w-full touch-target">
            <Filter className="h-4 w-4 mr-2" />
            Advanced Filters
            {filtersExpanded ? (
              <ChevronUp className="h-4 w-4 ml-auto" />
            ) : (
              <ChevronDown className="h-4 w-4 ml-auto" />
            )}
          </Button>
        </CollapsibleTrigger>
        
        <CollapsibleContent className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Meal Plan</Label>
            <Select value={mealPlanFilter} onValueChange={onMealPlanFilterChange}>
              <SelectTrigger className="touch-target">
                <SelectValue placeholder="All meal plans" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Meal Plans</SelectItem>
                <SelectItem value="1">Plan 1</SelectItem>
                <SelectItem value="2">Plan 2</SelectItem>
                <SelectItem value="none">No Plan</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">Arrival Day</Label>
            <Select value={arrivalDayFilter} onValueChange={onArrivalDayFilterChange}>
              <SelectTrigger className="touch-target">
                <SelectValue placeholder="All arrival days" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Days</SelectItem>
                <SelectItem value="early">Thursday (Early)</SelectItem>
                <SelectItem value="standard">Friday (Standard)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">Check-In Status</Label>
            <Select value={checkInStatusFilter} onValueChange={onCheckInStatusFilterChange}>
              <SelectTrigger className="touch-target">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="checked_in">✅ Checked In</SelectItem>
                <SelectItem value="assigned">🟡 Assigned</SelectItem>
                <SelectItem value="unassigned">🔴 Unassigned</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};