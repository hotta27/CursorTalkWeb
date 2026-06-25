"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { CharacterState, ScheduleItem } from "@/lib/types";
import { useWindowsNotifications } from "@/hooks/useWindowsNotifications";

interface UseCharacterStateResult {
  state: CharacterState;
  events: string[];
}

const TICK_MS = 15_000;

interface NotifyFlags {
  start: boolean;
  end: boolean;
}

export function useCharacterState(items: ScheduleItem[]): UseCharacterStateResult {
  const [state, setState] = useState<CharacterState>("idle");
  const [events, setEvents] = useState<string[]>([]);
  const { showNotification } = useWindowsNotifications();

  const notifiedRef = useRef<Map<string, NotifyFlags>>(new Map());
  const itemsRef = useRef<Array<ScheduleItem & { start: number; end: number }>>([]);

  useEffect(() => {
    const now = Date.now();
    const normalized = items.map((item) => ({
      ...item,
      start: new Date(item.startAt).getTime(),
      end: new Date(item.endAt).getTime(),
    }));
    itemsRef.current = normalized;

    const nextMap = new Map<string, NotifyFlags>();
    for (const item of normalized) {
      const existing = notifiedRef.current.get(item.id);
      if (existing) {
        nextMap.set(item.id, existing);
      } else {
        // 取得時点で既に開始/終了済みの予定は通知済み扱いにし、
        // ページを開いた瞬間に過去分が一斉通知されるのを防ぐ。
        nextMap.set(item.id, { start: now >= item.start, end: now >= item.end });
      }
    }
    notifiedRef.current = nextMap;
  }, [items]);

  const checkSchedules = useCallback(() => {
    const now = Date.now();
    for (const item of itemsRef.current) {
      const flags = notifiedRef.current.get(item.id);
      if (!flags) {
        continue;
      }

      if (!flags.start && now >= item.start) {
        flags.start = true;
        setState("notify");
        const message = `${item.title} が開始です`;
        void showNotification("予定開始", message).then((shown) => {
          const suffix = shown ? "" : " (通知未許可/非対応)";
          setEvents((prev) => [`予定開始: ${message}${suffix}`, ...prev].slice(0, 5));
        });
      }

      if (!flags.end && now >= item.end) {
        flags.end = true;
        setState("talk");
        const message = `${item.title} が終了です`;
        void showNotification("予定終了", message).then((shown) => {
          const suffix = shown ? "" : " (通知未許可/非対応)";
          setEvents((prev) => [`予定終了: ${message}${suffix}`, ...prev].slice(0, 5));
        });
      }
    }
  }, [showNotification]);

  useEffect(() => {
    const timer = window.setInterval(checkSchedules, TICK_MS);

    // バックグラウンドで setInterval が間引かれて通知を逃しても、
    // タブが前面に戻った瞬間に取りこぼしを拾う。
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        checkSchedules();
      }
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [checkSchedules]);

  useEffect(() => {
    if (state === "idle") {
      return;
    }
    const timer = window.setTimeout(() => {
      setState("idle");
    }, 4_000);
    return () => {
      window.clearTimeout(timer);
    };
  }, [state]);

  return { state, events };
}
