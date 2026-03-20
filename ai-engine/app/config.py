from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+asyncpg://postgres:changeme@postgres/placement_tracker"
    OPENAI_API_KEY: str = ""
    OPENAI_MODEL: str = "gpt-4o"    
    MAX_RESUME_SIZE_MB: int = 5
    SKILLS_TAXONOMY_PATH: str = "app/data/skills_taxonomy.json"

    class Config:
        env_file = ".env"


settings = Settings()
