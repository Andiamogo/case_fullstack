import type { ToolResultMessage } from "../../types/events";

function ToolResultContent({ toolName, content }: { toolName: string; content: string }) {
  if (toolName === "query_data") {
    // Parse the query_data result
    const lines = content.split("\n");
    const resultInfo: { rows?: string; cols?: string; columns?: string } = {};
    let previewStartIndex = -1;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.startsWith("Result:")) {
        const match = line.match(/(\d+) rows x (\d+) columns/);
        if (match) {
          resultInfo.rows = match[1];
          resultInfo.cols = match[2];
        }
      } else if (line.startsWith("Columns:")) {
        resultInfo.columns = line.replace("Columns:", "").trim();
      } else if (line.startsWith("Preview:")) {
        previewStartIndex = i + 1;
        break;
      }
    }

    const preview = previewStartIndex > 0 ? lines.slice(previewStartIndex).join("\n") : "";

    return (
      <div className="tool-result-structured">
        <div className="result-stats">
          {resultInfo.rows && resultInfo.cols && (
            <span className="stat-badge">
              {resultInfo.rows} rows × {resultInfo.cols} cols
            </span>
          )}
        </div>
        {resultInfo.columns && (
          <div className="result-columns">
            <span className="columns-label">Columns:</span>
            <span className="columns-value">{resultInfo.columns}</span>
          </div>
        )}
        {preview && (
          <div className="result-preview">
            <span className="preview-label">Preview:</span>
            <pre className="data-preview">{preview}</pre>
          </div>
        )}
      </div>
    );
  }

  if (toolName === "visualize") {
    // Parse the visualize result
    const lines = content.split("\n");
    const info: { title?: string; type?: string; filepath?: string; traces?: string; shape?: string } = {};

    for (const line of lines) {
      if (line.startsWith("Figure created:") || line.startsWith("Table created:")) {
        info.title = line.split(":").slice(1).join(":").trim();
      } else if (line.startsWith("Saved to:")) {
        info.filepath = line.replace("Saved to:", "").trim();
      } else if (line.startsWith("Type:")) {
        info.type = line.replace("Type:", "").trim();
      } else if (line.startsWith("Traces:")) {
        info.traces = line.replace("Traces:", "").trim();
      } else if (line.startsWith("Shape:")) {
        info.shape = line.replace("Shape:", "").trim();
      }
    }

    return (
      <div className="tool-result-structured">
        <div className="visualization-success">
          {info.title && <div className="viz-title">{info.title}</div>}
          <div className="viz-details">
            {info.type && <span className="viz-badge">{info.type}</span>}
            {info.traces && <span className="viz-info">{info.traces} traces</span>}
            {info.shape && <span className="viz-info">{info.shape}</span>}
          </div>
        </div>
      </div>
    );
  }

  // Default: plain text
  return <div className="content">{content}</div>;
}

export function ToolResultBubble({ message }: { message: ToolResultMessage }) {
  return (
    <div className={`message tool-result ${message.metadata.success ? "success" : "failure"}`}>
      <div className="label">
        {message.metadata.success ? "✓" : "✗"} Result: {message.metadata.toolName}
      </div>
      <ToolResultContent toolName={message.metadata.toolName} content={message.content} />
    </div>
  );
}
