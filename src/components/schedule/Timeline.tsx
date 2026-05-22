"use client";

import { useMemo, useState } from "react";
import type { ScheduleItem } from "@/lib/types";
import {
  MINUTES_PER_DAY,
  assignTimelineLanes,
  classifySchedule,
  findNearestByStart,
  formatMinuteLabel,
  formatRange,
  clamp,
  toMinuteOfDay,
} from "@/lib/time";

const BOX_HEIGHT = 28;
const BOX_GAP = 4;
const LANE_PADDING = 4;
const AXIS_LABELS = [0, 360, 720, 1080, 1440];

interface TimelineProps {
  items: ScheduleItem[];
}

export function Timeline({ items }: TimelineProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const now = new Date();
  const nowMinute = now.getHours() * 60 + now.getMinutes();

  const visibleItems = useMemo(
    () =>
      [...items]
        .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())
        .filter((item) => {
          const start = clamp(toMinuteOfDay(item.startAt), 0, MINUTES_PER_DAY);
          const end = clamp(toMinuteOfDay(item.endAt), 0, MINUTES_PER_DAY);
          return start < MINUTES_PER_DAY && end > 0;
        }),
    [items],
  );

  const laneItems = useMemo(() => assignTimelineLanes(visibleItems), [visibleItems]);
  const laneCount = useMemo(
    () => (laneItems.length === 0 ? 1 : Math.max(...laneItems.map((l) => l.lane)) + 1),
    [laneItems],
  );
  const trackHeight = laneCount * (BOX_HEIGHT + BOX_GAP) + LANE_PADDING * 2;

  const defaultItem = findNearestByStart(visibleItems, now);
  const hoveredItem = hoveredId ? visibleItems.find((i) => i.id === hoveredId) : null;
  const displayTitle = hoveredItem?.title ?? defaultItem?.title ?? "スケジュール名";

  if (items.length === 0) {
    return <div className="timeline-empty">スケジュールがありません</div>;
  }

  if (visibleItems.length === 0) {
    return <div className="timeline-empty">表示可能な当日予定がありません</div>;
  }

  return (
    <div className="timeline-root">
      <div className="schedule-name">{displayTitle}</div>

      <div className="timeline-axis">
        <div className="axis-track">
          {AXIS_LABELS.map((minute) => (
            <span
              key={minute}
              className="axis-label"
              style={{ left: `${(minute / MINUTES_PER_DAY) * 100}%` }}
            >
              {formatMinuteLabel(Math.min(minute, MINUTES_PER_DAY))}
            </span>
          ))}
        </div>
      </div>

      <div className="timeline-track" style={{ minHeight: trackHeight }}>
        {laneItems.map(({ item, lane, start, duration }) => {
          const itemState = classifySchedule(item, nowMinute);
          const barClass =
            itemState === "past"
              ? "timeline-box past"
              : itemState === "current"
                ? "timeline-box current"
                : "timeline-box";

          return (
            <a
              key={item.id}
              className={`${barClass}${hoveredId === item.id ? " is-hovered" : ""}`}
              href={item.notionUrl}
              target="_blank"
              rel="noreferrer"
              style={{
                left: `${(start / MINUTES_PER_DAY) * 100}%`,
                width: `${(duration / MINUTES_PER_DAY) * 100}%`,
                top: LANE_PADDING + lane * (BOX_HEIGHT + BOX_GAP),
                height: BOX_HEIGHT,
              }}
              onMouseEnter={() => setHoveredId(item.id)}
              onMouseLeave={() => setHoveredId(null)}
            >
              {formatRange(item)}
            </a>
          );
        })}
      </div>
    </div>
  );
}
