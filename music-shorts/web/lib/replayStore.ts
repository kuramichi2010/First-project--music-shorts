const KEY = "ms_replay_counts";

function load(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "{}");
  } catch {
    return {};
  }
}

export function increment(videoId: string): void {
  const counts = load();
  counts[videoId] = (counts[videoId] ?? 0) + 1;
  localStorage.setItem(KEY, JSON.stringify(counts));
}

export function getCount(videoId: string): number {
  return load()[videoId] ?? 0;
}

/** 再生回数が多い順に video_id を返す */
export function getSortedIds(): string[] {
  const counts = load();
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([id]) => id);
}
