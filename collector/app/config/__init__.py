import os

from dotenv import load_dotenv

load_dotenv()


class CollectorConfig:
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL", "postgresql://postgres:changeme@postgres/placement_tracker"
    )
    AI_ENGINE_URL: str = os.getenv("AI_ENGINE_URL", "http://ai-engine:8002")
    SCRAPE_INTERVAL_MINUTES: int = int(os.getenv("SCRAPE_INTERVAL_MINUTES", "60"))
    MAX_JOBS_PER_RUN: int = int(os.getenv("MAX_JOBS_PER_RUN", "100"))


config = CollectorConfig()