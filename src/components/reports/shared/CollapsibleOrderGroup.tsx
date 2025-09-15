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
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <div>
          <OrderGroupHeader
            orderId={orderId}
            attendees={attendees}
            isExpanded={isOpen}
            onToggle={() => setIsOpen(!isOpen)}
          />
        </div>
      </CollapsibleTrigger>
      
      <CollapsibleContent>
        <div className="border-l-2 border-muted ml-4">
          {children}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};