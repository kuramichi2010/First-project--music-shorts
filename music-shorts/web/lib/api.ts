import { FeedResponse, Track } from "./types";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://192.168.201.39:8000";

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export async function fetchFeed(pageToken?: string): Promise<FeedResponse> {
  const q = pageToken ? `?page_token=${pageToken}&max_results=10` : "?max_results=10";
  return get<FeedResponse>(`/api/feed${q}`);
}

export async function searchTracks(query: string, pageToken?: string): Promise<FeedResponse> {
  const q = new URLSearchParams({ q: query, max_results: "10" });
  if (pageToken) q.set("page_token", pageToken);
  return get<FeedResponse>(`/api/search?${q}`);
}

export async function refreshStream(videoId: string): Promise<{ stream_url: string; expires_at: string }> {
  return get(`/api/stream/${videoId}`);
}
