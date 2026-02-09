import type { ToolCallMessage } from "../../types/events";

function ToolCallArgs({ toolName, args }: { toolName: string; args: Record<string, unknown> }) {
  const description = args.description ? String(args.description) : null;
  const sql = args.sql ? String(args.sql) : null;
  const title = args.title ? String(args.title) : null;
  const resultType = args.result_type ? String(args.result_type) : null;
  const code = args.code ? String(args.code) : null;

  if (toolName === "query_data") {
    return (
      <div className="tool-args-structured">
        {description && (
          <div className="tool-arg-item">
            <span className="tool-arg-label">Description:</span>
            <span className="tool-arg-value">{description}</span>
          </div>
        )}
        {sql && (
          <div className="tool-arg-item">
            <span className="tool-arg-label">SQL:</span>
            <pre className="sql-code">{sql}</pre>
          </div>
        )}
      </div>
    );
  }

  if (toolName === "visualize") {
    return (
      <div className="tool-args-structured">
        {title && (
          <div className="tool-arg-item">
            <span className="tool-arg-label">Title:</span>
            <span className="tool-arg-value">{title}</span>
          </div>
        )}
        {resultType && (
          <div className="tool-arg-item">
            <span className="tool-arg-label">Type:</span>
            <span className="tool-arg-badge">{resultType}</span>
          </div>
        )}
        {description && (
          <div className="tool-arg-item">
            <span className="tool-arg-label">Description:</span>
            <span className="tool-arg-value">{description}</span>
          </div>
        )}
        {code && (
          <div className="tool-arg-item">
            <span className="tool-arg-label">Code:</span>
            <pre className="python-code">{code}</pre>
          </div>
        )}
      </div>
    );
  }

  // Default: JSON display
  return <pre className="args">{JSON.stringify(args, null, 2)}</pre>;
}

export function ToolCallBubble({ message }: { message: ToolCallMessage }) {
  return (
    <div className="message tool-call">
      <div className="label">
        {message.metadata.toolName === "query_data" ? "📊 Query Data" :
         message.metadata.toolName === "visualize" ? "📈 Visualize" :
         `Tool: ${message.metadata.toolName}`}
      </div>
      <ToolCallArgs toolName={message.metadata.toolName} args={message.metadata.toolArgs} />
    </div>
  );
}
