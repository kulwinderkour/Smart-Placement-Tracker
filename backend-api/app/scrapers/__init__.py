from __future__ import annotations

import asyncio
import logging

from app.schemas.scraped_job import ScrapedJob
from app.scrapers.internshala import InternshalaScraper
from app.scrapers.naukri import NaukriScraper

logger = logging.getLogger(__name__)


async def scrape_all_sources(query: str) -> list[ScrapedJob]:
    scrapers = [InternshalaScraper(), NaukriScraper()]
    results = await asyncio.gather(
        *[s.scrape(query) for s in scrapers],
        return_exceptions=True,
    )
    jobs: list[ScrapedJob] = []
    for result in results:
        if isinstance(result, Exception):
            logger.warning("Scraper source failed: %s", result)
            continue
        jobs.extend(result)
    return jobs
