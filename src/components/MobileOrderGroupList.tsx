import React, { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ChevronDown, ChevronUp, MapPin } from "lucide-react";
import { AttendeeDetailModal } from "@/components/AttendeeDetailModal";
import { MobileRfidAssignmentCard } from "@/components/MobileRfidAssignmentCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { AttendeeData } from "@/pages/RfidAssignment";
import { groupAttendeesByOrder } from "@/utils/orderGroupUtils";

type GroupSortField = "name" | "order_id" | "order_size" | "progress" | "status";
type SortDirection = "asc" | "desc";

interface MobileOrderGroupListProps {
  attendees: AttendeeData[];
  onRefresh: () => void;
  onOptimisticUpdate?: (attendeeId: string, rfidUid: string | null, rfidStatus: string) => void;
  searchTerm: string;
}

const fullName = (attendee?: AttendeeData) =>
  attendee ? `${attendee.first_name} ${attendee.last_name}`.trim() : "Individual attendees";

const nameKey = (attendee?: AttendeeData) =>
  attendee ? `${attendee.last_name} ${attendee.first_name}`.trim().toLocaleLowerCase() : "";

export function MobileOrderGroupList({
  attendees,
  onRefresh,
  onOptimisticUpdate,
  searchTerm,
}: MobileOrderGroupListProps) {
  const [sortField, setSortField] = useState<GroupSortField>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [selectedAttendee, setSelectedAttendee] = useState<AttendeeData | null>(null);

  const orderGroups = useMemo(() => {
    const groups = groupAttendeesByOrder(attendees).map((group) => {
      const sortedAttendees = [...group.attendees].sort((a, b) => {
        const result = nameKey(a as AttendeeData).localeCompare(nameKey(b as AttendeeData));
        return sortDirection === "asc" ? result : -result;
      }) as AttendeeData[];
      return { ...group, attendees: sortedAttendees };
    });

    return groups.sort((a, b) => {
      const aAssigned = a.attendees.filter((person) => person.rfid_uid && ["assigned", "active"].includes(person.rfid_status || "")).length;
      const bAssigned = b.attendees.filter((person) => person.rfid_uid && ["assigned", "active"].includes(person.rfid_status || "")).length;
      let result = 0;
      if (sortField === "name") result = nameKey(a.attendees[0]).localeCompare(nameKey(b.attendees[0]));
      if (sortField === "order_id") result = (a.orderId || "").localeCompare(b.orderId || "");
      if (sortField === "order_size") result = a.groupSize - b.groupSize;
      if (sortField === "progress") result = aAssigned / a.groupSize - bAssigned / b.groupSize;
      if (sortField === "status") result = Number(aAssigned === a.groupSize) - Number(bAssigned === b.groupSize);
      return sortDirection === "asc" ? result : -result;
    });
  }, [attendees, sortDirection, sortField]);

  const toggleGroup = (groupId: string) => {
    setExpandedGroups((current) => {
      const next = new Set(current);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  };

  if (orderGroups.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">{searchTerm ? "No order groups match this search." : "No order groups available."}</p>;
  }

  return (
    <section className="space-y-3" aria-label="Order groups">
      <div className="space-y-2">
        <p className="text-xs font-semibold text-muted-foreground">Sort orders by</p>
        <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
          <Select value={sortField} onValueChange={(value) => setSortField(value as GroupSortField)}>
            <SelectTrigger className="h-11 min-w-0"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="name">Lead attendee name</SelectItem>
              <SelectItem value="order_id">Order ID</SelectItem>
              <SelectItem value="order_size">Group size</SelectItem>
              <SelectItem value="progress">Assignment progress</SelectItem>
              <SelectItem value="status">Completion status</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            className="h-11 min-w-[92px]"
            onClick={() => setSortDirection((current) => current === "asc" ? "desc" : "asc")}
            aria-label={sortDirection === "asc" ? "Sorted ascending; change to descending" : "Sorted descending; change to ascending"}
          >
            {sortDirection === "asc" ? <ArrowUp className="mr-2 h-4 w-4" /> : <ArrowDown className="mr-2 h-4 w-4" />}
            {sortField === "name" ? (sortDirection === "asc" ? "A–Z" : "Z–A") : (sortDirection === "asc" ? "Asc" : "Desc")}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Button variant="outline" className="h-11" onClick={() => setExpandedGroups(new Set(orderGroups.map((group) => group.orderId || "individual")))}>Expand all</Button>
        <Button variant="outline" className="h-11" onClick={() => setExpandedGroups(new Set())}>Collapse all</Button>
      </div>

      {orderGroups.map((group) => {
        const groupId = group.orderId || "individual";
        const expanded = expandedGroups.has(groupId);
        const assigned = group.attendees.filter((person) => person.rfid_uid && ["assigned", "active"].includes(person.rfid_status || "")).length;
        const percentage = group.groupSize ? assigned / group.groupSize * 100 : 0;
        const status = assigned === group.groupSize ? "Complete" : assigned > 0 ? "Partial" : "Unassigned";
        const site = group.attendees.find((person) => person.site_location_assignment && person.site_location_assignment !== "Not Assigned")?.site_location_assignment;

        return (
          <div key={groupId} className={expanded ? "overflow-hidden rounded-lg border border-primary/30 shadow-sm" : "overflow-hidden rounded-lg border bg-card shadow-sm"}>
            <button
              type="button"
              className="flex min-h-[104px] w-full items-start gap-3 p-4 text-left"
              onClick={() => toggleGroup(groupId)}
              aria-expanded={expanded}
            >
              <div className="min-w-0 flex-1 space-y-1.5">
                <div className="badge-row">
                  <Badge variant="outline" className="max-w-[170px] truncate font-mono text-[10px]">{group.orderId || "No order ID"}</Badge>
                  <Badge variant={status === "Complete" ? "default" : "secondary"} className="text-[10px]">{status}</Badge>
                </div>
                <p className="truncate text-base font-semibold">{fullName(group.attendees[0])}</p>
                <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                  {site ? <span className="flex min-w-0 items-center gap-1"><MapPin className="h-3 w-3 shrink-0" /><span className="truncate">{site}</span></span> : null}
                  <span>{group.groupSize} {group.groupSize === 1 ? "person" : "people"}</span>
                </div>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <span className="text-sm font-semibold">{assigned}/{group.groupSize}</span>
                <span className="text-[10px] text-muted-foreground">assigned</span>
                <span className="mt-2 flex h-8 w-8 items-center justify-center rounded-md bg-muted" aria-hidden="true">
                  {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </span>
              </div>
            </button>
            <Progress value={percentage} className="h-1 rounded-none" />

            {expanded ? (
              <div className="divide-y border-t bg-card px-3">
                {group.attendees.map((attendee) => (
                  <MobileRfidAssignmentCard
                    key={attendee.id}
                    attendee={attendee}
                    compact
                    onAssignmentComplete={onRefresh}
                    onOptimisticUpdate={onOptimisticUpdate}
                    onViewDetails={() => setSelectedAttendee(attendee)}
                  />
                ))}
              </div>
            ) : null}
          </div>
        );
      })}

      <p className="text-xs text-muted-foreground">{orderGroups.length} order groups · {attendees.length} people</p>

      {selectedAttendee ? (
        <AttendeeDetailModal
          attendee={selectedAttendee}
          allAttendees={attendees}
          open
          onOpenChange={(open) => { if (!open) setSelectedAttendee(null); }}
        />
      ) : null}
    </section>
  );
}