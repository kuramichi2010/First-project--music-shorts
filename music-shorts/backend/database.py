import aiosqlite
from config import settings

DB_PATH = settings.database_url


async def get_db() -> aiosqlite.Connection:
    db = await aiosqlite.connect(DB_PATH)
    db.row_factory = aiosqlite.Row
    try:
        yield db
    finally:
        await db.close()


async def init_db():
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("""
            CREATE TABLE IF NOT EXISTS highlight_cache (
                video_id    TEXT PRIMARY KEY,
                start_time  INTEGER NOT NULL,
                duration    INTEGER NOT NULL,
                method      TEXT NOT NULL,
                cached_at   DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """)
        await db.execute("""
            CREATE TABLE IF NOT EXISTS stream_cache (
                video_id    TEXT PRIMARY KEY,
                stream_url  TEXT NOT NULL,
                expires_at  DATETIME NOT NULL,
                cached_at   DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """)
        await db.commit()
