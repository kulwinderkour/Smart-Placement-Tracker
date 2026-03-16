import logging
import os

from apscheduler.schedulers.blocking import BlockingScheduler
from scrapy.crawler import CrawlerProcess
from scrapy.utils.project import get_project_settings

from app.config import config

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

os.environ["SCRAPY_SETTINGS_MODULE"] = "app.settings"


def run_all_spiders():
    """Run all spiders in sequence inside a single CrawlerProcess."""
    logger.info("Starting spider run...")

    process = CrawlerProcess(get_project_settings())

    from app.spiders.careers_spider import CareersSpider
    from app.spiders.linkedin_spider import LinkedInSpider
    from app.spiders.naukri_spider import NaukriSpider

    process.crawl(LinkedInSpider)
    process.crawl(NaukriSpider)
    process.crawl(CareersSpider)

    process.start()
    logger.info("Spider run complete.")


def main():
    logger.info(
        "Collector starting — interval: %s minutes",
        config.SCRAPE_INTERVAL_MINUTES,
    )

    from app.health import run_health_in_background
    run_health_in_background()

    run_all_spiders()

    scheduler = BlockingScheduler()
    scheduler.add_job(
        run_all_spiders,
        "interval",
        minutes=config.SCRAPE_INTERVAL_MINUTES,
        id="spider_job",
        max_instances=1,
        coalesce=True,
    )

    logger.info("Scheduler started. Press Ctrl+C to exit.")
    try:
        scheduler.start()
    except (KeyboardInterrupt, SystemExit):
        logger.info("Collector stopped.")


if __name__ == "__main__":
    main()
