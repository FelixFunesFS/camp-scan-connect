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
  /** Only dev/admin views may look at a past year. */
  canSwitchYear: boolean;
  setYearSwitchEnabled: (enabled: boolean) => void;
  selectEvent: (id: string) => void;
  refresh: () => Promise<void>;
}

const EventContext = createContext<EventContextValue | undefined>(undefined);

const STORAGE_KEY = "mc.selectedEventId";

export function EventProvider({ children }: { children: React.ReactNode }) {
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  // Operational screens (stations, assignment, activation, staff hub) always run
  // on the live event. Only dev/admin views may opt into a past year.
  const [canSwitchYear, setCanSwitchYear] = useState(false);

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
    // Outside dev/admin the stored device preference is ignored entirely, so a
    // device that once viewed an archived year can never read stale rows.
    const chosen = canSwitchYear
      ? events.find((e) => e.id === selectedId) ?? activeEvent
      : activeEvent ?? events.find((e) => e.id === selectedId) ?? null;
    // Set synchronously so child effects that fire on mount already see it.
    setCurrentEvent(chosen ?? null);
    return chosen;
  }, [events, selectedId, activeEvent, canSwitchYear]);

  const selectEvent = useCallback((id: string) => {
    localStorage.setItem(STORAGE_KEY, id);
    setSelectedId(id);
  }, []);

  const setYearSwitchEnabled = useCallback((enabled: boolean) => {
    setCanSwitchYear((prev) => (prev === enabled ? prev : enabled));
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
      canSwitchYear,
      setYearSwitchEnabled,
      selectEvent,
      refresh: load,
    }),
    [events, activeEvent, selectedEvent, isLoading, canSwitchYear, setYearSwitchEnabled, selectEvent, load],
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

/** Mount inside a dev/admin view to allow looking at a previous year there. */
export function useYearSwitchAllowed(allowed: boolean) {
  const { setYearSwitchEnabled } = useEvent();
  useEffect(() => {
    setYearSwitchEnabled(allowed);
    return () => setYearSwitchEnabled(false);
  }, [allowed, setYearSwitchEnabled]);
}

export function useEvent() {
  const ctx = useContext(EventContext);
  if (!ctx) throw new Error("useEvent must be used inside an EventProvider");
  return ctx;
}
