"use client";

import { useSwitchBot } from "@/hooks/useSwitchBot";

export function SwitchBotControls() {
  const { configured, buttons, loading, error, runningKey, runButton } = useSwitchBot();

  if (loading) {
    return (
      <section className="switchbot-panel" aria-label="SwitchBot">
        <div className="switchbot-header">SwitchBot</div>
        <div className="timeline-empty timeline-empty-compact">読み込み中...</div>
      </section>
    );
  }

  if (!configured) {
    return null;
  }

  return (
    <section className="switchbot-panel" aria-label="SwitchBot">
      <div className="switchbot-header">SwitchBot</div>
      {buttons.length === 0 ? (
        <div className="timeline-empty timeline-empty-compact">
          APIで取得した機器のうち、対応コマンドがあるものだけボタン表示されます。
        </div>
      ) : (
        <div className="switchbot-buttons">
          {buttons.map((button) => {
            const key = `${button.deviceId}:${button.command}:${button.parameter ?? "default"}`;
            const busy = runningKey === key;
            return (
              <button
                key={`${button.label}-${key}`}
                type="button"
                className="button switchbot-button"
                disabled={busy || runningKey !== null}
                onClick={() => {
                  void runButton(button);
                }}
              >
                {busy ? "送信中..." : button.label}
              </button>
            );
          })}
        </div>
      )}
      {error ? <div className="error-box error-box-inline switchbot-error">{error}</div> : null}
    </section>
  );
}
