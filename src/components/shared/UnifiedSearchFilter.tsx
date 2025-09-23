import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Search, X, ChevronDown, ChevronRight, Filter } from "lucide-react";

export interface QuickFilter {
  key: string;
  label: string;
  count?: number;
}

export interface FilterOption {
  key: string;
  label: string;
  type: 'select' | 'text' | 'date';
  options?: { value: string; label: string }[];
}

export interface ActiveFilter {
  key: string;
  value: string;
  label: string;
}

interface UnifiedSearchFilterProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  quickFilters?: QuickFilter[];
  activeQuickFilters?: string[];
  onQuickFilterChange?: (filterKey: string, active: boolean) => void;
  filterOptions?: FilterOption[];
  activeFilters?: ActiveFilter[];
  onFilterChange?: (filterKey: string, value: string) => void;
  onClearFilter?: (filterKey: string) => void;
  onClearAllFilters?: () => void;
  showAdvancedFilters?: boolean;
  placeholder?: string;
}

export const UnifiedSearchFilter: React.FC<UnifiedSearchFilterProps> = ({
  searchValue,
  onSearchChange,
  quickFilters = [],
  activeQuickFilters = [],
  onQuickFilterChange,
  filterOptions = [],
  activeFilters = [],
  onFilterChange,
  onClearFilter,
  onClearAllFilters,
  showAdvancedFilters = false,
  placeholder = "Search attendees..."
}) => {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleClearSearch = () => {
    onSearchChange('');
  };

  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        {/* Main Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={placeholder}
            className="pl-10 pr-10"
            data-search-input="true"
            data-exclude-rfid="true"
          />
          {searchValue && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearSearch}
              className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>

        {/* Quick Filters */}
        {quickFilters.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {quickFilters.map((filter) => (
              <Button
                key={filter.key}
                variant={activeQuickFilters.includes(filter.key) ? "default" : "outline"}
                size="sm"
                onClick={() => onQuickFilterChange?.(filter.key, !activeQuickFilters.includes(filter.key))}
                className="text-xs touch-target"
              >
                {filter.label}
                {filter.count !== undefined && (
                  <Badge variant="secondary" className="ml-1 text-xs px-1">
                    {filter.count}
                  </Badge>
                )}
              </Button>
            ))}
          </div>
        )}

        {/* Advanced Filters */}
        {showAdvancedFilters && (
          <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="w-full justify-between">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  Advanced Filters
                </div>
                {showAdvanced ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-3 pt-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {filterOptions.map((option) => (
                  <div key={option.key} className="space-y-1">
                    <label className="text-sm font-medium">{option.label}</label>
                    <Input
                      placeholder={`Filter by ${option.label.toLowerCase()}`}
                      onChange={(e) => onFilterChange?.(option.key, e.target.value)}
                      className="text-sm"
                      data-search-input="true"
                      data-exclude-rfid="true"
                    />
                  </div>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Active Filters */}
        {activeFilters.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Active Filters:</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClearAllFilters}
                className="text-xs"
              >
                Clear All
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {activeFilters.map((filter) => (
                <Badge key={filter.key} variant="secondary" className="text-xs">
                  {filter.label}: {filter.value}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onClearFilter?.(filter.key)}
                    className="ml-1 h-3 w-3 p-0 hover:bg-transparent"
                  >
                    <X className="h-2 w-2" />
                  </Button>
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};