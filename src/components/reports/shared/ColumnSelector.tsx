import React from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Settings, Eye, EyeOff } from "lucide-react";
import { TableColumn } from "../CheckInManagementTab";
import { useIsMobile } from "@/hooks/use-mobile";

interface ColumnSelectorProps {
  columns: TableColumn[];
  visibleColumns: string[];
  onVisibleColumnsChange: (columns: string[]) => void;
}

export const ColumnSelector: React.FC<ColumnSelectorProps> = ({
  columns,
  visibleColumns,
  onVisibleColumnsChange
}) => {
  const isMobile = useIsMobile();

  const handleColumnToggle = (columnKey: string, checked: boolean) => {
    if (checked) {
      onVisibleColumnsChange([...visibleColumns, columnKey]);
    } else {
      onVisibleColumnsChange(visibleColumns.filter(col => col !== columnKey));
    }
  };

  const handleSelectAll = () => {
    const relevantColumns = isMobile 
      ? columns.filter(col => col.mobile !== false)
      : columns.filter(col => col.desktop !== false);
    onVisibleColumnsChange(relevantColumns.map(col => col.key));
  };

  const handleDeselectAll = () => {
    // Keep at least the name column visible
    onVisibleColumnsChange(['first_name']);
  };

  // Filter columns based on device type
  const relevantColumns = isMobile 
    ? columns.filter(col => col.mobile !== false)
    : columns.filter(col => col.desktop !== false);

  const visibleCount = visibleColumns.length;
  const totalCount = relevantColumns.length;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Settings className="h-4 w-4" />
          Columns ({visibleCount}/{totalCount})
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-sm">Select Columns</h4>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSelectAll}
                className="h-8 px-2 text-xs"
              >
                <Eye className="h-3 w-3 mr-1" />
                All
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDeselectAll}
                className="h-8 px-2 text-xs"
              >
                <EyeOff className="h-3 w-3 mr-1" />
                Clear
              </Button>
            </div>
          </div>
        </div>
        <div className="p-4 space-y-3 max-h-80 overflow-y-auto">
          {relevantColumns.map((column) => {
            const isVisible = visibleColumns.includes(column.key);
            const isNameColumn = column.key === 'first_name';
            
            return (
              <div key={column.key} className="flex items-center space-x-2">
                <Checkbox
                  id={column.key}
                  checked={isVisible}
                  onCheckedChange={(checked) => handleColumnToggle(column.key, checked as boolean)}
                  disabled={isNameColumn && isVisible} // Prevent unchecking the name column
                />
                <Label 
                  htmlFor={column.key} 
                  className={`text-sm flex-1 cursor-pointer ${
                    isNameColumn ? 'text-muted-foreground' : ''
                  }`}
                >
                  {column.label}
                  {isNameColumn && (
                    <span className="text-xs text-muted-foreground ml-1">
                      (required)
                    </span>
                  )}
                </Label>
              </div>
            );
          })}
        </div>
        <div className="p-4 border-t bg-muted/20">
          <p className="text-xs text-muted-foreground">
            {isMobile 
              ? "Mobile view shows selected columns in card format" 
              : "Desktop view shows selected columns in table format"
            }
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
};
