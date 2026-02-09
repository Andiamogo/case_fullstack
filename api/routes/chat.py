"""Chat routes."""

import json
from typing import Any

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic_ai.messages import (
    ModelRequest,
    ModelResponse,
    TextPart,
    ToolCallPart,
    ToolReturnPart,
)

from api.models.schemas import ChatRequest
from api.services.chat import stream_agent_response
from api.services.session import session_manager

router = APIRouter(prefix="/chat", tags=["chat"])


@router.post("/stream")
async def stream_chat(request: ChatRequest) -> StreamingResponse:
    """Stream a chat response via SSE."""
    session = session_manager.get_or_create_session(request.session_id)

    return StreamingResponse(
        stream_agent_response(session, request.question),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.delete("/{session_id}")
async def delete_chat(session_id: str) -> dict[str, str]:
    """Delete a chat session."""
    if session_manager.delete_session(session_id):
        return {"status": "deleted", "session_id": session_id}
    raise HTTPException(status_code=404, detail="Session not found")


@router.get("/{session_id}/history")
async def get_history(session_id: str) -> dict[str, Any]:
    """Get conversation history for a session."""
    session = session_manager.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    history = []
    for msg in session.message_history:
        if isinstance(msg, ModelResponse):
            for part in msg.parts:
                if isinstance(part, TextPart):
                    history.append({"role": "assistant", "content": part.content})
                elif isinstance(part, ToolCallPart):
                    args = part.args if isinstance(part.args, dict) else {}
                    if isinstance(part.args, str):
                        try:
                            args = json.loads(part.args)
                        except json.JSONDecodeError:
                            args = {}
                    history.append({"role": "tool_call", "tool": part.tool_name, "args": args})
        elif isinstance(msg, ModelRequest):
            for part in msg.parts:
                if isinstance(part, ToolReturnPart):
                    history.append({"role": "tool_result", "tool": part.tool_name, "result": str(part.content)[:500]})

    return {"session_id": session_id, "message_count": len(session.message_history), "history": history}
