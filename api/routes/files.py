"""
File serving routes for generated visualizations and exports.
"""

from pathlib import Path

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse

router = APIRouter(prefix="/files", tags=["files"])

# Output directory for generated files
OUTPUT_DIR = Path("output")


@router.get("/{filename}")
async def get_file(filename: str) -> FileResponse:
    """
    Serve generated files (HTML charts, CSV exports).

    Security: Only serves files from the output/ directory.
    """
    # Sanitize filename to prevent path traversal
    safe_filename = Path(filename).name
    file_path = OUTPUT_DIR / safe_filename

    if not file_path.exists():
        raise HTTPException(status_code=404, detail=f"File not found: {filename}")

    # Determine media type
    suffix = file_path.suffix.lower()
    media_types = {
        ".html": "text/html",
        ".csv": "text/csv",
        ".json": "application/json",
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".svg": "image/svg+xml",
    }
    media_type = media_types.get(suffix, "application/octet-stream")

    # Only set filename for downloadable files (triggers download instead of inline display)
    download_name = safe_filename if suffix in {".csv", ".json"} else None

    return FileResponse(
        path=file_path,
        media_type=media_type,
        filename=download_name,
    )


@router.get("")
async def list_files() -> dict[str, list[dict]]:
    """List all generated files in the output directory."""
    if not OUTPUT_DIR.exists():
        return {"files": []}

    files = []
    for file_path in OUTPUT_DIR.iterdir():
        if file_path.is_file():
            files.append({
                "name": file_path.name,
                "size": file_path.stat().st_size,
                "url": f"/api/files/{file_path.name}",
            })

    return {"files": sorted(files, key=lambda f: f["name"])}
