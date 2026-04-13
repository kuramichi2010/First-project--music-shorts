"""
yt-dlp を使って YouTube 動画の音声ストリーム URL を取得する。
実際にダウンロードはせず、直接再生可能な URL を返す。
"""

import asyncio
import os
import contextlib
from datetime import datetime, timedelta, timezone
from typing import Optional

import yt_dlp


@contextlib.contextmanager
def _suppress_stderr():
    """yt-dlp が stderr に直接書くエラーを抑制する"""
    with open(os.devnull, "w") as devnull:
        old = os.dup(2)
        os.dup2(devnull.fileno(), 2)
        try:
            yield
        finally:
            os.dup2(old, 2)
            os.close(old)


def _extract_stream_url_sync(video_id: str) -> Optional[dict]:
    url = f"https://www.youtube.com/watch?v={video_id}"

    base_opts = {
        "format": "bestaudio/best",
        "quiet": True,
        "no_warnings": True,
        "skip_download": True,
    }

    # Cookie なし → Safari → Chrome の順で試みる（パーミッションエラーは無視）
    attempts = [
        base_opts,
        {**base_opts, "cookiesfrombrowser": ("safari",)},
        {**base_opts, "cookiesfrombrowser": ("chrome",)},
    ]

    for ydl_opts in attempts:
        try:
            with _suppress_stderr(), yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(url, download=False)

            formats = info.get("formats", [])
            audio_formats = [
                f for f in formats
                if f.get("acodec") != "none" and f.get("vcodec") == "none"
            ]
            if not audio_formats:
                audio_formats = [f for f in formats if f.get("acodec") != "none"]

            if not audio_formats:
                continue

            best = max(audio_formats, key=lambda f: f.get("abr") or 0)
            stream_url = best.get("url")
            if not stream_url:
                continue

            expires_at = datetime.now(timezone.utc) + timedelta(hours=5, minutes=30)
            return {
                "stream_url": stream_url,
                "expires_at": expires_at.isoformat(),
            }

        except Exception:
            continue

    return None


async def get_stream_url(video_id: str) -> Optional[dict]:
    """非同期ラッパー: blocking な yt-dlp を別スレッドで実行する"""
    loop = asyncio.get_event_loop()
    result = await loop.run_in_executor(None, _extract_stream_url_sync, video_id)
    return result
