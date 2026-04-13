from pydantic import BaseModel
from typing import Optional


class Highlight(BaseModel):
    start_time: int        # seconds
    duration: int          # seconds
    method: str            # "chapters" | "description" | "ai" | "fallback"


class Track(BaseModel):
    video_id: str
    title: str
    artist: str
    thumbnail_url: str
    duration: int          # total seconds
    highlight: Highlight
    stream_url: str
    stream_expires_at: str  # ISO 8601


class FeedResponse(BaseModel):
    tracks: list[Track]
    next_page_token: Optional[str] = None


class SearchResponse(BaseModel):
    tracks: list[Track]
    next_page_token: Optional[str] = None


class StreamResponse(BaseModel):
    video_id: str
    stream_url: str
    expires_at: str
