import { useCallback, useMemo, useRef, useState } from "react";
import type { ChatMessage } from "../types/events";
import { parseSSEStream } from "../utils/sseParser";
import { createEventHandler } from "../utils/eventMapper";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

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

  const abortControllerRef = useRef<AbortController | null>(null);
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
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
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
    async (question: string) => {
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

      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      try {
        const response = await fetch(`${API_BASE_URL}/api/chat/stream`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ question, session_id: sessionIdRef.current }),
          signal: abortController.signal,
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error("No response body");
        }

        await parseSSEStream(reader, (eventType, data) => {
          if (eventType === "error") {
            const errorMsg = eventHandler.handleError(data);
            setError(errorMsg);
            onError?.(errorMsg);
          } else if (eventType !== "done") {
            eventHandler.handleEvent(eventType, data);
          }
        });
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        const errorMsg = (err as Error).message || "Connection error";
        setError(errorMsg);
        onError?.(errorMsg);
      } finally {
        abortControllerRef.current = null;
        setIsStreaming(false);
        eventHandler.reset();
      }
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
