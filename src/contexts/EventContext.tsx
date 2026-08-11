import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { EventRecord, setCurrentEvent } from "@/lib/eventRuntime";

interface EventContextValue {
  events: EventRecord[];
  activeEvent: EventRecord | null;
  /** The event currently being viewed (may be a past, read-only year). */
  selectedEvent: EventRecord | null;
  eventId: string | null;
  eventYear: number;
  /** True when viewing a year other than the live one — treat data as read-only. */
  isArchived: boolean;
  isLoading: boolean;
  selectEvent: (id: string) => void;
  refresh: () => Promise<void>;
}

const EventContext = createContext<EventContextValue | undefined>(undefined);

const STORAGE_KEY = "mc.selectedEventId";

export function EventProvider({ children }: { children: React.ReactNode }) {
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from("events")
      .select("id, name, year, starts_at, ends_at, is_active, regfox_form_id")
      .order("year", { ascending: false });

    if (error) {
      console.error("Failed to load events:", error);
      setIsLoading(false);
      return;
    }

    const rows = (data ?? []) as EventRecord[];
    setEvents(rows);
    setSelectedId((prev) => {
      const stored = prev ?? localStorage.getItem(STORAGE_KEY);
      if (stored && rows.some((e) => e.id === stored)) return stored;
      return rows.find((e) => e.is_active)?.id ?? rows[0]?.id ?? null;
    });
    setIsLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const activeEvent = useMemo(() => events.find((e) => e.is_active) ?? null, [events]);
  const selectedEvent = useMemo(() => {
    const found = events.find((e) => e.id === selectedId) ?? activeEvent;
    // Set synchronously so child effects that fire on mount already see it.
    setCurrentEvent(found ?? null);
    return found;
  }, [events, selectedId, activeEvent]);

  const selectEvent = useCallback((id: string) => {
    localStorage.setItem(STORAGE_KEY, id);
    setSelectedId(id);
  }, []);

  const value = useMemo<EventContextValue>(
    () => ({
      events,
      activeEvent,
      selectedEvent,
      eventId: selectedEvent?.id ?? null,
      eventYear: selectedEvent?.year ?? new Date().getFullYear(),
      isArchived: !!selectedEvent && !selectedEvent.is_active,
      isLoading,
      selectEvent,
      refresh: load,
    }),
    [events, activeEvent, selectedEvent, isLoading, selectEvent, load],
  );

  // Hold rendering until the event is known — every data query is scoped to it.
  return (
    <EventContext.Provider value={value}>
      {isLoading ? (
        <div className="flex min-h-screen items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
        </div>
      ) : (
        children
      )}
    </EventContext.Provider>
  );
}

export function useEvent() {
  const ctx = useContext(EventContext);
  if (!ctx) throw new Error("useEvent must be used inside an EventProvider");
  return ctx;
}