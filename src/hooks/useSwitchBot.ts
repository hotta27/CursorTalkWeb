"use client";

import { useCallback, useEffect, useState } from "react";
import type { SwitchBotButtonConfig } from "@/lib/switchbot";

interface ButtonsResponse {
  configured: boolean;
  buttons: SwitchBotButtonConfig[];
  message?: string;
}

interface CommandResponse {
  ok?: boolean;
  message?: string;
}

export function useSwitchBot() {
  const [configured, setConfigured] = useState(false);
  const [buttons, setButtons] = useState<SwitchBotButtonConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [runningKey, setRunningKey] = useState<string | null>(null);

  const loadButtons = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/switchbot/buttons", { cache: "no-store" });
      const payload = (await response.json()) as ButtonsResponse;
      if (!response.ok) {
        throw new Error(payload.message ?? "SwitchBot 設定の読み込みに失敗しました。");
      }
      setConfigured(payload.configured);
      setButtons(payload.buttons);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "SwitchBot 設定の読み込みに失敗しました。";
      setError(message);
      setConfigured(false);
      setButtons([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadButtons();
  }, [loadButtons]);

  const runButton = useCallback(async (button: SwitchBotButtonConfig) => {
    const key = `${button.deviceId}:${button.command}:${button.parameter ?? "default"}`;
    setRunningKey(key);
    setError("");
    try {
      const response = await fetch("/api/switchbot/command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deviceId: button.deviceId,
          command: button.command,
          parameter: button.parameter ?? "default",
          commandType: button.commandType ?? "command",
        }),
      });
      const payload = (await response.json()) as CommandResponse;
      if (!response.ok) {
        throw new Error(payload.message ?? "SwitchBot 操作に失敗しました。");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "SwitchBot 操作に失敗しました。";
      setError(message);
    } finally {
      setRunningKey(null);
    }
  }, []);

  return {
    configured,
    buttons,
    loading,
    error,
    runningKey,
    runButton,
    reload: loadButtons,
  };
}
