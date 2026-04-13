"""
GET /api/stream/{video_id}
ストリーム URL を新規取得して返す（期限切れ時の再取得用）。

GET /api/highlight/{video_id}
AI 音声解析を含む精度の高いハイライト検出を実行して返す。
"""

import aiosqlite
from fastapi import APIRouter, Depends, HTTPException

from database import get_db
from models import StreamResponse, Highlight
from services import audio_extractor, highlight_detector, youtube_api

router = APIRouter(prefix="/api", tags=["stream"])


@router.get("/stream/{video_id}", response_model=StreamResponse)
async def get_stream(
    video_id: str,
    db: aiosqlite.Connection = Depends(get_db),
):
    # キャッシュ確認
    async with db.execute(
        """
        SELECT stream_url, expires_at FROM stream_cache
        WHERE video_id = ? AND expires_at > datetime('now')
        """,
        (video_id,),
    ) as cursor:
        row = await cursor.fetchone()

    if row:
        return StreamResponse(video_id=video_id, stream_url=row[0], expires_at=row[1])

    # 新規取得
    data = await audio_extractor.get_stream_url(video_id)
    if not data:
        raise HTTPException(status_code=502, detail="Failed to extract stream URL")

    await db.execute(
        """
        INSERT OR REPLACE INTO stream_cache (video_id, stream_url, expires_at)
        VALUES (?, ?, ?)
        """,
        (video_id, data["stream_url"], data["expires_at"]),
    )
    await db.commit()

    return StreamResponse(video_id=video_id, **data)


@router.get("/highlight/{video_id}", response_model=Highlight)
async def get_highlight(
    video_id: str,
    db: aiosqlite.Connection = Depends(get_db),
):
    """AI 音声解析（librosa）を使った精度の高いハイライト検出"""
    # キャッシュ確認
    async with db.execute(
        "SELECT start_time, duration, method FROM highlight_cache WHERE video_id = ?",
        (video_id,),
    ) as cursor:
        row = await cursor.fetchone()

    # AI 解析済みなら返す
    if row and row[2] in ("ai", "chapters", "description"):
        return Highlight(start_time=row[0], duration=row[1], method=row[2])

    # 動画詳細を取得して AI 解析
    details = youtube_api.get_video_details(video_id)
    if not details:
        raise HTTPException(status_code=404, detail="Video not found")

    result = await highlight_detector.detect(
        video_id=video_id,
        duration=details["duration"],
        description=details["description"],
        chapters=details["chapters"],
        use_audio_analysis=True,  # AI 解析を有効化
    )

    # キャッシュ更新
    await db.execute(
        """
        INSERT OR REPLACE INTO highlight_cache (video_id, start_time, duration, method)
        VALUES (?, ?, ?, ?)
        """,
        (video_id, result["start_time"], result["duration"], result["method"]),
    )
    await db.commit()

    return Highlight(**result)
