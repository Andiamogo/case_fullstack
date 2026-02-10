"""Chat routes."""

from typing import Optional

from fastapi import APIRouter
from fastapi.responses import StreamingResponse

from api.services.chat import stream_agent_response
from api.services.session import session_manager

router = APIRouter(prefix="/chat", tags=["chat"])


@router.get("/stream")
async def stream_chat(question: str, session_id: Optional[str] = None) -> StreamingResponse:
    session = session_manager.get_or_create_session(session_id)

    return StreamingResponse(
        stream_agent_response(session, question),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
