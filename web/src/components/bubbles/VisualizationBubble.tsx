import type { VisualizationMessage } from "../../types/events";

export function VisualizationBubble({ message }: { message: VisualizationMessage }) {
  return (
    <div className="message visualization">
      <div className="label">
        {message.metadata.visualizationType === "html" ? "Chart" : "Data Export"}
      </div>
      {message.metadata.visualizationType === "html" ? (
        <iframe
          src={message.metadata.visualizationUrl}
          title={message.content}
          className="chart-frame"
          sandbox="allow-scripts"
        />
      ) : (
        <a href={message.metadata.visualizationUrl} download className="download-link">
          Download {message.content}
        </a>
      )}
    </div>
  );
}
