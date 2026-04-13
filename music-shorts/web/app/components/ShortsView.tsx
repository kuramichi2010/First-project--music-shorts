"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Track } from "@/lib/types";
import { fetchFeed, searchTracks } from "@/lib/api";
import { getSortedIds, getCount } from "@/lib/replayStore";
import TrackCard from "./TrackCard";

export default function ShortsView() {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasHistory, setHasHistory] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const scrollRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    const sortedIds = getSortedIds(); // 再生回数多い順の video_id

    if (sortedIds.length === 0) {
      // 再生履歴なし → フィードからデータだけ取得して提示
      setHasHistory(false);
      try {
        const res = await fetchFeed();
        setTracks(res.tracks);
      } catch { /* ignore */ }
      setLoading(false);
      return;
    }

    setHasHistory(true);

    // video_id ごとに YouTube 検索して Track データを取得
    // （バックエンドに id 指定のエンドポイントがないので search で代用）
    const fetched: Track[] = [];
    await Promise.allSettled(
      sortedIds.slice(0, 20).map(async (id) => {
        try {
          const res = await searchTracks(id);
          const match = res.tracks.find((t) => t.video_id === id);
          if (match) fetched.push(match);
        } catch { /* skip */ }
      })
    );

    // 再生回数順に並べ直す
    fetched.sort((a, b) => getCount(b.video_id) - getCount(a.video_id));
    setTracks(fetched);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => {
      setActiveIndex(Math.round(el.scrollTop / el.clientHeight));
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

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

  // 再生履歴なし
  if (!hasHistory) {
    return (
      <div className="h-dvh flex flex-col">
        {/* ヘッダー */}
        <div className="pt-16 pb-4 px-5">
          <h1 className="text-white text-xl font-bold">Shorts</h1>
          <p className="text-white/40 text-xs mt-1">何度も聴いた曲がここに並ぶ</p>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center gap-4 px-8 pb-24">
          <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center">
            <svg className="w-10 h-10 text-white/20" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <p className="text-white/30 text-sm text-center">
            For You タブで曲を聴くと<br />何度も再生した曲がここに表示される
          </p>
        </div>

        {/* フィードのプレビュー */}
        <div className="flex-1 overflow-y-auto pb-24">
          {tracks.map((track) => (
            <div key={track.video_id} className="flex items-center gap-3 px-5 py-3 border-b border-white/5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={track.thumbnail_url} alt="" className="w-12 h-12 rounded-lg object-cover" />
              <div className="min-w-0">
                <p className="text-white text-sm font-semibold truncate">{track.title}</p>
                <p className="text-white/40 text-xs truncate">{track.artist}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="h-dvh flex flex-col">
      {/* ヘッダー */}
      <div className="absolute top-0 left-0 right-0 z-20 pt-14 pb-3 px-5 bg-gradient-to-b from-black to-transparent pointer-events-none">
        <h1 className="text-white text-lg font-bold">Shorts</h1>
        <p className="text-white/40 text-xs">よく聴いた順</p>
      </div>

      {/* 再生カウントバッジ付きフィード */}
      <div ref={scrollRef} className="feed-scroll">
        {tracks.map((track, i) => (
          <div key={track.video_id} className="relative">
            <TrackCard
              track={track}
              isActive={activeIndex === i}
              isLiked={likedIds.has(track.video_id)}
              onLike={() => toggleLike(track.video_id)}
            />
            {/* 再生回数バッジ */}
            <div className="absolute top-16 left-5 z-10 flex items-center gap-1.5 bg-black/50 rounded-full px-3 py-1">
              <svg className="w-3 h-3 text-white/60" fill="currentColor" viewBox="0 0 24 24">
                <path d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99"/>
              </svg>
              <span className="text-white/60 text-[10px] font-medium">
                {getCount(track.video_id)} 回リピート
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
