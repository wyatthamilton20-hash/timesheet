"use client";

import { useState, useEffect, useCallback } from "react";

export function useTimer(startTime: string | null) {
  const [elapsed, setElapsed] = useState(0);

  const getElapsed = useCallback(() => {
    if (!startTime) return 0;
    return Math.max(0, Date.now() - new Date(startTime).getTime());
  }, [startTime]);

  useEffect(() => {
    if (!startTime) {
      setElapsed(0);
      return;
    }

    setElapsed(getElapsed());
    const interval = setInterval(() => {
      setElapsed(getElapsed());
    }, 1000);

    return () => clearInterval(interval);
  }, [startTime, getElapsed]);

  return elapsed;
}
