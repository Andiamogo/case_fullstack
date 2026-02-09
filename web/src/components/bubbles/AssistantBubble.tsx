import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { AssistantMessage } from "../../types/events";

export function AssistantBubble({ message }: { message: AssistantMessage }) {
  return (
    <div className="message assistant">
      <div className="content">
        <Markdown remarkPlugins={[remarkGfm]}>{message.content}</Markdown>
      </div>
    </div>
  );
}
