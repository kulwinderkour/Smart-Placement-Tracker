from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase
from app.config import settings


def _async_db_url(url: str) -> str:
    """Ensure the URL uses the appropriate async driver."""
    if url.startswith("sqlite://"):
        return url.replace("sqlite://", "sqlite+aiosqlite://", 1)
    if "postgres://" in url or "postgresql://" in url:
        url = url.replace("postgres://", "postgresql+asyncpg://", 1)
        url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
    return url


raw_url = settings.DATABASE_URL
async_url = _async_db_url(raw_url)

if "sqlite" in async_url:
    engine = create_async_engine(
        async_url,
        echo=False,
        connect_args={"check_same_thread": False},
    )
else:
    engine = create_async_engine(
        async_url,
        echo=False,
        pool_size=3,
        max_overflow=2,
        pool_pre_ping=True,
    )

AsyncSessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


class Base(DeclarativeBase):
    pass
