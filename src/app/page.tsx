"use client";

import { AvatarCanvas } from "@/components/vrm/AvatarCanvas";
import { Timeline } from "@/components/schedule/Timeline";
import { useCharacterState } from "@/hooks/useCharacterState";
import { useSchedules } from "@/hooks/useSchedules";
import { useWindowsNotifications } from "@/hooks/useWindowsNotifications";

export default function Home() {
  const { items, loading, error, refresh } = useSchedules();
  const { state, events } = useCharacterState(items);
  const { permission, ensurePermission } = useWindowsNotifications();

  return (
    <main className="page-root">
      <section className="left-panel">
        <header className="toolbar">
          <h1>NotificationAI</h1>
          <div className="toolbar-actions">
            <button
              type="button"
              className="button"
              onClick={() => {
                void ensurePermission();
              }}
            >
              通知を許可
            </button>
            <button
              type="button"
              className="button button-primary"
              onClick={() => {
                void refresh();
              }}
            >
              更新
            </button>
          </div>
        </header>

        <div className="status-row">
          <span>state: {state}</span>
          <span>notification: {permission}</span>
        </div>
        {permission !== "granted" ? (
          <div className="error-box">通知を有効にするには「通知を許可」をクリックしてください。</div>
        ) : null}

        {error && <div className="error-box">{error}</div>}
        {loading ? <div className="timeline-empty">読み込み中...</div> : <Timeline items={items} />}

        <div className="event-panel">
          <h2>通知ログ (フォールバック)</h2>
          {events.length === 0 ? (
            <div className="timeline-empty">通知イベントはまだありません</div>
          ) : (
            <ul>
              {events.map((event, index) => (
                <li key={`${event}-${index}`}>{event}</li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="right-panel">
        <AvatarCanvas />
      </section>
    </main>
  );
}
