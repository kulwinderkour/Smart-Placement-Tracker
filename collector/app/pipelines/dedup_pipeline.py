import hashlib
import logging

from scrapy.exceptions import DropItem
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

from app.config import config

logger = logging.getLogger(__name__)


class DeduplicationPipeline:
    """
    Drops any job whose source_url MD5 hash already exists in the DB.
    New jobs are inserted with raw data for the AI engine to process.
    """

    def open_spider(self, spider):
        self.engine = create_engine(config.DATABASE_URL)
        self.Session = sessionmaker(bind=self.engine)
        logger.info("DeduplicationPipeline: DB connection opened")

    def close_spider(self, spider):
        self.engine.dispose()
        logger.info("DeduplicationPipeline: DB connection closed")

    def process_item(self, item, spider):
        source_url = item.get("source_url", "")
        if not source_url:
            logger.warning("Item has no source_url — skipping")
            raise DropItem("No source_url on item")

        url_hash = hashlib.md5(source_url.encode()).hexdigest()

        with self.Session() as session:
            result = session.execute(
                text("SELECT id FROM jobs WHERE source_hash = :hash"),
                {"hash": url_hash},
            ).fetchone()

            if result:
                logger.debug("Duplicate found, dropping: %s", source_url)
                raise DropItem(f"Duplicate job: {source_url}")

            session.execute(
                text(
                    """
                    INSERT INTO jobs (
                        id, source_url, source_hash, company_name,
                        role_title, location, description,
                        job_type, is_active, collected_at, created_at
                    ) VALUES (
                        gen_random_uuid(), :url, :hash, :company,
                        :title, :location, :description,
                        :job_type, true, NOW(), NOW()
                    )
                    """
                ),
                {
                    "url": source_url,
                    "hash": url_hash,
                    "company": item.get("company_name", "Unknown"),
                    "title": item.get("role_title", "Unknown Role"),
                    "location": item.get("location", ""),
                    "description": item.get("description", ""),
                    "job_type": item.get("job_type", "full_time"),
                },
            )
            session.commit()
            logger.info(
                "New job saved: %s at %s",
                item.get("role_title"),
                item.get("company_name"),
            )

        return item
