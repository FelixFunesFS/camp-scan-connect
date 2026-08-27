import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { CalendarRange } from "lucide-react";
import { useEvent, useYearSwitchAllowed } from "@/contexts/EventContext";

/**
 * Year picker for previous events. Mount this ONLY in dev/admin views —
 * mounting it is what allows an archived year to be selected at all.
 */
export function EventYearSwitcher() {
  useYearSwitchAllowed(true);
  const { events, selectedEvent, selectEvent, isArchived, isLoading } = useEvent();

  if (isLoading || events.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <CalendarRange className="h-4 w-4 text-muted-foreground shrink-0" />
      <Select value={selectedEvent?.id ?? undefined} onValueChange={selectEvent}>
        <SelectTrigger className="h-9 w-[220px] max-w-[60vw]">
          <SelectValue placeholder="Select event" />
        </SelectTrigger>
        <SelectContent>
          {events.map((e) => (
            <SelectItem key={e.id} value={e.id}>
              {e.name}
              {e.is_active ? " (live)" : ""}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {isArchived && (
        <Badge variant="secondary" className="whitespace-nowrap">
          Archived — read only
        </Badge>
      )}
    </div>
  );
}

/** Full-width banner warning that an archived year is being viewed. */
export function ArchivedYearBanner() {
  const { isArchived, eventYear } = useEvent();
  if (!isArchived) return null;
  return (
    <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-200">
      Viewing archived {eventYear} data — read only. Live event views are unaffected.
    </div>
  );
}
