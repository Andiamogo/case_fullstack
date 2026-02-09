import type {
  ChatMessage,
  DataTableEvent,
  ErrorEvent,
  TextDeltaEvent,
  ThinkingDeltaEvent,
  ToolCallEvent,
  ToolResultEvent,
  VisualizationEvent,
} from "../types/events";

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Creates an event handler that maps raw SSE events into ChatMessage objects.
 *
 * @param addMessage - callback to add a new message to state
 * @param updateMessage - callback to update an existing message's content by id
 */
export function createEventHandler(
  addMessage: (msg: ChatMessage) => void,
  updateMessage: (id: string, content: string) => void,
): {
  handleEvent: (eventType: string, data: unknown) => void;
  handleError: (data: unknown) => string;
  reset: () => void;
} {
  let streaming: { id: string; content: string; type: "thinking" | "assistant" } | null = null;

  function handleDelta(type: "thinking" | "assistant", content: string) {
    if (streaming && streaming.type === type) {
      streaming.content += content;
      updateMessage(streaming.id, streaming.content);
    } else {
      const newId = generateId();
      streaming = { id: newId, content, type };
      addMessage({
        id: newId,
        type,
        content,
        timestamp: new Date(),
      } as ChatMessage);
    }
  }

  function handleEvent(eventType: string, data: unknown) {
    switch (eventType) {
      case "thinking_delta": {
        const d = data as ThinkingDeltaEvent;
        handleDelta("thinking", d.content);
        break;
      }

      case "text_delta": {
        const d = data as TextDeltaEvent;
        handleDelta("assistant", d.content);
        break;
      }

      case "tool_call": {
        const d = data as ToolCallEvent;
        streaming = null;
        addMessage({
          id: generateId(),
          type: "tool_call",
          content: `Calling ${d.name}`,
          timestamp: new Date(),
          metadata: {
            toolName: d.name,
            toolArgs: d.args,
            callId: d.call_id,
          },
        });
        break;
      }

      case "tool_result": {
        const d = data as ToolResultEvent;
        streaming = null;
        addMessage({
          id: generateId(),
          type: "tool_result",
          content: d.result,
          timestamp: new Date(),
          metadata: {
            toolName: d.name,
            callId: d.call_id,
            success: d.success,
          },
        });
        break;
      }

      case "data_table": {
        const d = data as DataTableEvent;
        addMessage({
          id: generateId(),
          type: "data_table",
          content: `${d.displayed_rows} of ${d.total_rows} rows`,
          timestamp: new Date(),
          metadata: {
            columns: d.columns,
            rows: d.rows,
            totalRows: d.total_rows,
            displayedRows: d.displayed_rows,
          },
        });
        break;
      }

      case "visualization": {
        const d = data as VisualizationEvent;
        addMessage({
          id: generateId(),
          type: "visualization",
          content: d.filename,
          timestamp: new Date(),
          metadata: {
            visualizationType: d.type,
            visualizationUrl: d.url,
          },
        });
        break;
      }
    }
  }

  function handleError(data: unknown): string {
    const d = data as ErrorEvent;
    const errorMsg = `${d.code}: ${d.message}`;
    addMessage({
      id: generateId(),
      type: "error",
      content: d.message,
      timestamp: new Date(),
      metadata: { errorCode: d.code },
    });
    return errorMsg;
  }

  function reset() {
    streaming = null;
  }

  return { handleEvent, handleError, reset };
}
