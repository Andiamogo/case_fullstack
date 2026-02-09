import type { ErrorMessage } from "../../types/events";

export function ErrorBubble({ message }: { message: ErrorMessage }) {
  return (
    <div className="message error">
      <div className="label">Error {message.metadata.errorCode}</div>
      <div className="content">{message.content}</div>
    </div>
  );
}
