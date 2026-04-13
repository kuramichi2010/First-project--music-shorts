"use client";

import { useEffect, useRef, useState } from "react";
import { Track } from "@/lib/types";
import { searchTracks } from "@/lib/api";
import TrackCard from "./TrackCard";

export default function SearchView() {
  const [query, setQuery] = useState("");
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<{ tracks: Track[]; index: number } | null>(null);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [activeIndex, setActiveIndex] = useState(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const trimmed = query.trim();
    if (!trimmed) { setTracks([]); return; }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await searchTracks(trimmed);
        setTracks(res.tracks);
      } catch {
        setTracks([]);
      } finally {
        setLoading(false);
      }
    }, 400);
  }, [query]);

  const toggleLike = (id: string) => {
    setLikedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // フルスクリーン再生ビュー
  if (selected) {
    const onScroll = (e: React.UIEvent<HTMLDivElement>) => {
      const idx = Math.round(e.currentTarget.scrollTop / e.currentTarget.clientHeight);
      setActiveIndex(idx);
    };
    return (
      <div className="relative h-dvh">
        <div className="feed-scroll" onScroll={onScroll}>
          {selected.tracks.map((track, i) => (
            <TrackCard
              key={track.video_id}
              track={track}
              isActive={activeIndex === i}
              isLiked={likedIds.has(track.video_id)}
              onLike={() => toggleLike(track.video_id)}
            />
          ))}
        </div>
        {/* 閉じるボタン */}
        <button
          onClick={() => { setSelected(null); setActiveIndex(0); }}
          className="absolute top-14 left-4 z-50 w-9 h-9 rounded-full bg-black/50 flex items-center justify-center"
        >
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round"/>
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div className="h-dvh flex flex-col bg-black">
      {/* 検索バー */}
      <div className="pt-16 pb-3 px-4">
        <div className="flex items-center gap-3 bg-white/10 rounded-2xl px-4 py-3">
          <svg className="w-4 h-4 text-white/40 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path d="M21 21l-6-6m2-5a7 7 0 1 1-14 0 7 7 0 0 1 14 0z" strokeLinecap="round"/>
          </svg>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="アーティスト、曲名で検索"
            className="flex-1 bg-transparent text-white placeholder-white/30 text-sm outline-none"
            autoComplete="off"
            autoCorrect="off"
          />
          {query && (
            <button onClick={() => setQuery("")}>
              <svg className="w-4 h-4 text-white/40" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.47 2 2 6.47 2 12s4.47 10 10 10 10-4.47 10-10S17.53 2 12 2zm5 13.59L15.59 17 12 13.41 8.41 17 7 15.59 10.59 12 7 8.41 8.41 7 12 10.59 15.59 7 17 8.41 13.41 12 17 15.59z"/>
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* 結果 */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        {loading && (
          <div className="flex justify-center pt-12">
            <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
          </div>
        )}

        {!loading && query && tracks.length === 0 && (
          <div className="flex flex-col items-center pt-20 gap-3">
            <svg className="w-12 h-12 text-white/15" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <p className="text-white/30 text-sm">見つかりませんでした</p>
          </div>
        )}

        {!loading && !query && (
          <div className="flex flex-col items-center pt-20 gap-3">
            <svg className="w-14 h-14 text-white/10" fill="none" stroke="currentColor" strokeWidth={1.2} viewBox="0 0 24 24">
              <path d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <p className="text-white/25 text-sm">曲やアーティストを検索しよう</p>
          </div>
        )}

        {tracks.map((track, i) => (
          <button
            key={track.video_id}
            onClick={() => { setActiveIndex(i); setSelected({ tracks, index: i }); }}
            className="w-full flex items-center gap-3 px-4 py-3 active:bg-white/5 text-left"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={track.thumbnail_url}
              alt={track.title}
              className="w-14 h-14 rounded-xl object-cover flex-shrink-0"
            />
            <div className="flex-1 min-w-0">
              <p className="text-white font-semibold text-sm truncate">{track.title}</p>
              <p className="text-white/50 text-xs truncate mt-0.5">{track.artist}</p>
            </div>
            <svg className="w-4 h-4 text-white/20 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z"/>
            </svg>
          </button>
        ))}
      </div>
    </div>
  );
}
