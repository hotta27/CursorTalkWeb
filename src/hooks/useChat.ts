"use client";

import { useCallback, useRef, useState } from "react";

export type ChatRole = "user" | "assistant";

export interface ChatMessage {
  id: string;
  role: ChatRole;
  text: string;
}

function createId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function parseSseEvent(chunk: string): { event: string; data: string } | null {
  let event = "message";
  const dataLines: string[] = [];
  for (const rawLine of chunk.split("\n")) {
    const line = rawLine.replace(/\r$/, "");
    if (line.startsWith("event:")) {
      event = line.slice("event:".length).trim();
    } else if (line.startsWith("data:")) {
      dataLines.push(line.slice("data:".length).replace(/^ /, ""));
    }
  }
  if (dataLines.length === 0) {
    return null;
  }
  return { event, data: dataLines.join("\n") };
}

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState("");
  const sessionIdRef = useRef<string | undefined>(undefined);

  const appendToMessage = useCallback((id: string, text: string) => {
    setMessages((prev) =>
      prev.map((message) =>
        message.id === id ? { ...message, text: message.text + text } : message,
      ),
    );
  }, []);

  const sendMessage = useCallback(
    async (rawText: string) => {
      const text = rawText.trim();
      if (!text || isStreaming) {
        return;
      }

      setError("");
      setIsStreaming(true);

      const userMessage: ChatMessage = { id: createId(), role: "user", text };
      const assistantId = createId();
      const assistantMessage: ChatMessage = { id: assistantId, role: "assistant", text: "" };
      setMessages((prev) => [...prev, userMessage, assistantMessage]);

      try {
        const response = await fetch("/api/chat/stream", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: text, sessionId: sessionIdRef.current }),
        });

        if (!response.ok || !response.body) {
          let detail = "";
          try {
            const payload = (await response.json()) as { message?: string };
            detail = payload.message ?? "";
          } catch {
            detail = "";
          }
          throw new Error(detail || `応答の取得に失敗しました (${response.status})`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let streamError = "";

        for (;;) {
          const { done, value } = await reader.read();
          if (done) {
            break;
          }
          buffer += decoder.decode(value, { stream: true });

          let separatorIndex = buffer.indexOf("\n\n");
          while (separatorIndex !== -1) {
            const chunk = buffer.slice(0, separatorIndex);
            buffer = buffer.slice(separatorIndex + 2);

            const parsed = parseSseEvent(chunk);
            if (parsed) {
              let payload: Record<string, unknown> = {};
              try {
                payload = JSON.parse(parsed.data) as Record<string, unknown>;
              } catch {
                payload = {};
              }

              if (parsed.event === "meta" && typeof payload.sessionId === "string") {
                sessionIdRef.current = payload.sessionId;
              } else if (parsed.event === "delta" && typeof payload.text === "string") {
                appendToMessage(assistantId, payload.text);
              } else if (parsed.event === "done") {
                if (typeof payload.sessionId === "string") {
                  sessionIdRef.current = payload.sessionId;
                }
              } else if (parsed.event === "error") {
                streamError =
                  typeof payload.error === "string" ? payload.error : "応答中にエラーが発生しました。";
              }
            }

            separatorIndex = buffer.indexOf("\n\n");
          }
        }

        if (streamError) {
          setError(streamError);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "応答の取得に失敗しました。";
        setError(message);
      } finally {
        setIsStreaming(false);
      }
    },
    [appendToMessage, isStreaming],
  );

  return {
    messages,
    isStreaming,
    error,
    sendMessage,
  };
}
