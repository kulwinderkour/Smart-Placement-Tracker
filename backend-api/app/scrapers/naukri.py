from __future__ import annotations

from urllib.parse import quote

import httpx
from bs4 import BeautifulSoup

from app.schemas.scraped_job import ScrapedJob
from app.scrapers.base import BaseScraper


class NaukriScraper(BaseScraper):
    source = "Naukri"

    async def scrape(self, query: str) -> list[ScrapedJob]:
        url = f"https://www.naukri.com/jobs-in-india?k={quote((query or 'software developer').strip())}"
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        }

        async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
            res = await client.get(url, headers=headers)
            res.raise_for_status()

        soup = BeautifulSoup(res.text, "html.parser")
        cards = soup.select(".srp-jobtuple-wrapper")[:15]
        jobs: list[ScrapedJob] = []
        for card in cards:
            title_el = card.select_one(".title")
            company_el = card.select_one(".comp-name")
            location_el = card.select_one(".locWdth")
            salary_el = card.select_one(".salary-snippet")
            link_el = card.select_one("a.title")

            href = link_el.get("href") if link_el else None
            title = title_el.get_text(strip=True) if title_el else None
            if not title or not href:
                continue

            jobs.append(
                ScrapedJob(
                    title=title,
                    company=(company_el.get_text(strip=True) if company_el else "Unknown"),
                    location=(location_el.get_text(strip=True) if location_el else "India"),
                    salary=(salary_el.get_text(strip=True) if salary_el else None),
                    applyUrl=href,
                    source=self.source,
                    employmentType="full-time",
                )
            )
        return jobs
