import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Search, 
  Filter, 
  X, 
  ChevronDown, 
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  Users,
  Headphones
} from "lucide-react";

export interface QuickFilter {
  id: string;
  label: string;
  count?: number;
  color?: "default" | "success" | "warning" | "destructive";
  icon?: React.ComponentType<{ className?: string }>;
}

export interface FilterOption {
  key: string;
  label: string;
  type: "select" | "search" | "date";
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
  activeQuickFilter?: string;
  onQuickFilterChange?: (filterId: string | null) => void;
  filterOptions?: FilterOption[];
  activeFilters?: ActiveFilter[];
  onFilterChange?: (key: string, value: string) => void;
  onClearFilter?: (key: string) => void;
  onClearAllFilters?: () => void;
  placeholder?: string;
  showAdvancedFilters?: boolean;
}

export const UnifiedSearchFilter: React.FC<UnifiedSearchFilterProps> = ({
  searchValue,
  onSearchChange,
  quickFilters = [],
  activeQuickFilter,
  onQuickFilterChange,
  filterOptions = [],
  activeFilters = [],
  onFilterChange,
  onClearFilter,
  onClearAllFilters,
  placeholder = "Search attendees...",
  showAdvancedFilters = true
}) => {
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);

  // Default quick filters based on common use cases
  const defaultQuickFilters: QuickFilter[] = [
    { 
      id: "all", 
      label: "All", 
      icon: Users,
      color: "default" 
    },
    { 
      id: "activated", 
      label: "Activated", 
      icon: CheckCircle,
      color: "success" 
    },
    { 
      id: "assigned", 
      label: "RFID Assigned", 
      icon: Clock,
      color: "warning" 
    },
    { 
      id: "unassigned", 
      label: "Needs RFID", 
      icon: XCircle,
      color: "destructive" 
    },
    { 
      id: "missing_waiver", 
      label: "Missing Waiver", 
      icon: AlertCircle,
      color: "warning" 
    },
    { 
      id: "has_headphones", 
      label: "Has Headphones", 
      icon: Headphones,
      color: "default" 
    }
  ];

  const displayQuickFilters = quickFilters.length > 0 ? quickFilters : defaultQuickFilters;

  const hasActiveFilters = activeFilters.length > 0;

  return (
    <div className="space-y-4">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={placeholder}
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10 pr-4"
        />
        {searchValue && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onSearchChange("")}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>

      {/* Quick Filter Chips */}
      {displayQuickFilters.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {displayQuickFilters.map((filter) => (
            <Button
              key={filter.id}
              variant={activeQuickFilter === filter.id ? "default" : "outline"}
              size="sm"
              onClick={() => onQuickFilterChange?.(
                activeQuickFilter === filter.id ? null : filter.id
              )}
              className="h-8 text-xs gap-1.5"
            >
              {filter.icon && <filter.icon className="h-3 w-3" />}
              {filter.label}
              {filter.count !== undefined && (
                <Badge variant="secondary" className="ml-1 text-xs">
                  {filter.count}
                </Badge>
              )}
            </Button>
          ))}
        </div>
      )}

      {/* Advanced Filters */}
      {showAdvancedFilters && filterOptions.length > 0 && (
        <Collapsible open={isAdvancedOpen} onOpenChange={setIsAdvancedOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="outline" size="sm" className="w-full sm:w-auto">
              <Filter className="h-4 w-4 mr-2" />
              Advanced Filters
              {hasActiveFilters && (
                <Badge variant="secondary" className="ml-2">
                  {activeFilters.length}
                </Badge>
              )}
              <ChevronDown className="h-4 w-4 ml-2" />
            </Button>
          </CollapsibleTrigger>
          
          <CollapsibleContent className="space-y-4 mt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4 border rounded-lg bg-muted/30">
              {filterOptions.map((option) => (
                <div key={option.key} className="space-y-2">
                  <label className="text-sm font-medium">{option.label}</label>
                  {option.type === "select" && option.options && (
                    <Select
                      value={activeFilters.find(f => f.key === option.key)?.value || ""}
                      onValueChange={(value) => onFilterChange?.(option.key, value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={`Select ${option.label.toLowerCase()}`} />
                      </SelectTrigger>
                      <SelectContent>
                        {option.options.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  {option.type === "search" && (
                    <Input
                      placeholder={`Filter by ${option.label.toLowerCase()}`}
                      value={activeFilters.find(f => f.key === option.key)?.value || ""}
                      onChange={(e) => onFilterChange?.(option.key, e.target.value)}
                    />
                  )}
                </div>
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Active Filters */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">Active filters:</span>
          {activeFilters.map((filter) => (
            <Badge key={filter.key} variant="secondary" className="gap-1">
              {filter.label}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onClearFilter?.(filter.key)}
                className="h-3 w-3 p-0 hover:bg-transparent"
              >
                <X className="h-2 w-2" />
              </Button>
            </Badge>
          ))}
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearAllFilters}
            className="text-xs h-6"
          >
            Clear all
          </Button>
        </div>
      )}
    </div>
  );
};