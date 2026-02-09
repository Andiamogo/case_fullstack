from typing import Optional

from pydantic import BaseModel, Field, field_validator


class ChatRequest(BaseModel):

    question: str = Field(..., min_length=1, description="User's question")
    session_id: Optional[str] = Field(
        None, description="Session ID for continuing conversation"
    )

    @field_validator("question")
    @classmethod
    def question_must_have_content(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Question must contain non-whitespace characters")
        return v
