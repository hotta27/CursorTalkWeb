/// <reference path="./global.d.ts" />

import type { CharacterState, ScheduleItem } from "../shared/types";
import { VrmScene } from "./vrmScene.js";

const timelineEl = document.getElementById("timeline") as HTMLDivElement;
const refreshButton = document.getElementById("refreshButton") as HTMLButtonElement;
const errorEl = document.getElementById("error") as HTMLDivElement;
const stateEl = document.getElementById("characterState") as HTMLDivElement;
const vrmContainer = document.getElementById("vrmCanvas") as HTMLDivElement;
const vrmFallbackEl = document.getElementById("vrmFallback") as HTMLDivElement;
const MINUTES_PER_DAY = 24 * 60;
const GRID_STEP_MINUTES = 30;

const scene = new VrmScene(vrmContainer);
scene
  .load("./assets/avatar.vrm")
  .catch((error) => {
    console.error("[renderer] VRM load failed", error);
    vrmFallbackEl.classList.add("show");
  });

function setError(text: string): void {
  errorEl.textContent = text;
}

function formatRange(item: ScheduleItem): string {
  const start = new Date(item.startAt);
  const end = new Date(item.endAt);
  const h1 = `${start.getHours()}`.padStart(2, "0");
  const m1 = `${start.getMinutes()}`.padStart(2, "0");
  const h2 = `${end.getHours()}`.padStart(2, "0");
  const m2 = `${end.getMinutes()}`.padStart(2, "0");
  return `${h1}:${m1} - ${h2}:${m2}`;
}

function toMinuteOfDay(isoTime: string): number {
  const date = new Date(isoTime);
  return date.getHours() * 60 + date.getMinutes();
}

function formatMinuteLabel(minute: number): string {
  const h = `${Math.floor(minute / 60)}`.padStart(2, "0");
  const m = `${minute % 60}`.padStart(2, "0");
  return `${h}:${m}`;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function classifySchedule(item: ScheduleItem, nowMinute: number): "past" | "current" | "upcoming" {
  const start = clamp(toMinuteOfDay(item.startAt), 0, MINUTES_PER_DAY);
  const end = clamp(toMinuteOfDay(item.endAt), 0, MINUTES_PER_DAY);
  if (end <= nowMinute) {
    return "past";
  }
  if (start <= nowMinute && nowMinute < end) {
    return "current";
  }
  return "upcoming";
}

function renderSchedules(items: ScheduleItem[]): void {
  timelineEl.innerHTML = "";
  if (items.length === 0) {
    timelineEl.innerHTML = "<div class='timeline-empty'>スケジュールがありません</div>";
    return;
  }

  const sorted = [...items].sort(
    (a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime(),
  );
  const now = new Date();
  const nowMinute = now.getHours() * 60 + now.getMinutes();

  const axis = document.createElement("div");
  axis.className = "timeline-axis";
  axis.innerHTML = "<div class='axis-title'>予定 / 時間</div>";
  const axisTrack = document.createElement("div");
  axisTrack.className = "axis-track";
  for (let minute = 0; minute <= MINUTES_PER_DAY; minute += GRID_STEP_MINUTES) {
    const label = document.createElement("span");
    label.className = "axis-label";
    label.textContent = formatMinuteLabel(minute);
    label.style.left = `${(minute / MINUTES_PER_DAY) * 100}%`;
    axisTrack.appendChild(label);
  }
  axis.appendChild(axisTrack);
  timelineEl.appendChild(axis);

  const rows = document.createElement("div");
  rows.className = "timeline-rows";
  let rendered = 0;

  for (const item of sorted) {
    const start = clamp(toMinuteOfDay(item.startAt), 0, MINUTES_PER_DAY);
    const end = clamp(toMinuteOfDay(item.endAt), 0, MINUTES_PER_DAY);
    const duration = Math.max(1, end - start);

    if (start >= MINUTES_PER_DAY || end <= 0) {
      continue;
    }

    const row = document.createElement("div");
    row.className = "timeline-row";

    const rowName = document.createElement("div");
    rowName.className = "row-name";
    rowName.innerHTML = `<span class="row-title">${item.title}</span><span class="row-time">${formatRange(item)}</span>`;

    const rowTrack = document.createElement("div");
    rowTrack.className = "row-track";

    const bar = document.createElement("button");
    bar.className = "row-bar";
    const itemState = classifySchedule(item, nowMinute);
    if (itemState === "past") {
      bar.classList.add("past");
    } else if (itemState === "current") {
      bar.classList.add("current");
    }
    bar.textContent = item.title;
    bar.title = `${item.title} (${formatRange(item)})`;
    bar.style.left = `${(start / MINUTES_PER_DAY) * 100}%`;
    bar.style.width = `${(duration / MINUTES_PER_DAY) * 100}%`;
    bar.addEventListener("click", () => {
      void window.api.openNotionPage(item.notionUrl);
    });

    rowTrack.appendChild(bar);
    row.appendChild(rowName);
    row.appendChild(rowTrack);
    rows.appendChild(row);
    rendered += 1;
  }

  if (rendered === 0) {
    timelineEl.innerHTML = "<div class='timeline-empty'>表示可能な当日予定がありません</div>";
    return;
  }

  timelineEl.appendChild(rows);
}

function applyState(state: CharacterState): void {
  stateEl.textContent = `state: ${state}`;
  scene.setState(state);
  if (state !== "idle") {
    setTimeout(() => {
      scene.setState("idle");
      stateEl.textContent = "state: idle";
    }, 4000);
  }
}

async function boot(): Promise<void> {
  try {
    console.log("[renderer] boot: getTodaySchedules request");
    const items = await window.api.getTodaySchedules();
    console.log(`[renderer] boot: getTodaySchedules response (${items.length} items)`);
    renderSchedules(items);
  } catch (error) {
    console.error(error);
    setError("Notionから予定を取得できませんでした。設定を確認してください。");
  }
}

refreshButton.addEventListener("click", async () => {
  console.log("[renderer] refresh button clicked");
  setError("");
  try {
    console.log("[renderer] refresh: schedule API request");
    const items = await window.api.refreshSchedules();
    console.log(`[renderer] refresh: schedule API response (${items.length} items)`);
    renderSchedules(items);
  } catch (error) {
    console.error(error);
    setError("更新に失敗しました。時間をおいて再実行してください。");
  }
});

window.api.onSchedulesUpdated((items) => renderSchedules(items));
window.api.onCharacterState((state) => applyState(state));

void boot();
