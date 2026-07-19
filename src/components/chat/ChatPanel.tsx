"use client";

import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useChat } from "@/hooks/useChat";

export function ChatPanel() {
  const { messages, isStreaming, error, sendMessage } = useChat();
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const submit = () => {
    const text = input.trim();
    if (!text || isStreaming) {
      return;
    }
    void sendMessage(text);
    setInput("");
  };

  return (
    <aside className="chat-panel">
      <div className="chat-header">チャット</div>

      <div className="chat-messages">
        {messages.length === 0 ? (
          <div className="chat-empty">メッセージを送信して会話を始めましょう。</div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`chat-message chat-message-${message.role}`}
            >
              <div className="chat-message-bubble">
                {message.text ? (
                  message.role === "assistant" ? (
                    <div className="chat-markdown">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          a: ({ node, ...props }) => (
                            <a {...props} target="_blank" rel="noreferrer" />
                          ),
                        }}
                      >
                        {message.text}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    message.text
                  )
                ) : message.role === "assistant" && isStreaming ? (
                  <span className="chat-typing">…</span>
                ) : (
                  ""
                )}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {error ? <div className="error-box error-box-inline chat-error">{error}</div> : null}

      <div className="chat-input-row">
        <textarea
          ref={textareaRef}
          className="chat-input"
          rows={2}
          placeholder="メッセージを入力... (Enterで送信 / Shift+Enterで改行)"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              submit();
            }
          }}
          disabled={isStreaming}
        />
        <button
          type="button"
          className="button button-primary chat-send"
          onClick={submit}
          disabled={isStreaming || input.trim().length === 0}
        >
          送信
        </button>
      </div>
    </aside>
  );
}
