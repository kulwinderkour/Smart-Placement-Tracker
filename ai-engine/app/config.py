from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+asyncpg://postgres:changeme@postgres/placement_tracker"
    OPENAI_API_KEY: str = ""
    OPENAI_MODEL: str = "gpt-4o"
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-2.5-flash-preview-04-17"
    MAX_RESUME_SIZE_MB: int = 5
    SKILLS_TAXONOMY_PATH: str = "app/data/skills_taxonomy.json"
    BACKEND_URL: str = "http://backend-api:8000/api/v1"
    MATCHER_ADMIN_API_KEY: str = "change-me-admin-key"

    class Config:
        env_file = ".env"


settings = Settings()
