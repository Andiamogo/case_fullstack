import type { UserMessage } from "../../types/events";

export function UserBubble({ message }: { message: UserMessage }) {
  return (
    <div className="message user">
      <div className="content">{message.content}</div>
    </div>
  );
}
