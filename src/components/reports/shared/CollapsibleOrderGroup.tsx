import React from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { OrderGroupHeader } from "./OrderGroupHeader";
import { EnhancedAttendee, TableColumn } from "../CheckInManagementTab";

interface CollapsibleOrderGroupProps {
  orderId: string | null;
  attendees: EnhancedAttendee[];
  columns: TableColumn[];
  visibleColumns: string[];
  children: React.ReactNode;
  open: boolean;
  onToggle?: () => void;
  groupProgress?: { assigned: number; total: number; percentage: number };
}

export const CollapsibleOrderGroup: React.FC<CollapsibleOrderGroupProps> = ({
  orderId,
  attendees,
  columns,
  visibleColumns,
  children,
  open,
  onToggle,
  groupProgress
}) => {
  return (
    <>
      <tr>
        <td colSpan={visibleColumns.length} className="p-0">
          <Collapsible open={open} onOpenChange={onToggle}>
            <CollapsibleTrigger asChild>
              <div className="w-full">
                <OrderGroupHeader
                  orderId={orderId}
                  attendees={attendees}
                  isExpanded={open}
                  onToggle={onToggle}
                  groupProgress={groupProgress}
                />
              </div>
            </CollapsibleTrigger>
            
            <CollapsibleContent>
              <div className="bg-muted/10">
                {children}
              </div>
            </CollapsibleContent>
          </Collapsible>
        </td>
      </tr>
    </>
  );
};