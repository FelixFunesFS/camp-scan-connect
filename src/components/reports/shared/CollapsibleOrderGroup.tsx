import React, { useState } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { OrderGroupHeader } from "./OrderGroupHeader";
import { EnhancedAttendee, TableColumn } from "../CheckInManagementTab";

interface CollapsibleOrderGroupProps {
  orderId: string | null;
  attendees: EnhancedAttendee[];
  columns: TableColumn[];
  visibleColumns: string[];
  children: React.ReactNode;
  defaultOpen?: boolean;
}

export const CollapsibleOrderGroup: React.FC<CollapsibleOrderGroupProps> = ({
  orderId,
  attendees,
  columns,
  visibleColumns,
  children,
  defaultOpen = false
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <>
      <tr>
        <td colSpan={visibleColumns.length} className="p-0">
          <Collapsible open={isOpen} onOpenChange={setIsOpen}>
            <CollapsibleTrigger asChild>
              <div className="w-full">
                <OrderGroupHeader
                  orderId={orderId}
                  attendees={attendees}
                  isExpanded={isOpen}
                  onToggle={() => setIsOpen(!isOpen)}
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