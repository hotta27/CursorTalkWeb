"use client";

import { useCallback, useEffect, useState } from "react";
import type { ScheduleItem } from "@/lib/types";

interface ScheduleResponse {
  schedules: ScheduleItem[];
  message?: string;
}

export function useSchedules() {
  const [items, setItems] = useState<ScheduleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchSchedules = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/schedules/today", { cache: "no-store" });
      const payload = (await response.json()) as ScheduleResponse;
      if (!response.ok) {
        throw new Error(payload.message ?? "予定取得に失敗しました。");
      }
      setItems(payload.schedules);
    } catch (err) {
      const message = err instanceof Error ? err.message : "予定取得に失敗しました。";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchSchedules();
  }, [fetchSchedules]);

  return {
    items,
    loading,
    error,
    refresh: fetchSchedules,
  };
}
