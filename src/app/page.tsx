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
      <div className="vrm-layer">
        <AvatarCanvas characterState={state} />
      </div>

      <div className="ui-overlay">
        <header className="toolbar toolbar-compact">
          <h1>NotificationAI</h1>
          <div className="toolbar-right">
            <span className="status-chip">state: {state}</span>
            <span className="status-chip">notification: {permission}</span>
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
          </div>
        </header>

        {(permission !== "granted" || error) && (
          <div className="banner-row">
            {permission !== "granted" ? (
              <div className="error-box error-box-inline">
                通知を有効にするには「通知を許可」をクリックしてください。
              </div>
            ) : null}
            {error ? <div className="error-box error-box-inline">{error}</div> : null}
          </div>
        )}

        <div className="ui-overlay-spacer" aria-hidden="true" />

        <section className="schedule-section">
          <div className="schedule-panel">
            {loading ? (
              <div className="timeline-empty">読み込み中...</div>
            ) : (
              <Timeline items={items} />
            )}
          </div>

          <details className="event-panel">
            <summary>通知ログ (フォールバック)</summary>
            {events.length === 0 ? (
              <div className="timeline-empty timeline-empty-compact">通知イベントはまだありません</div>
            ) : (
              <ul>
                {events.map((event, index) => (
                  <li key={`${event}-${index}`}>{event}</li>
                ))}
              </ul>
            )}
          </details>
        </section>
      </div>
    </main>
  );
}
