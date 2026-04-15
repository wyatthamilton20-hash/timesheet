export interface TimeEntry {
  id: string;
  clockIn: string;
  clockOut: string | null;
  note: string;
}

export interface TimesheetState {
  entries: TimeEntry[];
  hourlyRate: number;
}

export interface DaySummary {
  date: string;
  entries: TimeEntry[];
  totalMinutes: number;
  earnings: number;
}

export interface PeriodSummary {
  startDate: string;
  endDate: string;
  totalMinutes: number;
  totalHours: number;
  earnings: number;
  sessionCount: number;
}
