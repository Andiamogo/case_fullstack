import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { useSSEChat } from "../hooks/useSSEChat";
import { MessageBubble } from "./MessageBubble";
import { ScrollToBottomButton } from "./ScrollToBottomButton";
import { StreamingIndicator } from "./StreamingIndicator";

export function Chat() {
  const [input, setInput] = useState("");
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const autoScrollRef = useRef(true);
  const programmaticScrollRef = useRef(false);

  const { messages, isStreaming, error, sendMessage, clearSession, stopStream } = useSSEChat();

  const isEmpty = messages.length === 0 && !isStreaming;

  const scrollToBottom = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    programmaticScrollRef.current = true;
    container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
    requestAnimationFrame(() => {
      programmaticScrollRef.current = false;
    });
  }, []);

  const handleScroll = useCallback(() => {
    if (programmaticScrollRef.current) return;
    const container = messagesContainerRef.current;
    if (!container) return;
    const threshold = 50;
    const atBottom = container.scrollHeight - container.scrollTop - container.clientHeight < threshold;
    autoScrollRef.current = atBottom;
    setShowScrollButton(!atBottom);
  }, []);

  useEffect(() => {
    if (autoScrollRef.current) {
      scrollToBottom();
    }
  }, [messages, isStreaming, scrollToBottom]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isStreaming) return;

    sendMessage(input.trim());
    setInput("");
    autoScrollRef.current = true;
    setShowScrollButton(false);
    requestAnimationFrame(scrollToBottom);
  };

  if (isEmpty) {
    return (
      <div className="chat-container empty">
        <div className="welcome">
          <h1>Orbital Data Analysis Agent</h1>
          <p>Ask questions about your data in natural language</p>
        </div>
        <form onSubmit={handleSubmit} className="input-form">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question about your data..."
          />
          <button type="submit" className="send-btn" disabled={!input.trim()}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="chat-container">
      {/* Full-width scroll area — scrollbar sits at viewport edge */}
      <div className="messages" ref={messagesContainerRef} onScroll={handleScroll}>
        <div className="messages-inner">
          {messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))}

          {isStreaming && <StreamingIndicator />}

          {error && <div className="error-banner">{error}</div>}
        </div>
      </div>

      {/* Scroll to bottom button */}
      {showScrollButton && (
        <ScrollToBottomButton
          onClick={() => {
            autoScrollRef.current = true;
            setShowScrollButton(false);
            scrollToBottom();
          }}
        />
      )}

      {/* Input area — full-width bg, centered content */}
      <div className="input-area">
        <form onSubmit={handleSubmit} className="input-form">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question about your data..."
            disabled={isStreaming}
          />
          {isStreaming ? (
            <button type="button" onClick={stopStream} className="stop-btn">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <rect x="4" y="4" width="16" height="16" rx="2" />
              </svg>
            </button>
          ) : (
            <button type="submit" className="send-btn" disabled={!input.trim()}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          )}
          <button type="button" onClick={clearSession} className="clear-btn" title="Clear conversation">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
          </button>
        </form>
      </div>
    </div>
  );
}
