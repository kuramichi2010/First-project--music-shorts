"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Track } from "@/lib/types";
import { refreshStream } from "@/lib/api";
import { increment } from "@/lib/replayStore";
import Waveform from "./Waveform";

interface TrackCardProps {
  track: Track;
  isActive: boolean;
  isLiked: boolean;
  onLike: () => void;
}

export default function TrackCard({ track, isActive, isLiked, onLike }: TrackCardProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const seekBarRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);   // 0~1（現在のモード内の進捗）
  const [isFullMode, setIsFullMode] = useState(false);
  const [audioDuration, setAudioDuration] = useState(0);
  const [rotation, setRotation] = useState(0);
  const rotationRef = useRef(0);
  const rafRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isSeeking = useRef(false);

  const startTime = track.highlight.start_time;
  const clipDuration = track.highlight.duration;

  // ---- 再生開始 ----
  const startPlayback = useCallback(async (full = false) => {
    const audio = audioRef.current;
    if (!audio) return;

    const expiresAt = new Date(track.stream_expires_at);
    if (!audio.src || expiresAt < new Date()) {
      try {
        const fresh = await refreshStream(track.video_id);
        audio.src = fresh.stream_url;
      } catch { return; }
    }

    audio.currentTime = full ? 0 : startTime;
    try {
      await audio.play();
      setIsPlaying(true);
    } catch { /* autoplay blocked */ }
  }, [track, startTime]);

  // ---- アクティブ切り替え ----
  useEffect(() => {
    if (isActive) {
      startPlayback(isFullMode);
    } else {
      audioRef.current?.pause();
      setIsPlaying(false);
      setProgress(0);
    }
    return () => { audioRef.current?.pause(); };
  }, [isActive]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- モード切替 ----
  const switchMode = async (full: boolean) => {
    setIsFullMode(full);
    setProgress(0);
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = full ? 0 : startTime;
    if (isPlaying) {
      try { await audio.play(); } catch { /* ignore */ }
    }
  };

  // ---- プログレス追跡・ループ ----
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (!isPlaying) return;

    timerRef.current = setInterval(() => {
      const audio = audioRef.current;
      if (!audio || isSeeking.current) return;

      if (isFullMode) {
        const dur = audio.duration || track.duration;
        setProgress(audio.currentTime / dur);
        // フルモードは自然に止まる（ended イベントで対応）
      } else {
        const elapsed = audio.currentTime - startTime;
        const p = Math.max(0, Math.min(1, elapsed / clipDuration));
        setProgress(p);
        // ハイライト末尾でループ + 再生回数カウント
        if (audio.currentTime >= startTime + clipDuration) {
          increment(track.video_id);
          audio.currentTime = startTime;
          setProgress(0);
        }
      }
    }, 50);

    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isPlaying, isFullMode, startTime, clipDuration, track.duration, track.video_id]);

  // フル再生が終わったら停止
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onEnded = () => { setIsPlaying(false); setProgress(1); };
    const onLoaded = () => setAudioDuration(audio.duration);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("loadedmetadata", onLoaded);
    return () => {
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("loadedmetadata", onLoaded);
    };
  }, []);

  // ---- アルバムアート回転 ----
  useEffect(() => {
    cancelAnimationFrame(rafRef.current);
    if (!isPlaying) return;
    const animate = () => {
      rotationRef.current = (rotationRef.current + 0.3) % 360;
      setRotation(rotationRef.current);
      rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [isPlaying]);

  // ---- タップ再生/停止 ----
  const togglePlay = async () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause(); setIsPlaying(false);
    } else {
      if (!audio.src) await startPlayback(isFullMode);
      else { await audio.play(); setIsPlaying(true); }
    }
  };

  // ---- シーク ----
  const seekTo = useCallback((clientX: number) => {
    const bar = seekBarRef.current;
    const audio = audioRef.current;
    if (!bar || !audio) return;
    const rect = bar.getBoundingClientRect();
    const frac = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    if (isFullMode) {
      const dur = audioDuration || track.duration;
      audio.currentTime = frac * dur;
    } else {
      audio.currentTime = startTime + frac * clipDuration;
    }
    setProgress(frac);
  }, [isFullMode, audioDuration, track.duration, startTime, clipDuration]);

  const onSeekTouch = (e: React.TouchEvent) => {
    isSeeking.current = true;
    seekTo(e.touches[0].clientX);
  };
  const onSeekTouchMove = (e: React.TouchEvent) => {
    seekTo(e.touches[0].clientX);
  };
  const onSeekTouchEnd = () => { isSeeking.current = false; };
  const onSeekClick = (e: React.MouseEvent) => { seekTo(e.clientX); };

  // ---- 時間フォーマット ----
  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

  const displayDuration = isFullMode ? (audioDuration || track.duration) : clipDuration;
  const currentSec = isFullMode
    ? progress * (audioDuration || track.duration)
    : startTime + progress * clipDuration;

  return (
    <div className="snap-card flex flex-col overflow-hidden">
      {/* 背景 */}
      <div className="absolute inset-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={track.thumbnail_url} alt="" className="w-full h-full object-cover opacity-40 blur-2xl scale-110" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/90" />
      </div>

      <div className="relative flex-1 flex flex-col justify-end pb-24 px-5">

        {/* Shorts / Full 切替 */}
        <div className="flex mb-5">
          <div className="flex bg-white/10 rounded-full p-1 gap-1">
            <button
              onClick={() => switchMode(false)}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
                !isFullMode ? "bg-white text-black" : "text-white/60"
              }`}
            >
              Shorts
            </button>
            <button
              onClick={() => switchMode(true)}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
                isFullMode ? "bg-white text-black" : "text-white/60"
              }`}
            >
              Full
            </button>
          </div>
        </div>

        {/* アルバムアート + 曲情報 + ボタン */}
        <div className="flex items-end gap-4 mb-5">
          {/* アルバムアート */}
          <button onClick={togglePlay} className="relative flex-shrink-0" style={{ width: 96, height: 96 }}>
            <div className="absolute inset-0 rounded-full border border-white/10" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={track.thumbnail_url}
              alt={track.title}
              className="w-full h-full rounded-full object-cover"
              style={{ transform: `rotate(${rotation}deg)` }}
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-4 h-4 rounded-full bg-black" />
            </div>
            {!isPlaying && (
              <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center">
                <svg className="w-7 h-7 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
            )}
          </button>

          {/* 曲情報 */}
          <div className="flex-1 min-w-0">
            <p className="text-white/60 text-xs font-semibold truncate mb-1">{track.artist}</p>
            <p className="text-white font-bold text-base leading-tight line-clamp-2">{track.title}</p>
            {!isFullMode && (
              <p className="text-white/40 text-[11px] mt-1">
                ハイライト {fmt(startTime)} 〜 {fmt(startTime + clipDuration)}
              </p>
            )}
          </div>

          {/* アクションボタン */}
          <div className="flex flex-col items-center gap-5 pb-1">
            <button onClick={onLike} className="flex flex-col items-center gap-1">
              <svg
                className="w-7 h-7 transition-colors duration-200"
                fill={isLiked ? "#ff2d55" : "none"}
                stroke={isLiked ? "#ff2d55" : "white"}
                strokeWidth={1.8}
                viewBox="0 0 24 24"
              >
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span className="text-white/70 text-[10px]">{isLiked ? "Liked" : "Like"}</span>
            </button>

            <button
              onClick={() => window.open(`https://www.youtube.com/watch?v=${track.video_id}`, "_blank")}
              className="flex flex-col items-center gap-1"
            >
              <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
              </svg>
              <span className="text-white/70 text-[10px]">YouTube</span>
            </button>

            <button
              onClick={() => navigator.share?.({ title: `${track.title} - ${track.artist}`, url: `https://youtu.be/${track.video_id}` })}
              className="flex flex-col items-center gap-1"
            >
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8M16 6l-4-4-4 4M12 2v13" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span className="text-white/70 text-[10px]">Share</span>
            </button>
          </div>
        </div>

        {/* 波形 */}
        <Waveform isPlaying={isPlaying} progress={progress} />

        {/* シークバー（タッチ操作対応） */}
        <div className="mt-3 flex items-center gap-3">
          <span className="text-white/40 text-[10px] tabular-nums w-8 text-right">{fmt(currentSec)}</span>

          <div
            ref={seekBarRef}
            className="flex-1 h-8 flex items-center cursor-pointer group"
            onClick={onSeekClick}
            onTouchStart={onSeekTouch}
            onTouchMove={onSeekTouchMove}
            onTouchEnd={onSeekTouchEnd}
          >
            <div className="relative w-full h-1 bg-white/20 rounded-full">
              {/* 再生済みバー */}
              <div
                className="absolute left-0 top-0 h-full bg-white rounded-full"
                style={{ width: `${progress * 100}%` }}
              />
              {/* サム（つまみ） */}
              <div
                className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-white rounded-full shadow-md transition-transform group-active:scale-125"
                style={{ left: `calc(${progress * 100}% - 7px)` }}
              />
            </div>
          </div>

          <span className="text-white/40 text-[10px] tabular-nums w-8">{fmt(displayDuration)}</span>
        </div>
      </div>

      <audio ref={audioRef} preload="none" playsInline />
    </div>
  );
}
