"""
GET /api/search?q=query
キーワードで音楽を検索してフィード同様のトラック形式で返す。
"""

import asyncio
from typing import Optional

import aiosqlite
from fastapi import APIRouter, Depends, Query

from database import get_db
from models import SearchResponse
from routers.feed import _build_tracks
from services import youtube_api

router = APIRouter(prefix="/api/search", tags=["search"])


@router.get("", response_model=SearchResponse)
async def search_tracks(
    q: str = Query(..., min_length=1),
    page_token: Optional[str] = Query(None),
    max_results: int = Query(10, ge=1, le=20),
    db: aiosqlite.Connection = Depends(get_db),
):
    raw = youtube_api.search_music(query=q, page_token=page_token, max_results=max_results)
    tracks = await _build_tracks(raw["items"], db)
    return SearchResponse(tracks=tracks, next_page_token=raw.get("next_page_token"))
