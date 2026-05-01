"use client";

import type { ScheduleItem } from "@/lib/types";
import {
  MINUTES_PER_DAY,
  GRID_STEP_MINUTES,
  clamp,
  classifySchedule,
  formatMinuteLabel,
  formatRange,
  toMinuteOfDay,
} from "@/lib/time";

interface TimelineProps {
  items: ScheduleItem[];
}

export function Timeline({ items }: TimelineProps) {
  if (items.length === 0) {
    return <div className="timeline-empty">スケジュールがありません</div>;
  }

  const sorted = [...items].sort(
    (a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime(),
  );
  const now = new Date();
  const nowMinute = now.getHours() * 60 + now.getMinutes();

  const visibleItems = sorted.filter((item) => {
    const start = clamp(toMinuteOfDay(item.startAt), 0, MINUTES_PER_DAY);
    const end = clamp(toMinuteOfDay(item.endAt), 0, MINUTES_PER_DAY);
    return start < MINUTES_PER_DAY && end > 0;
  });

  if (visibleItems.length === 0) {
    return <div className="timeline-empty">表示可能な当日予定がありません</div>;
  }

  return (
    <div className="timeline-root">
      <div className="timeline-axis">
        <div className="axis-title">予定 / 時間</div>
        <div className="axis-track">
          {Array.from(
            { length: Math.floor(MINUTES_PER_DAY / GRID_STEP_MINUTES) + 1 },
            (_, i) => i * GRID_STEP_MINUTES,
          ).map((minute) => (
            <span
              key={minute}
              className="axis-label"
              style={{ left: `${(minute / MINUTES_PER_DAY) * 100}%` }}
            >
              {formatMinuteLabel(minute)}
            </span>
          ))}
        </div>
      </div>

      <div className="timeline-rows">
        {visibleItems.map((item) => {
          const start = clamp(toMinuteOfDay(item.startAt), 0, MINUTES_PER_DAY);
          const end = clamp(toMinuteOfDay(item.endAt), 0, MINUTES_PER_DAY);
          const duration = Math.max(1, end - start);
          const itemState = classifySchedule(item, nowMinute);
          const barClass =
            itemState === "past" ? "row-bar past" : itemState === "current" ? "row-bar current" : "row-bar";

          return (
            <div key={item.id} className="timeline-row">
              <div className="row-name">
                <span className="row-title">{item.title}</span>
                <span className="row-time">{formatRange(item)}</span>
              </div>
              <div className="row-track">
                <a
                  className={barClass}
                  href={item.notionUrl}
                  target="_blank"
                  rel="noreferrer"
                  title={`${item.title} (${formatRange(item)})`}
                  style={{
                    left: `${(start / MINUTES_PER_DAY) * 100}%`,
                    width: `${(duration / MINUTES_PER_DAY) * 100}%`,
                  }}
                >
                  {item.title}
                </a>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
