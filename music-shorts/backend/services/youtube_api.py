import re
from typing import Optional
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from config import settings

_youtube = None


def get_youtube():
    global _youtube
    if _youtube is None:
        _youtube = build("youtube", "v3", developerKey=settings.youtube_api_key)
    return _youtube


def _parse_iso8601_duration(duration: str) -> int:
    """PT4M13S -> 253 seconds"""
    match = re.match(r"PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?", duration)
    if not match:
        return 0
    h = int(match.group(1) or 0)
    m = int(match.group(2) or 0)
    s = int(match.group(3) or 0)
    return h * 3600 + m * 60 + s


def _extract_artist(snippet: dict) -> str:
    """チャンネル名から "- Topic" を除去してアーティスト名を推定する"""
    channel = snippet.get("channelTitle", "Unknown")
    return re.sub(r"\s*-\s*Topic$", "", channel).strip()


def _best_thumbnail(thumbnails: dict) -> str:
    for key in ("maxres", "high", "medium", "default"):
        if key in thumbnails:
            return thumbnails[key]["url"]
    return ""


def get_trending_music(page_token: Optional[str] = None, max_results: int = 20) -> dict:
    """YouTube の人気音楽動画を取得する（videoCategoryId=10）"""
    yt = get_youtube()
    try:
        resp = yt.videos().list(
            part="snippet,contentDetails,statistics",
            chart="mostPopular",
            videoCategoryId="10",
            regionCode=settings.region_code,
            maxResults=max_results,
            pageToken=page_token,
        ).execute()
    except HttpError as e:
        raise RuntimeError(f"YouTube API error: {e}") from e

    return _parse_video_list(resp)


def search_music(query: str, page_token: Optional[str] = None, max_results: int = 20) -> dict:
    """キーワードで音楽動画を検索する"""
    yt = get_youtube()
    try:
        search_resp = yt.search().list(
            part="id",
            q=query,
            type="video",
            videoCategoryId="10",
            videoEmbeddable="true",
            maxResults=max_results,
            pageToken=page_token,
        ).execute()
    except HttpError as e:
        raise RuntimeError(f"YouTube API error: {e}") from e

    video_ids = [
        item["id"]["videoId"]
        for item in search_resp.get("items", [])
        if "videoId" in item.get("id", {})
    ]
    next_page_token = search_resp.get("nextPageToken")

    if not video_ids:
        return {"items": [], "next_page_token": None}

    video_resp = yt.videos().list(
        part="snippet,contentDetails",
        id=",".join(video_ids),
    ).execute()

    result = _parse_video_list(video_resp)
    result["next_page_token"] = next_page_token
    return result


def get_video_details(video_id: str) -> Optional[dict]:
    """単一動画の詳細を取得する"""
    yt = get_youtube()
    try:
        resp = yt.videos().list(
            part="snippet,contentDetails",
            id=video_id,
        ).execute()
    except HttpError as e:
        raise RuntimeError(f"YouTube API error: {e}") from e

    items = resp.get("items", [])
    if not items:
        return None

    item = items[0]
    snippet = item["snippet"]
    duration = _parse_iso8601_duration(item["contentDetails"]["duration"])

    return {
        "video_id": video_id,
        "title": snippet["title"],
        "artist": _extract_artist(snippet),
        "thumbnail_url": _best_thumbnail(snippet["thumbnails"]),
        "duration": duration,
        "description": snippet.get("description", ""),
        "chapters": _extract_chapters(snippet.get("description", ""), duration),
    }


def _extract_chapters(description: str, duration: int) -> list[dict]:
    """概要欄からチャプター情報（タイムスタンプ）を抽出する"""
    pattern = re.compile(r"(?:^|\n)(\d{1,2}:\d{2}(?::\d{2})?)\s+(.+)", re.MULTILINE)
    chapters = []
    for match in pattern.finditer(description):
        ts_str, label = match.group(1), match.group(2).strip()
        parts = ts_str.split(":")
        if len(parts) == 2:
            secs = int(parts[0]) * 60 + int(parts[1])
        else:
            secs = int(parts[0]) * 3600 + int(parts[1]) * 60 + int(parts[2])
        chapters.append({"start": secs, "label": label})

    # start 順でソートし、end を補完
    chapters.sort(key=lambda c: c["start"])
    for i, ch in enumerate(chapters):
        ch["end"] = chapters[i + 1]["start"] if i + 1 < len(chapters) else duration

    return chapters


def _parse_video_list(resp: dict) -> dict:
    items = []
    for item in resp.get("items", []):
        snippet = item["snippet"]
        duration = _parse_iso8601_duration(item["contentDetails"]["duration"])
        if duration < 60:  # ショート動画は除外
            continue
        items.append({
            "video_id": item["id"],
            "title": snippet["title"],
            "artist": _extract_artist(snippet),
            "thumbnail_url": _best_thumbnail(snippet["thumbnails"]),
            "duration": duration,
            "description": snippet.get("description", ""),
            "chapters": _extract_chapters(snippet.get("description", ""), duration),
        })
    return {
        "items": items,
        "next_page_token": resp.get("nextPageToken"),
    }
