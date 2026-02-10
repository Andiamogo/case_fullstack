import { useCallback, useMemo, useRef, useState } from "react";
import type { ChatMessage, SSEEventType } from "../types/events";
import { createEventHandler } from "../utils/eventMapper";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

const SSE_EVENT_TYPES: SSEEventType[] = [
  "thinking_delta",
  "text_delta",
  "tool_call",
  "tool_result",
  "data_table",
  "visualization",
];

interface UseSSEChatOptions {
  onMessage?: (message: ChatMessage) => void;
  onError?: (error: string) => void;
}

interface UseSSEChatReturn {
  messages: ChatMessage[];
  isStreaming: boolean;
  error: string | null;
  sendMessage: (question: string) => void;
  clearSession: () => void;
  stopStream: () => void;
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function useSSEChat(options: UseSSEChatOptions = {}): UseSSEChatReturn {
  const { onMessage, onError } = options;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const eventSourceRef = useRef<EventSource | null>(null);
  const sessionIdRef = useRef<string | null>(null);

  const addMessage = useCallback(
    (message: ChatMessage) => {
      setMessages((prev) => [...prev, message]);
      onMessage?.(message);
    },
    [onMessage]
  );

  const updateMessage = useCallback((id: string, content: string) => {
    setMessages((prev) => {
      const index = prev.findIndex((m) => m.id === id);
      if (index === -1) return prev;
      const updated = [...prev];
      updated[index] = { ...updated[index], content };
      return updated;
    });
  }, []);

  const eventHandler = useMemo(
    () => createEventHandler(addMessage, updateMessage),
    [addMessage, updateMessage]
  );

  const stopStream = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setIsStreaming(false);
  }, []);

  const clearSession = useCallback(() => {
    stopStream();
    setMessages([]);
    setError(null);
    sessionIdRef.current = null;
    eventHandler.reset();
  }, [stopStream, eventHandler]);

  const sendMessage = useCallback(
    (question: string) => {
      if (isStreaming) return;

      setError(null);
      eventHandler.reset();

      if (!sessionIdRef.current) {
        sessionIdRef.current = generateId();
      }

      addMessage({
        id: generateId(),
        type: "user",
        content: question,
        timestamp: new Date(),
      });

      setIsStreaming(true);

      const params = new URLSearchParams({ question });
      if (sessionIdRef.current) {
        params.set("session_id", sessionIdRef.current);
      }

      const es = new EventSource(`${API_BASE_URL}/api/chat/stream?${params}`);
      eventSourceRef.current = es;

      for (const eventType of SSE_EVENT_TYPES) {
        es.addEventListener(eventType, (e: MessageEvent) => {
          try {
            const data = JSON.parse(e.data);
            eventHandler.handleEvent(eventType, data);
          } catch {
            // Ignore parse errors
          }
        });
      }

      es.addEventListener("error", (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data);
          const errorMsg = eventHandler.handleError(data);
          setError(errorMsg);
          onError?.(errorMsg);
        } catch {
          // Native EventSource error (connection lost, etc.)
        }
        es.close();
        eventSourceRef.current = null;
        setIsStreaming(false);
        eventHandler.reset();
      });

      es.addEventListener("done", () => {
        es.close();
        eventSourceRef.current = null;
        setIsStreaming(false);
        eventHandler.reset();
      });
    },
    [isStreaming, addMessage, eventHandler, onError]
  );

  return {
    messages,
    isStreaming,
    error,
    sendMessage,
    clearSession,
    stopStream,
  };
}
