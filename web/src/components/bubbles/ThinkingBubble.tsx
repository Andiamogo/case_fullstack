import { useState } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

/**
 * Collapsible thinking bubble component
 */
export function ThinkingBubble({ content }: { content: string }) {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div className="message thinking">
      <button
        className="thinking-toggle"
        onClick={() => setIsExpanded(!isExpanded)}
        aria-expanded={isExpanded}
      >
        <span className={`toggle-arrow ${isExpanded ? "expanded" : ""}`}>▶</span>
        <span className="label">Thinking</span>
      </button>
      {isExpanded && (
        <div className="content">
          <Markdown remarkPlugins={[remarkGfm]}>{content}</Markdown>
        </div>
      )}
    </div>
  );
}
