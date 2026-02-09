/**
 * SSE Event types from the Data Analysis Agent API
 */

export type SSEEventType =
  | "thinking_delta"
  | "text_delta"
  | "tool_call"
  | "tool_result"
  | "data_table"
  | "visualization"
  | "error";

export interface ThinkingDeltaEvent {
  content: string;
}

export interface TextDeltaEvent {
  content: string;
}

export interface ToolCallEvent {
  name: string;
  args: Record<string, unknown>;
  call_id: string;
}

export interface ToolResultEvent {
  name: string;
  call_id: string;
  result: string;
  success: boolean;
}


export type CellValue = string | number | boolean | null;

export interface DataTableEvent {
  columns: string[];
  rows: CellValue[][];
  total_rows: number;
  displayed_rows: number;
}

export interface VisualizationEvent {
  type: "html" | "csv";
  filename: string;
  url: string;
}

export interface ErrorEvent {
  message: string;
  code: string;
}

/**
 * Discriminated union for chat messages displayed in the UI
 */

interface BaseMessage {
  id: string;
  content: string;
  timestamp: Date;
}

export interface UserMessage extends BaseMessage {
  type: "user";
}

export interface AssistantMessage extends BaseMessage {
  type: "assistant";
}

export interface ThinkingMessage extends BaseMessage {
  type: "thinking";
}

export interface ToolCallMessage extends BaseMessage {
  type: "tool_call";
  metadata: {
    toolName: string;
    toolArgs: Record<string, unknown>;
    callId: string;
  };
}

export interface ToolResultMessage extends BaseMessage {
  type: "tool_result";
  metadata: {
    toolName: string;
    callId: string;
    success: boolean;
  };
}

export interface DataTableMessage extends BaseMessage {
  type: "data_table";
  metadata: {
    columns: string[];
    rows: CellValue[][];
    totalRows: number;
    displayedRows: number;
  };
}

export interface VisualizationMessage extends BaseMessage {
  type: "visualization";
  metadata: {
    visualizationType: "html" | "csv";
    visualizationUrl: string;
  };
}

export interface ErrorMessage extends BaseMessage {
  type: "error";
  metadata: {
    errorCode: string;
  };
}

export type ChatMessage =
  | UserMessage
  | AssistantMessage
  | ThinkingMessage
  | ToolCallMessage
  | ToolResultMessage
  | DataTableMessage
  | VisualizationMessage
  | ErrorMessage;
