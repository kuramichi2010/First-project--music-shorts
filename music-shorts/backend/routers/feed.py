"""
GET /api/feed
トレンドの音楽動画フィードを返す。
ハイライトとストリーム URL を付与してクライアントがそのまま再生できる形式にする。
"""

import asyncio
from typing import Optional

import aiosqlite
from fastapi import APIRouter, Depends, Query

from database import get_db
from models import FeedResponse, Track, Highlight
from services import youtube_api, highlight_detector, audio_extractor

router = APIRouter(prefix="/api/feed", tags=["feed"])


@router.get("", response_model=FeedResponse)
async def get_feed(
    page_token: Optional[str] = Query(None),
    max_results: int = Query(10, ge=1, le=20),
    db: aiosqlite.Connection = Depends(get_db),
):
    raw = youtube_api.get_trending_music(page_token=page_token, max_results=max_results)
    tracks = await _build_tracks(raw["items"], db)
    return FeedResponse(tracks=tracks, next_page_token=raw.get("next_page_token"))


async def _build_tracks(items: list[dict], db: aiosqlite.Connection) -> list[Track]:
    tasks = [_build_single_track(item, db) for item in items]
    results = await asyncio.gather(*tasks, return_exceptions=True)
    return [r for r in results if isinstance(r, Track)]


async def _build_single_track(item: dict, db: aiosqlite.Connection) -> Track:
    video_id = item["video_id"]

    # ハイライト: キャッシュ確認 → 検出
    highlight_data = await _get_cached_highlight(db, video_id)
    if not highlight_data:
        highlight_data = await highlight_detector.detect(
            video_id=video_id,
            duration=item["duration"],
            description=item["description"],
            chapters=item["chapters"],
            use_audio_analysis=False,  # フィードは高速応答優先、AI 解析は別途
        )
        await _cache_highlight(db, video_id, highlight_data)

    # ストリーム URL: キャッシュ確認 → 取得
    stream_data = await _get_cached_stream(db, video_id)
    if not stream_data:
        stream_data = await audio_extractor.get_stream_url(video_id)
        if stream_data:
            await _cache_stream(db, video_id, stream_data)
        else:
            # ストリーム取得失敗時はスキップ
            raise ValueError(f"Failed to get stream for {video_id}")

    return Track(
        video_id=video_id,
        title=item["title"],
        artist=item["artist"],
        thumbnail_url=item["thumbnail_url"],
        duration=item["duration"],
        highlight=Highlight(**highlight_data),
        stream_url=stream_data["stream_url"],
        stream_expires_at=stream_data["expires_at"],
    )


async def _get_cached_highlight(db: aiosqlite.Connection, video_id: str) -> Optional[dict]:
    async with db.execute(
        "SELECT start_time, duration, method FROM highlight_cache WHERE video_id = ?",
        (video_id,),
    ) as cursor:
        row = await cursor.fetchone()
    if row:
        return {"start_time": row[0], "duration": row[1], "method": row[2]}
    return None


async def _cache_highlight(db: aiosqlite.Connection, video_id: str, data: dict):
    await db.execute(
        """
        INSERT OR REPLACE INTO highlight_cache (video_id, start_time, duration, method)
        VALUES (?, ?, ?, ?)
        """,
        (video_id, data["start_time"], data["duration"], data["method"]),
    )
    await db.commit()


async def _get_cached_stream(db: aiosqlite.Connection, video_id: str) -> Optional[dict]:
    async with db.execute(
        """
        SELECT stream_url, expires_at FROM stream_cache
        WHERE video_id = ? AND expires_at > datetime('now')
        """,
        (video_id,),
    ) as cursor:
        row = await cursor.fetchone()
    if row:
        return {"stream_url": row[0], "expires_at": row[1]}
    return None


async def _cache_stream(db: aiosqlite.Connection, video_id: str, data: dict):
    await db.execute(
        """
        INSERT OR REPLACE INTO stream_cache (video_id, stream_url, expires_at)
        VALUES (?, ?, ?)
        """,
        (video_id, data["stream_url"], data["expires_at"]),
    )
    await db.commit()
