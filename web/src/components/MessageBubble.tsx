import type { ChatMessage } from "../types/events";
import { ThinkingBubble } from "./bubbles/ThinkingBubble";
import { UserBubble } from "./bubbles/UserBubble";
import { AssistantBubble } from "./bubbles/AssistantBubble";
import { ToolCallBubble } from "./bubbles/ToolCallBubble";
import { ToolResultBubble } from "./bubbles/ToolResultBubble";
import { DataTableBubble } from "./bubbles/DataTableBubble";
import { VisualizationBubble } from "./bubbles/VisualizationBubble";
import { ErrorBubble } from "./bubbles/ErrorBubble";

export function MessageBubble({ message }: { message: ChatMessage }) {
  switch (message.type) {
    case "user":
      return <UserBubble message={message} />;
    case "assistant":
      return <AssistantBubble message={message} />;
    case "thinking":
      return <ThinkingBubble content={message.content} />;
    case "tool_call":
      return <ToolCallBubble message={message} />;
    case "tool_result":
      return <ToolResultBubble message={message} />;
    case "data_table":
      return <DataTableBubble message={message} />;
    case "visualization":
      return <VisualizationBubble message={message} />;
    case "error":
      return <ErrorBubble message={message} />;
    default:
      return null;
  }
}
