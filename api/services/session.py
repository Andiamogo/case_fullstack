"""Session management for multi-turn conversations."""

import re
import uuid
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Optional

import pandas as pd
from pydantic_ai import Agent

from agent.agent import create_agent
from agent.context import AgentContext


@dataclass
class Session:
    """A chat session with its own agent context and message history."""

    id: str
    context: AgentContext
    agent: Agent[AgentContext]
    message_history: list[Any] = field(default_factory=list)


class SessionManager:
    """Manages chat sessions in memory."""

    def __init__(self, data_dir: str = "data"):
        self._sessions: dict[str, Session] = {}
        self._datasets: dict[str, pd.DataFrame] = {}
        self._dataset_info: str = ""
        self._data_dir = data_dir
        self._load_datasets()

    def _load_datasets(self) -> None:
        """Load all CSV files from data directory."""
        data_path = Path(self._data_dir)
        if not data_path.exists():
            data_path.mkdir(parents=True, exist_ok=True)
            self._dataset_info = "No datasets available."
            return

        info_lines: list[str] = []

        for csv_file in sorted(data_path.glob("*.csv")):
            name = re.sub(r"[^a-zA-Z0-9_]", "_", csv_file.stem).strip("_").lower()
            df = pd.read_csv(csv_file)
            self._datasets[name] = df

            cols = ", ".join(df.columns.tolist())
            info_lines.append(
                f"- **{name}** ({df.shape[0]} rows, {df.shape[1]} columns)\n"
                f"  Columns: {cols}"
            )

        if not info_lines:
            self._dataset_info = "No datasets available."
        else:
            self._dataset_info = "\n".join(info_lines)

    def create_session(self, session_id: Optional[str] = None) -> Session:
        """Create a new chat session."""
        sid = session_id or str(uuid.uuid4())

        if sid in self._sessions:
            return self._sessions[sid]

        context = AgentContext(
            datasets=self._datasets.copy(),
            dataset_info=self._dataset_info,
        )
        agent = create_agent(self._dataset_info)

        session = Session(
            id=sid,
            context=context,
            agent=agent,
        )
        self._sessions[sid] = session
        return session

    def get_session(self, session_id: str) -> Optional[Session]:
        """Get an existing session by ID."""
        return self._sessions.get(session_id)

    def get_or_create_session(self, session_id: Optional[str] = None) -> Session:
        """Get existing session or create new one."""
        if session_id and session_id in self._sessions:
            return self._sessions[session_id]
        return self.create_session(session_id)

    def delete_session(self, session_id: str) -> bool:
        """Delete a session."""
        if session_id in self._sessions:
            del self._sessions[session_id]
            return True
        return False

    @property
    def datasets(self) -> dict[str, pd.DataFrame]:
        """Get loaded datasets."""
        return self._datasets

    @property
    def dataset_info(self) -> str:
        """Get dataset info string."""
        return self._dataset_info


# Global session manager instance
session_manager = SessionManager()
