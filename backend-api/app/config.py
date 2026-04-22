from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+asyncpg://postgres:changeme@postgres:5432/placement_tracker"
    REDIS_URL: str = "redis://redis:6379/0"
    JWT_SECRET: str = "change-this-secret"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    OPENAI_API_KEY: str = ""

    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    GOOGLE_REDIRECT_URI: str = ""
    FRONTEND_URL: str = ""

    GEMINI_API_KEY: str = ""

    UPSTASH_REDIS_REST_URL: str = ""
    UPSTASH_REDIS_REST_TOKEN: str = ""

    GCS_BUCKET_NAME: str = ""
    GCS_PROJECT_ID: str = ""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

settings = Settings()
