"use client";

import {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { type TimesheetState, type TimeEntry } from "@/lib/types";
import { DEFAULT_RATE, STORAGE_KEY } from "@/lib/constants";

type Action =
  | { type: "CLOCK_IN"; payload: { id: string; clockIn: string } }
  | { type: "CLOCK_OUT"; payload: { id: string; clockOut: string } }
  | { type: "DELETE_ENTRY"; payload: { id: string } }
  | { type: "EDIT_ENTRY"; payload: TimeEntry }
  | { type: "SET_RATE"; payload: number }
  | { type: "CLEAR_ALL" }
  | { type: "HYDRATE"; payload: TimesheetState };

const initialState: TimesheetState = {
  entries: [],
  hourlyRate: DEFAULT_RATE,
};

function reducer(state: TimesheetState, action: Action): TimesheetState {
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
          e.id === action.payload.id ? action.payload : e
        ),
      };
    case "SET_RATE":
      return { ...state, hourlyRate: action.payload };
    case "CLEAR_ALL":
      return { ...initialState, hourlyRate: state.hourlyRate };
    case "HYDRATE":
      return action.payload;
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

  // Hydrate from localStorage on mount
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as TimesheetState;
        dispatch({ type: "HYDRATE", payload: parsed });
      }
    } catch (error) {
      console.error("Error hydrating from localStorage:", error);
    }
    setMounted(true);
  }, []);

  // Sync to localStorage on every state change (after mount)
  useEffect(() => {
    if (mounted) {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      } catch (error) {
        console.error("Error saving to localStorage:", error);
      }
    }
  }, [state, mounted]);

  return (
    <TimesheetContext.Provider value={{ state, dispatch, mounted }}>
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
