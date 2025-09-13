import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { X, Filter } from "lucide-react";

interface FilterOption {
  key: string;
  label: string;
  type: "select" | "search" | "date";
  options?: { value: string; label: string }[];
  placeholder?: string;
}

interface ActiveFilter {
  key: string;
  value: string;
  label: string;
}

interface FilterPanelProps {
  filters: FilterOption[];
  activeFilters: ActiveFilter[];
  onFilterChange: (key: string, value: string) => void;
  onClearFilter: (key: string) => void;
  onClearAll: () => void;
  className?: string;
}

export const FilterPanel: React.FC<FilterPanelProps> = ({
  filters,
  activeFilters,
  onFilterChange,
  onClearFilter,
  onClearAll,
  className = ""
}) => {
  return (
    <Card className={`border-primary/20 ${className}`}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Filter className="h-4 w-4" />
          Filters
          {activeFilters.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearAll}
              className="text-xs h-6 px-2 ml-auto"
            >
              Clear All
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filter Controls */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filters.map((filter) => (
            <div key={filter.key} className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">
                {filter.label}
              </label>
              {filter.type === "select" && filter.options ? (
                <Select
                  value={activeFilters.find(f => f.key === filter.key)?.value || ""}
                  onValueChange={(value) => onFilterChange(filter.key, value)}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder={filter.placeholder || "All"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All</SelectItem>
                    {filter.options.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : filter.type === "search" ? (
                <Input
                  placeholder={filter.placeholder || "Search..."}
                  value={activeFilters.find(f => f.key === filter.key)?.value || ""}
                  onChange={(e) => onFilterChange(filter.key, e.target.value)}
                  className="h-8 text-xs"
                />
              ) : filter.type === "date" ? (
                <Input
                  type="date"
                  value={activeFilters.find(f => f.key === filter.key)?.value || ""}
                  onChange={(e) => onFilterChange(filter.key, e.target.value)}
                  className="h-8 text-xs"
                />
              ) : null}
            </div>
          ))}
        </div>

        {/* Active Filters */}
        {activeFilters.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-2 border-t">
            {activeFilters.map((filter) => (
              <Badge
                key={`${filter.key}-${filter.value}`}
                variant="secondary"
                className="text-xs flex items-center gap-1 bg-primary/10 text-primary hover:bg-primary/20"
              >
                <span>{filter.label}: {filter.value}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onClearFilter(filter.key)}
                  className="h-3 w-3 p-0 hover:bg-transparent"
                >
                  <X className="h-2 w-2" />
                </Button>
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};