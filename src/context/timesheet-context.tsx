"use client";

import {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { type TimesheetState, type TimeEntry } from "@/lib/types";
import { DEFAULT_RATE, STORAGE_KEY } from "@/lib/constants";

interface AirtableEntry extends TimeEntry {
  _airtableId?: string;
}

type Action =
  | { type: "CLOCK_IN"; payload: { id: string; clockIn: string } }
  | { type: "CLOCK_OUT"; payload: { id: string; clockOut: string } }
  | { type: "DELETE_ENTRY"; payload: { id: string } }
  | { type: "EDIT_ENTRY"; payload: TimeEntry }
  | { type: "SET_RATE"; payload: number }
  | { type: "CLEAR_ALL" }
  | { type: "HYDRATE"; payload: TimesheetState };

interface AirtableState {
  entries: AirtableEntry[];
  hourlyRate: number;
}

const initialState: AirtableState = {
  entries: [],
  hourlyRate: DEFAULT_RATE,
};

function reducer(state: AirtableState, action: Action): AirtableState {
  switch (action.type) {
    case "CLOCK_IN":
      return {
        ...state,
        entries: [
          ...state.entries,
          {
            id: action.payload.id,
            clockIn: action.payload.clockIn,
            clockOut: null,
            note: "",
          },
        ],
      };
    case "CLOCK_OUT":
      return {
        ...state,
        entries: state.entries.map((e) =>
          e.id === action.payload.id
            ? { ...e, clockOut: action.payload.clockOut }
            : e
        ),
      };
    case "DELETE_ENTRY":
      return {
        ...state,
        entries: state.entries.filter((e) => e.id !== action.payload.id),
      };
    case "EDIT_ENTRY":
      return {
        ...state,
        entries: state.entries.map((e) =>
          e.id === action.payload.id ? { ...action.payload, _airtableId: (e as AirtableEntry)._airtableId } : e
        ),
      };
    case "SET_RATE":
      return { ...state, hourlyRate: action.payload };
    case "CLEAR_ALL":
      return { ...initialState, hourlyRate: state.hourlyRate };
    case "HYDRATE":
      return { ...state, entries: action.payload.entries as AirtableEntry[] };
    default:
      return state;
  }
}

interface TimesheetContextType {
  state: TimesheetState;
  dispatch: React.Dispatch<Action>;
  mounted: boolean;
}

const TimesheetContext = createContext<TimesheetContextType | null>(null);

export function TimesheetProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [mounted, setMounted] = useState(false);

  // Load entries from Airtable on mount
  useEffect(() => {
    async function loadEntries() {
      try {
        const res = await fetch("/api/entries");
        const entries = await res.json();
        dispatch({ type: "HYDRATE", payload: { entries, hourlyRate: state.hourlyRate } });
      } catch (error) {
        console.error("Error loading from Airtable:", error);
      }
      // Load hourly rate from localStorage (it's just a setting, not data)
      try {
        const stored = window.localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed.hourlyRate) {
            dispatch({ type: "SET_RATE", payload: parsed.hourlyRate });
          }
        }
      } catch {}
      setMounted(true);
    }
    loadEntries();
  }, []);

  // Save hourly rate to localStorage (lightweight setting)
  useEffect(() => {
    if (mounted) {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ hourlyRate: state.hourlyRate }));
      } catch {}
    }
  }, [state.hourlyRate, mounted]);

  // Wrap dispatch to sync with Airtable
  const syncedDispatch = useCallback(
    async (action: Action) => {
      dispatch(action);

      try {
        switch (action.type) {
          case "CLOCK_IN": {
            await fetch("/api/entries", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                id: action.payload.id,
                clockIn: action.payload.clockIn,
                clockOut: null,
                note: "",
              }),
            });
            // Refresh to get _airtableId
            const res = await fetch("/api/entries");
            const entries = await res.json();
            dispatch({ type: "HYDRATE", payload: { entries, hourlyRate: state.hourlyRate } });
            break;
          }
          case "CLOCK_OUT": {
            const entry = state.entries.find((e) => e.id === action.payload.id) as AirtableEntry | undefined;
            if (entry?._airtableId) {
              await fetch("/api/entries", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  ...entry,
                  clockOut: action.payload.clockOut,
                }),
              });
            }
            break;
          }
          case "DELETE_ENTRY": {
            const toDelete = state.entries.find((e) => e.id === action.payload.id) as AirtableEntry | undefined;
            if (toDelete?._airtableId) {
              await fetch(`/api/entries?airtableId=${toDelete._airtableId}`, {
                method: "DELETE",
              });
            }
            break;
          }
          case "EDIT_ENTRY": {
            const toEdit = state.entries.find((e) => e.id === action.payload.id) as AirtableEntry | undefined;
            if (toEdit?._airtableId) {
              await fetch("/api/entries", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  ...action.payload,
                  _airtableId: toEdit._airtableId,
                }),
              });
            }
            break;
          }
          case "CLEAR_ALL": {
            // Delete all entries from Airtable
            for (const entry of state.entries) {
              const e = entry as AirtableEntry;
              if (e._airtableId) {
                await fetch(`/api/entries?airtableId=${e._airtableId}`, {
                  method: "DELETE",
                });
              }
            }
            break;
          }
        }
      } catch (error) {
        console.error("Error syncing with Airtable:", error);
      }
    },
    [state.entries, state.hourlyRate]
  );

  return (
    <TimesheetContext.Provider value={{ state: state as TimesheetState, dispatch: syncedDispatch as unknown as React.Dispatch<Action>, mounted }}>
      {children}
    </TimesheetContext.Provider>
  );
}

export function useTimesheet() {
  const context = useContext(TimesheetContext);
  if (!context) {
    throw new Error("useTimesheet must be used within a TimesheetProvider");
  }
  return context;
}
