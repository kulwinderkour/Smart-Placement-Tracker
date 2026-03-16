import logging
import os

import scrapy
import yaml

from app.spiders.base_spider import BaseJobSpider

logger = logging.getLogger(__name__)

SOURCES_FILE = os.path.normpath(
    os.path.join(os.path.dirname(__file__), "..", "config", "sources.yaml")
)


class CareersSpider(BaseJobSpider):
    name = "careers"

    JOB_LINK_SELECTORS = [
        "a[href*='job']",
        "a[href*='career']",
        "a[href*='opening']",
        "a[href*='position']",
        "a[href*='vacancy']",
        ".job-listing a",
        ".career-listing a",
        ".opening a",
    ]

    def start_requests(self):
        with open(SOURCES_FILE) as f:
            sources = yaml.safe_load(f)

        companies = sources.get("sources", {}).get("careers_pages", {}).get("companies", [])
        for company in companies:
            yield scrapy.Request(
                company["url"],
                headers=self.get_headers(),
                callback=self.parse,
                meta={"company_name": company["name"]},
            )

    def parse(self, response):
        company_name = response.meta.get("company_name", "Unknown")
        found_links = []

        for selector in self.JOB_LINK_SELECTORS:
            links = response.css(f"{selector}::attr(href)").getall()
            if links:
                found_links.extend(links[:20])
                break

        for link in set(found_links):
            full_url = response.urljoin(link)
            yield scrapy.Request(
                full_url,
                headers=self.get_headers(),
                callback=self.parse_job_detail,
                meta={"company_name": company_name, "source_url": full_url},
            )

    def parse_job_detail(self, response):
        title = (
            response.css("h1::text").get()
            or response.css("h2.job-title::text").get()
            or response.css(".position-title::text").get()
            or "Open Position"
        ).strip()

        description = " ".join(
            response.css("main *::text, article *::text, .job-description *::text").getall()
        ).strip()[:5000]

        if len(description) < 50:
            return

        yield self.build_job_item(
            source_url=response.meta["source_url"],
            company_name=response.meta["company_name"],
            role_title=title,
            description=description,
        )
