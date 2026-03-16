import logging

import scrapy

from app.spiders.base_spider import BaseJobSpider

logger = logging.getLogger(__name__)


class LinkedInSpider(BaseJobSpider):
    name = "linkedin"
    allowed_domains = ["linkedin.com"]

    search_queries = [
        "software+engineer+fresher+India",
        "backend+developer+fresher+India",
        "frontend+developer+fresher+India",
        "data+analyst+intern+India",
    ]

    def start_requests(self):
        for query in self.search_queries:
            url = (
                f"https://www.linkedin.com/jobs/search"
                f"?keywords={query}&location=India"
                f"&f_E=1,2&f_JT=F,I&start=0"
            )
            yield scrapy.Request(
                url,
                headers=self.get_headers(),
                callback=self.parse,
                meta={"query": query, "page": 0},
            )

    def parse(self, response):
        job_cards = response.css("div.base-card")

        if not job_cards:
            logger.warning("No job cards found on: %s", response.url)
            return

        for card in job_cards:
            job_url = card.css("a.base-card__full-link::attr(href)").get()
            company = (
                card.css("h4.base-search-card__subtitle a::text").get(default="").strip()
            )
            title = card.css("h3.base-search-card__title::text").get(default="").strip()
            location = (
                card.css("span.job-search-card__location::text").get(default="").strip()
            )

            if job_url and title and company:
                yield scrapy.Request(
                    job_url,
                    headers=self.get_headers(),
                    callback=self.parse_job_detail,
                    meta={
                        "source_url": job_url,
                        "company_name": company,
                        "role_title": title,
                        "location": location,
                    },
                )

        page = response.meta.get("page", 0)
        if page < 75 and len(job_cards) >= 25:
            next_page = page + 25
            next_url = response.url.replace(f"start={page}", f"start={next_page}")
            yield scrapy.Request(
                next_url,
                headers=self.get_headers(),
                callback=self.parse,
                meta={"query": response.meta["query"], "page": next_page},
            )

    def parse_job_detail(self, response):
        description = " ".join(
            response.css("div.show-more-less-html__markup *::text").getall()
        ).strip()

        yield self.build_job_item(
            source_url=response.meta["source_url"],
            company_name=response.meta["company_name"],
            role_title=response.meta["role_title"],
            location=response.meta["location"],
            description=description,
            job_type="full_time",
        )
