from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+asyncpg://postgres:Jasbir24@host.docker.internal:5433/placement_tracker"
    OPENAI_API_KEY: str = ""
    OPENAI_MODEL: str = "gpt-4o"
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-2.0-flash"
    MAX_RESUME_SIZE_MB: int = 5
    SKILLS_TAXONOMY_PATH: str = "app/data/skills_taxonomy.json"
    BACKEND_URL: str = "http://localhost:8000"
    MATCHER_ADMIN_API_KEY: str = "change-me-admin-key"
    REDIS_URL: str = "redis://localhost:6379/1"  # override via env: redis://redis:6379/1
    UPSTASH_REDIS_REST_URL: str = ""
    UPSTASH_REDIS_REST_TOKEN: str = ""
    GEMMA_MODEL: str = "gemma-3-27b-it"
    GOOGLE_AI_API_KEY: str = ""
    USE_GEMMA: bool = True
    EXPRESS_BACKEND_URL: str = "http://node-scraper:8081"
    GCS_BUCKET_NAME: str = ""
    GCS_PROJECT_ID: str = ""

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
