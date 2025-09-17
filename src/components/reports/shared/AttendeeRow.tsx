import React from "react";
import { TableColumn, EnhancedAttendee } from "../CheckInManagementTab";

interface AttendeeRowProps {
  attendee: EnhancedAttendee;
  columns: TableColumn[];
  rowIndex: number;
  isEven: boolean;
  isVisible: boolean;
  renderCellContent: (attendee: EnhancedAttendee, columnKey: string) => React.ReactNode;
}

export const AttendeeRow: React.FC<AttendeeRowProps> = ({
  attendee,
  columns,
  rowIndex,
  isEven,
  isVisible,
  renderCellContent
}) => {
  return (
    <tr
      className={`border-b last:border-b-0 hover:bg-accent/50 transition-colors ${
        isEven ? 'bg-background' : 'bg-muted/20'
      } ${!isVisible ? 'hidden' : ''}`}
      data-row-index={rowIndex}
      data-attendee-id={attendee.id}
      data-group-attendee="true"
      style={{ display: isVisible ? 'table-row' : 'none' }}
    >
      {columns.map((column) => (
        <td
          key={column.key}
          className={`p-3 text-sm border-r last:border-r-0 align-top ${column.width || 'w-auto'} pl-8`}
        >
          {renderCellContent(attendee, column.key)}
        </td>
      ))}
    </tr>
  );
};