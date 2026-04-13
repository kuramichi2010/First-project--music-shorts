"""
ハイライト検出エンジン

優先度:
  1. YouTube チャプター ("chorus", "サビ" 等のラベル)
  2. 概要欄タイムスタンプから「サビ」「chorus」を探す
  3. librosa で RMS エネルギーが最大の 30 秒ウィンドウを検出
  4. フォールバック: 曲全体の 35% 地点
"""

import re
import tempfile
import os
from typing import Optional

import numpy as np

from config import settings

CHORUS_KEYWORDS = re.compile(
    r"(chorus|サビ|さび|refrain|hook|drop|highlight|サビ前|Bメロ|Cメロ)",
    re.IGNORECASE,
)
HIGHLIGHT_DURATION = settings.max_highlight_duration


def detect_from_chapters(chapters: list[dict]) -> Optional[dict]:
    """チャプターリストからサビ相当のチャプターを探す"""
    if not chapters:
        return None

    # サビキーワードを含むチャプターを優先
    for ch in chapters:
        if CHORUS_KEYWORDS.search(ch.get("label", "")):
            start = ch["start"]
            end = ch.get("end", start + HIGHLIGHT_DURATION)
            duration = min(end - start, HIGHLIGHT_DURATION)
            return {"start_time": start, "duration": duration, "method": "chapters"}

    # キーワードがなければ 2 番目以降のチャプターを候補にする（イントロ回避）
    candidates = [c for c in chapters if c["start"] > 30]
    if candidates:
        ch = candidates[0]
        start = ch["start"]
        end = ch.get("end", start + HIGHLIGHT_DURATION)
        duration = min(end - start, HIGHLIGHT_DURATION)
        return {"start_time": start, "duration": duration, "method": "chapters"}

    return None


def detect_from_description(description: str, duration: int) -> Optional[dict]:
    """概要欄のテキストからサビキーワード付きタイムスタンプを探す"""
    pattern = re.compile(
        r"(\d{1,2}:\d{2}(?::\d{2})?)\s*[:\-–]?\s*(.{0,40})",
        re.MULTILINE,
    )
    for match in pattern.finditer(description):
        ts_str, label = match.group(1), match.group(2)
        if not CHORUS_KEYWORDS.search(label):
            continue
        parts = ts_str.split(":")
        if len(parts) == 2:
            start = int(parts[0]) * 60 + int(parts[1])
        else:
            start = int(parts[0]) * 3600 + int(parts[1]) * 60 + int(parts[2])
        if start + HIGHLIGHT_DURATION <= duration:
            return {"start_time": start, "duration": HIGHLIGHT_DURATION, "method": "description"}

    return None


async def detect_from_audio(video_id: str, duration: int) -> Optional[dict]:
    """
    yt-dlp で音声をダウンロードし librosa で RMS エネルギーピークを検出する。
    分析後は一時ファイルを削除する。
    """
    try:
        import yt_dlp
        import librosa
    except ImportError:
        return None

    tmp_path = None
    try:
        with tempfile.NamedTemporaryFile(suffix=".%(ext)s", delete=False) as f:
            tmp_template = f.name

        ydl_opts = {
            "format": "bestaudio/best",
            "outtmpl": tmp_template,
            "quiet": True,
            "no_warnings": True,
            "postprocessors": [
                {
                    "key": "FFmpegExtractAudio",
                    "preferredcodec": "mp3",
                    "preferredquality": "64",  # 低品質で解析用
                }
            ],
        }

        url = f"https://www.youtube.com/watch?v={video_id}"
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.download([url])

        # .mp3 ファイルを特定
        tmp_path = tmp_template.replace(".%(ext)s", ".mp3")
        if not os.path.exists(tmp_path):
            # 別の拡張子を探す
            base = tmp_template.replace(".%(ext)s", "")
            for ext in ("mp3", "m4a", "webm", "opus"):
                candidate = f"{base}.{ext}"
                if os.path.exists(candidate):
                    tmp_path = candidate
                    break
            else:
                return None

        y, sr = librosa.load(tmp_path, sr=22050, mono=True)
        start_time = _find_peak_window(y, sr, HIGHLIGHT_DURATION, duration)
        return {"start_time": start_time, "duration": HIGHLIGHT_DURATION, "method": "ai"}

    except Exception:
        return None
    finally:
        if tmp_path and os.path.exists(tmp_path):
            os.remove(tmp_path)
        # テンプレートファイル本体も削除
        raw = tmp_template.replace(".%(ext)s", "")
        for ext in ("mp3", "m4a", "webm", "opus", ""):
            p = f"{raw}.{ext}" if ext else raw
            if os.path.exists(p):
                os.remove(p)


def _find_peak_window(y: np.ndarray, sr: int, window_sec: int, total_sec: int) -> int:
    """
    RMS エネルギーのフレームごとの値を求め、
    sliding window で合計が最大となる開始位置を返す。
    イントロ（最初の 20%）とアウトロ（最後の 10%）は除外する。
    """
    frame_len = 2048
    hop_len = 512
    rms = librosa.feature.rms(y=y, frame_length=frame_len, hop_length=hop_len)[0]

    window_frames = int(window_sec * sr / hop_len)
    total_frames = len(rms)

    # 除外範囲
    skip_start = int(total_frames * 0.20)
    skip_end = int(total_frames * 0.90)
    search_end = max(skip_end - window_frames, skip_start + 1)

    if search_end <= skip_start:
        # 曲が短すぎる場合はフォールバック
        return int(total_sec * 0.35)

    best_start_frame = skip_start
    best_score = -1.0
    for i in range(skip_start, search_end):
        score = float(np.mean(rms[i : i + window_frames]))
        if score > best_score:
            best_score = score
            best_start_frame = i

    start_sec = int(librosa.frames_to_time(best_start_frame, sr=sr, hop_length=hop_len))
    return start_sec


def fallback_highlight(duration: int) -> dict:
    start = int(duration * 0.35)
    return {"start_time": start, "duration": HIGHLIGHT_DURATION, "method": "fallback"}


async def detect(
    video_id: str,
    duration: int,
    description: str,
    chapters: list[dict],
    use_audio_analysis: bool = True,
) -> dict:
    """ハイライト検出のエントリーポイント"""
    result = detect_from_chapters(chapters)
    if result:
        return result

    result = detect_from_description(description, duration)
    if result:
        return result

    if use_audio_analysis:
        result = await detect_from_audio(video_id, duration)
        if result:
            return result

    return fallback_highlight(duration)
