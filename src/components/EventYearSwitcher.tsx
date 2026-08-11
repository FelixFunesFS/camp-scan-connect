import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { CalendarRange } from "lucide-react";
import { useEvent } from "@/contexts/EventContext";

export function EventYearSwitcher() {
  const { events, selectedEvent, selectEvent, isArchived, isLoading } = useEvent();

  if (isLoading || events.length === 0) return null;

  return (
    <div className="flex items-center gap-2">
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