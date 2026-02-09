"""
FastAPI application for the Data Analysis Agent.

Run with:
    uvicorn api.main:app --reload --port 8000
"""

import logging
import sys
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)
logger = logging.getLogger(__name__)

load_dotenv()

from api.routes.chat import router as chat_router
from api.routes.files import router as files_router
from api.services.session import session_manager


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Application lifespan: startup and shutdown."""
    # Startup: datasets are loaded by session_manager on import
    logger.info(f"Loaded {len(session_manager.datasets)} datasets")
    logger.info(f"Dataset info:\n{session_manager.dataset_info}")
    yield
    # Shutdown: cleanup if needed
    logger.info("Shutting down...")


app = FastAPI(
    title="Data Analysis Agent API",
    description="AI-powered data analysis with SQL queries and visualizations",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS configuration for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",  # React dev server
        "http://localhost:5173",  # Vite dev server
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount routers
app.include_router(chat_router, prefix="/api")
app.include_router(files_router, prefix="/api")


@app.get("/")
async def root() -> dict[str, str]:
    """Health check endpoint."""
    return {"status": "ok", "service": "data-analysis-agent"}


@app.get("/api/datasets")
async def list_datasets() -> dict[str, list[dict]]:
    """List available datasets with their schemas."""
    datasets = []
    for name, df in session_manager.datasets.items():
        datasets.append({
            "name": name,
            "rows": df.shape[0],
            "columns": df.shape[1],
            "schema": [
                {"name": col, "dtype": str(df[col].dtype)}
                for col in df.columns
            ],
        })
    return {"datasets": datasets}
