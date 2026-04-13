"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Track } from "@/lib/types";
import { fetchFeed } from "@/lib/api";
import TrackCard from "./TrackCard";

export default function FeedView() {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [nextPageToken, setNextPageToken] = useState<string | null>(null);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const scrollRef = useRef<HTMLDivElement>(null);
  const loadingMore = useRef(false);

  const load = useCallback(async () => {
    try {
      const res = await fetchFeed();
      setTracks(res.tracks);
      setNextPageToken(res.next_page_token);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "読み込みに失敗しました");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // スクロール位置からアクティブインデックスを検出
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => {
      const idx = Math.round(el.scrollTop / el.clientHeight);
      setActiveIndex(idx);
      // 末尾に近づいたら追加読み込み
      if (idx >= tracks.length - 3 && nextPageToken && !loadingMore.current) {
        loadingMore.current = true;
        fetchFeed(nextPageToken).then((res) => {
          setTracks((prev) => [...prev, ...res.tracks]);
          setNextPageToken(res.next_page_token);
          loadingMore.current = false;
        }).catch(() => { loadingMore.current = false; });
      }
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [tracks.length, nextPageToken]);

  const toggleLike = (id: string) => {
    setLikedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  if (loading) {
    return (
      <div className="h-dvh flex flex-col items-center justify-center gap-4">
        <div className="w-10 h-10 border-2 border-white/20 border-t-white rounded-full animate-spin" />
        <p className="text-white/50 text-sm">読み込み中...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-dvh flex flex-col items-center justify-center gap-4 px-8">
        <svg className="w-14 h-14 text-white/20" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
          <path d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <p className="text-white/50 text-sm text-center">{error}</p>
        <button
          onClick={load}
          className="px-6 py-2 bg-white/10 rounded-full text-sm text-white/80 active:bg-white/20"
        >
          再試行
        </button>
      </div>
    );
  }

  if (tracks.length === 0) {
    return (
      <div className="h-dvh flex items-center justify-center">
        <p className="text-white/40 text-sm">曲が見つかりません</p>
      </div>
    );
  }

  return (
    <div ref={scrollRef} className="feed-scroll">
      {tracks.map((track, i) => (
        <TrackCard
          key={track.video_id}
          track={track}
          isActive={activeIndex === i}
          isLiked={likedIds.has(track.video_id)}
          onLike={() => toggleLike(track.video_id)}
        />
      ))}
    </div>
  );
}
