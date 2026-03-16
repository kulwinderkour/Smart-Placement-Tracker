import logging

import scrapy

from app.spiders.base_spider import BaseJobSpider

logger = logging.getLogger(__name__)


class NaukriSpider(BaseJobSpider):
    name = "naukri"
    allowed_domains = ["naukri.com"]

    search_queries = [
        "fresher-software-engineer-jobs",
        "fresher-python-developer-jobs",
        "fresher-react-developer-jobs",
        "fresher-java-developer-jobs",
    ]

    def start_requests(self):
        for query in self.search_queries:
            url = f"https://www.naukri.com/{query}"
            yield scrapy.Request(
                url,
                headers=self.get_headers(),
                callback=self.parse,
                meta={"query": query},
            )

    def parse(self, response):
        job_cards = response.css("article.jobTuple")

        if not job_cards:
            job_cards = response.css("div.srp-jobtuple-wrapper")

        for card in job_cards:
            title = card.css("a.title::text").get(default="").strip()
            company = card.css("a.subTitle::text").get(default="").strip()
            location = card.css("span.ellipsis li::text").get(default="").strip()
            job_url = card.css("a.title::attr(href)").get()

            if not job_url:
                job_url = card.css("a.jobTupleHeader::attr(href)").get()

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

    def parse_job_detail(self, response):
        description = " ".join(response.css("div.job-desc *::text").getall()).strip()

        if not description:
            description = " ".join(response.css("section.job-desc *::text").getall()).strip()

        yield self.build_job_item(
            source_url=response.meta["source_url"],
            company_name=response.meta["company_name"],
            role_title=response.meta["role_title"],
            location=response.meta["location"],
            description=description,
        )
