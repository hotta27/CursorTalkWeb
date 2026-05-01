"use client";

import { useEffect, useMemo, useState } from "react";
import type { CharacterState, ScheduleItem } from "@/lib/types";
import { useWindowsNotifications } from "@/hooks/useWindowsNotifications";

interface UseCharacterStateResult {
  state: CharacterState;
  events: string[];
}

const GRACE_MS = 30_000;
const TICK_MS = 15_000;

export function useCharacterState(items: ScheduleItem[]): UseCharacterStateResult {
  const [state, setState] = useState<CharacterState>("idle");
  const [events, setEvents] = useState<string[]>([]);
  const { showNotification } = useWindowsNotifications();
  const [notifiedMap, setNotifiedMap] = useState<Record<string, { start: boolean; end: boolean }>>({});

  const normalized = useMemo(
    () =>
      items.map((item) => ({
        ...item,
        start: new Date(item.startAt).getTime(),
        end: new Date(item.endAt).getTime(),
      })),
    [items],
  );

  useEffect(() => {
    const nextMap: Record<string, { start: boolean; end: boolean }> = {};
    for (const item of items) {
      nextMap[item.id] = notifiedMap[item.id] ?? { start: false, end: false };
    }
    setNotifiedMap(nextMap);
    // items更新時のみ同期したいので依存はitemsだけに限定
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      const now = Date.now();
      let shouldNotify = false;

      setNotifiedMap((prev) => {
        const next = { ...prev };
        for (const item of normalized) {
          if (!next[item.id]) {
            next[item.id] = { start: false, end: false };
          }
          if (!next[item.id].start && now >= item.start && now - item.start <= GRACE_MS) {
            next[item.id].start = true;
            setState("notify");
            const message = `${item.title} が開始です`;
            void showNotification("予定開始", message).then((shown) => {
              const suffix = shown ? "" : " (通知未許可/非対応)";
              setEvents((prev) => [`予定開始: ${message}${suffix}`, ...prev].slice(0, 5));
            });
            shouldNotify = true;
          }
          if (!next[item.id].end && now >= item.end && now - item.end <= GRACE_MS) {
            next[item.id].end = true;
            setState("talk");
            const message = `${item.title} が終了です`;
            void showNotification("予定終了", message).then((shown) => {
              const suffix = shown ? "" : " (通知未許可/非対応)";
              setEvents((prev) => [`予定終了: ${message}${suffix}`, ...prev].slice(0, 5));
            });
            shouldNotify = true;
          }
        }
        return next;
      });

      if (!shouldNotify) {
        setState((current) => current);
      }
    }, TICK_MS);

    return () => {
      window.clearInterval(timer);
    };
  }, [normalized, showNotification]);

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
