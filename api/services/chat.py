"""Chat streaming service."""

import json
import logging
import re
from typing import Any, AsyncGenerator
from urllib.parse import quote

from pydantic_ai.messages import (
    TextPartDelta,
    ThinkingPartDelta,
    ToolReturnPart,
)

from api.services.session import Session

logger = logging.getLogger(__name__)

_OPEN = "<thinking>"
_CLOSE = "</thinking>"


class ThinkingTagParser:
    """Stream-aware parser that strips <thinking> tags and routes content.

    Handles tags split across multiple deltas (e.g. "<thin" + "king>").
    Holds back partial tag prefixes until the next chunk confirms or denies.
    """

    def __init__(self) -> None:
        self.inside = False
        self.buffer = ""

    def _has_partial_tag(self) -> bool:
        tag = _CLOSE if self.inside else _OPEN
        for i in range(1, len(tag)):
            if self.buffer.endswith(tag[:i]):
                return True
        return False

    def feed(self, chunk: str) -> list[tuple[str, str]]:
        self.buffer += chunk
        events: list[tuple[str, str]] = []

        while self.buffer:
            tag = _CLOSE if self.inside else _OPEN
            event_type = "thinking_delta" if self.inside else "text_delta"
            idx = self.buffer.find(tag)

            if idx != -1:
                before = self.buffer[:idx]
                if before:
                    events.append((event_type, before))
                self.buffer = self.buffer[idx + len(tag) :]
                self.inside = not self.inside
            else:
                if self._has_partial_tag():
                    break
                if self.buffer:
                    events.append((event_type, self.buffer))
                    self.buffer = ""
                break

        return events

    def flush(self) -> list[tuple[str, str]]:
        if not self.buffer:
            return []
        event_type = "thinking_delta" if self.inside else "text_delta"
        events = [(event_type, self.buffer)]
        self.buffer = ""
        return events

    def reset(self) -> list[tuple[str, str]]:
        """Flush remaining buffer and reset state for a new text part."""
        events = self.flush()
        self.inside = False
        return events


def format_sse(event: str, data: dict[str, Any]) -> str:
    """Format data as Server-Sent Event."""
    return f"event: {event}\ndata: {json.dumps(data, default=str)}\n\n"


async def stream_agent_response(
    session: Session,
    question: str,
) -> AsyncGenerator[str, None]:
    """
    Run agent and stream results as SSE events.

    Uses agent.run_stream_events() for event-based streaming.

    Events emitted:
    - thinking_delta: Thinking content delta
    - text_delta: Response text delta
    - tool_call: Tool invocation
    - tool_result: Tool execution result
    - data_table: Query results table
    - visualization: Generated chart/file URL
    - done: Stream completion
    - error: Error occurred
    """
    session_id = session.id
    logger.info(f"[{session_id}] Starting agent for: {question[:100]}...")

    try:
        yield ": connected\n\n"

        tag_parser = ThinkingTagParser()

        async for event in session.agent.run_stream_events(
            question,
            deps=session.context,
            message_history=session.message_history or None,
        ):
            kind = event.event_kind

            # Part start — carries the first chunk of text content
            if kind == "part_start":
                part = event.part
                if getattr(part, "part_kind", None) == "text":
                    # Reset parser state so each text part starts clean
                    for event_type, content in tag_parser.reset():
                        yield format_sse(event_type, {"content": content})
                    if part.content:
                        for event_type, content in tag_parser.feed(part.content):
                            yield format_sse(event_type, {"content": content})
                elif getattr(part, "part_kind", None) == "thinking" and part.content:
                    yield format_sse("thinking_delta", {"content": part.content})

            # Text/thinking deltas — route through tag parser
            elif kind == "part_delta":
                delta = event.delta
                if isinstance(delta, TextPartDelta) and delta.content_delta:
                    for event_type, content in tag_parser.feed(delta.content_delta):
                        yield format_sse(event_type, {"content": content})
                elif isinstance(delta, ThinkingPartDelta) and delta.content_delta:
                    yield format_sse("thinking_delta", {"content": delta.content_delta})

            # Part end — flush tag parser to emit any buffered content
            elif kind == "part_end":
                for event_type, content in tag_parser.flush():
                    yield format_sse(event_type, {"content": content})

            # Tool call — emitted before execution
            elif kind == "function_tool_call":
                part = event.part
                args = part.args if isinstance(part.args, dict) else {}
                if isinstance(part.args, str):
                    try:
                        args = json.loads(part.args)
                    except json.JSONDecodeError:
                        args = {}
                logger.info(f"[{session_id}] Tool call: {part.tool_name}")
                yield format_sse("tool_call", {
                    "name": part.tool_name,
                    "args": args,
                    "call_id": part.tool_call_id,
                })

            # Tool result — emitted after execution
            elif kind == "function_tool_result":
                result = event.result
                if not isinstance(result, ToolReturnPart):
                    continue

                content = str(result.content)
                tool_name = result.tool_name
                logger.info(f"[{session_id}] Tool result: {tool_name} - {content[:100]}")

                yield format_sse("tool_result", {
                    "name": tool_name,
                    "call_id": result.tool_call_id,
                    "result": content[:500],
                    "success": not content.lower().startswith("error"),
                })

                # Emit data_table event for query_data results
                if tool_name == "query_data" and session.context.current_dataframe is not None:
                    df = session.context.current_dataframe
                    display_df = df.head(100)
                    yield format_sse("data_table", {
                        "columns": display_df.columns.tolist(),
                        "rows": display_df.values.tolist(),
                        "total_rows": len(df),
                        "displayed_rows": len(display_df),
                    })

                # Emit visualization events for generated files
                if "saved to" in content.lower():
                    for pattern, file_type in [
                        (r"output/(.+\.html)", "html"),
                        (r"output/(.+\.csv)", "csv"),
                    ]:
                        match = re.search(pattern, content)
                        if match:
                            filename = match.group(1)
                            encoded = quote(filename, safe="")
                            logger.info(f"[{session_id}] Visualization: {filename}")
                            yield format_sse("visualization", {
                                "type": file_type,
                                "filename": filename,
                                "url": f"/api/files/{encoded}",
                            })

            # Final result — update session history
            elif kind == "agent_run_result":
                session.message_history = list(event.result.all_messages())

        # Flush any remaining buffered content from the tag parser
        for event_type, content in tag_parser.flush():
            yield format_sse(event_type, {"content": content})

        logger.info(f"[{session_id}] Sending done event...")
        yield format_sse("done", {
            "session_id": session_id,
            "message_count": len(session.message_history),
        })

    except Exception as e:
        logger.exception(f"[{session_id}] Error: {e}")
        yield format_sse("error", {"message": str(e), "code": "AGENT_ERROR"})
