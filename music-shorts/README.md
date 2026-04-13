# Music Shorts

YouTube の曲のハイライト（サビ）を TikTok 風にサクッと楽しめる Web アプリ。

## 機能

- **For You** — YouTube トレンド曲をスワイプで次々再生
- **Shorts** — 何度もリピートした曲を多い順に表示
- **Search** — アーティスト・曲名で検索
- **Shorts / Full 切替** — ハイライト30秒 or フル再生
- **シークバー** — タップ・ドラッグで再生位置を自由に変更

---

## セットアップ

### 必要なもの

- Python 3.11+
- Node.js 18+
- YouTube Data API v3 キー（[Google Cloud Console](https://console.cloud.google.com/) で取得）
- ffmpeg（`brew install ffmpeg`）

---

### 1. バックエンド

```bash
cd backend
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt

# .env を作成
cp .env.example .env
# .env を開いて YOUTUBE_API_KEY を記入
```

#### 起動

```bash
cd backend
.venv/bin/uvicorn main:app --host 0.0.0.0 --port 8000
```

API ドキュメント: http://localhost:8000/docs

---

### 2. Web フロント

```bash
cd web
npm install

# .env.local を作成（Mac の IP アドレスを確認: ipconfig getifaddr en0）
echo "NEXT_PUBLIC_API_URL=http://<MacのIPアドレス>:8000" > .env.local

npm run build
npm run start -- --hostname 0.0.0.0 --port 3001
```

---

### 3. iPhone で開く

1. Mac と iPhone を**同じ Wi-Fi** に接続
2. iPhone の Safari で以下を開く:
   ```
   http://<MacのIPアドレス>:3001
   ```
3. Safari の共有ボタン → **「ホーム画面に追加」** でアプリとして使える

---

## API エンドポイント

| Method | Path | 説明 |
|--------|------|------|
| GET | `/api/feed` | トレンド曲フィード |
| GET | `/api/search?q=` | キーワード検索 |
| GET | `/api/stream/{video_id}` | ストリーム URL 取得 |
| GET | `/api/highlight/{video_id}` | AI ハイライト検出 |

## 技術スタック

| レイヤー | 技術 |
|----------|------|
| フロント | Next.js 16 / Tailwind CSS |
| バックエンド | FastAPI / Python |
| 音声取得 | yt-dlp |
| AI 解析 | librosa |
| 音楽データ | YouTube Data API v3 |
