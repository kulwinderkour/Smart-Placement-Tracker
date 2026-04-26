from __future__ import annotations

from abc import ABC, abstractmethod

from app.schemas.scraped_job import ScrapedJob


class BaseScraper(ABC):
    source: str

    @abstractmethod
    async def scrape(self, query: str) -> list[ScrapedJob]:
        raise NotImplementedError
