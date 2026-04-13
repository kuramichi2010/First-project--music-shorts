from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    youtube_api_key: str
    database_url: str = "./music_shorts.db"
    region_code: str = "JP"
    max_highlight_duration: int = 30

    class Config:
        env_file = ".env"


settings = Settings()
