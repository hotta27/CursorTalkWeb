"use client";

import { useCallback, useEffect, useState } from "react";
import type { ScheduleItem } from "@/lib/types";

interface ScheduleResponse {
  schedules: ScheduleItem[];
  message?: string;
}

const POLL_MS = 15 * 60 * 1000;

export function useSchedules() {
  const [items, setItems] = useState<ScheduleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchSchedules = useCallback(async (options?: { silent?: boolean }) => {
    const silent = options?.silent ?? false;
    if (!silent) {
      setLoading(true);
      setError("");
    }
    try {
      const response = await fetch("/api/schedules/today", { cache: "no-store" });
      // セーフティ発動時(429)は取得を打ち切り、以前のデータをそのまま使う
      if (response.status === 429) {
        return;
      }
      const payload = (await response.json()) as ScheduleResponse;
      if (!response.ok) {
        throw new Error(payload.message ?? "予定取得に失敗しました。");
      }
      setItems(payload.schedules);
    } catch (err) {
      const message = err instanceof Error ? err.message : "予定取得に失敗しました。";
      setError(message);
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void fetchSchedules();
  }, [fetchSchedules]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      void fetchSchedules({ silent: true });
    }, POLL_MS);
    return () => {
      window.clearInterval(timer);
    };
  }, [fetchSchedules]);

  return {
    items,
    loading,
    error,
    refresh: fetchSchedules,
  };
}
