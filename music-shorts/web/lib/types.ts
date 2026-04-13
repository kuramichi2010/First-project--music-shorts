export interface Highlight {
  start_time: number;
  duration: number;
  method: string;
}

export interface Track {
  video_id: string;
  title: string;
  artist: string;
  thumbnail_url: string;
  duration: number;
  highlight: Highlight;
  stream_url: string;
  stream_expires_at: string;
}

export interface FeedResponse {
  tracks: Track[];
  next_page_token: string | null;
}
