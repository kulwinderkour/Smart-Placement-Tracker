import logging

import scrapy
from fake_useragent import UserAgent

logger = logging.getLogger(__name__)


class BaseJobSpider(scrapy.Spider):
    """
    All job spiders inherit from this.
    Handles user-agent rotation and common item building.
    """

    ua = UserAgent()

    custom_settings = {
        "DOWNLOAD_DELAY": 2,
        "RANDOMIZE_DOWNLOAD_DELAY": True,
        "CONCURRENT_REQUESTS": 4,
        "ROBOTSTXT_OBEY": True,
        "DEFAULT_REQUEST_HEADERS": {
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en",
        },
    }

    def get_headers(self) -> dict:
        return {"User-Agent": self.ua.random}

    def build_job_item(
        self,
        source_url: str,
        company_name: str,
        role_title: str,
        location: str = "",
        description: str = "",
        job_type: str = "full_time",
        salary_min: int = None,
        salary_max: int = None,
        deadline: str = None,
    ) -> dict:
        return {
            "source_url": source_url,
            "company_name": company_name,
            "role_title": role_title,
            "location": location,
            "description": description,
            "job_type": job_type,
            "salary_min": salary_min,
            "salary_max": salary_max,
            "deadline": deadline,
        }
