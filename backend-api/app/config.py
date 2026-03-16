from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+asyncpg://postgres:changeme@postgres:5432/placement_tracker"
    REDIS_URL: str = "redis://redis:6379/0"
    JWT_SECRET: str = "change-this-secret"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    OPENAI_API_KEY: str = ""

    class Config:
        env_file = ".env"


settings = Settings()