from __future__ import annotations

from urllib.parse import quote

import httpx
from bs4 import BeautifulSoup

from app.schemas.scraped_job import ScrapedJob
from app.scrapers.base import BaseScraper


class InternshalaScraper(BaseScraper):
    source = "Internshala"

    async def scrape(self, query: str) -> list[ScrapedJob]:
        normalized = (query or "software developer").strip().lower().replace(" ", "-")
        url = f"https://internshala.com/jobs/keywords-{quote(normalized)}-jobs/"
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        }

        async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
            res = await client.get(url, headers=headers)
            res.raise_for_status()

        soup = BeautifulSoup(res.text, "html.parser")
        cards = soup.select(".individual_internship")[:15]
        jobs: list[ScrapedJob] = []
        for card in cards:
            title_el = card.select_one(".job-internship-name") or card.select_one(".profile")
            company_el = card.select_one(".company-name")
            location_el = card.select_one(".location_link")
            salary_el = card.select_one(".stipend")
            link_el = card.select_one("a.job-title-href")

            href = link_el.get("href") if link_el else None
            if not title_el or not href:
                continue
            apply_url = href if href.startswith("http") else f"https://internshala.com{href}"

            jobs.append(
                ScrapedJob(
                    title=title_el.get_text(strip=True),
                    company=(company_el.get_text(strip=True) if company_el else "Unknown"),
                    location=(location_el.get_text(strip=True) if location_el else "India"),
                    salary=(salary_el.get_text(strip=True) if salary_el else None),
                    applyUrl=apply_url,
                    source=self.source,
                    employmentType="full-time",
                )
            )
        return jobs
