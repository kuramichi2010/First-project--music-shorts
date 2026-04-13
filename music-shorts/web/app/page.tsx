"use client";

import { useState } from "react";
import FeedView from "./components/FeedView";
import ShortsView from "./components/ShortsView";
import SearchView from "./components/SearchView";

type Tab = "feed" | "shorts" | "search";

export default function Home() {
  const [tab, setTab] = useState<Tab>("feed");

  return (
    <div className="relative h-dvh bg-black overflow-hidden">
      <div className="h-dvh">
        {tab === "feed"   && <FeedView />}
        {tab === "shorts" && <ShortsView />}
        {tab === "search" && <SearchView />}
      </div>

      {/* ボトムタブバー */}
      <div className="absolute bottom-0 left-0 right-0 z-50">
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent" />
        <div className="relative flex items-center justify-around px-6 pt-3 pb-8">

          {/* For You */}
          <TabBtn
            active={tab === "feed"}
            label="For You"
            onClick={() => setTab("feed")}
            icon={
              <svg fill={tab === "feed" ? "white" : "none"} stroke="white" strokeWidth={1.8} className="w-6 h-6" viewBox="0 0 24 24">
                <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 0 0 1 1h3m10-11 2 2m-2-2v10a1 1 0 0 1-1 1h-3m-6 0a1 1 0 0 0 1-1v-4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v4a1 1 0 0 0 1 1m-6 0h6" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            }
          />

          {/* Shorts */}
          <TabBtn
            active={tab === "shorts"}
            label="Shorts"
            onClick={() => setTab("shorts")}
            icon={
              <svg fill="none" stroke="white" strokeWidth={1.8} className="w-6 h-6" viewBox="0 0 24 24">
                <path d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" strokeLinecap="round" strokeLinejoin="round"
                  strokeOpacity={tab === "shorts" ? 1 : 0.5}
                  fill={tab === "shorts" ? "rgba(255,255,255,0.15)" : "none"}
                />
              </svg>
            }
          />

          {/* Search */}
          <TabBtn
            active={tab === "search"}
            label="Search"
            onClick={() => setTab("search")}
            icon={
              <svg fill="none" stroke="white" strokeWidth={1.8} className="w-6 h-6" viewBox="0 0 24 24">
                <path d="M21 21l-6-6m2-5a7 7 0 1 1-14 0 7 7 0 0 1 14 0z" strokeLinecap="round"/>
              </svg>
            }
          />
        </div>
      </div>
    </div>
  );
}

function TabBtn({ active, label, icon, onClick }: {
  active: boolean;
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-1">
      <div style={{ opacity: active ? 1 : 0.35 }}>{icon}</div>
      <span className="text-white text-[10px] font-medium" style={{ opacity: active ? 1 : 0.35 }}>
        {label}
      </span>
    </button>
  );
}
