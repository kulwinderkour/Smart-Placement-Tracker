import logging

import httpx

from app.config import config

logger = logging.getLogger(__name__)


class AIPipeline:
    """
    After dedup, forwards the job to the AI engine
    so it can extract skills from the job description.
    """

    def process_item(self, item, spider):
        try:
            with httpx.Client(timeout=30.0) as client:
                response = client.post(
                    f"{config.AI_ENGINE_URL}/internal/process-job",
                    json={
                        "source_url": item.get("source_url"),
                        "company_name": item.get("company_name"),
                        "role_title": item.get("role_title"),
                        "description": item.get("description", ""),
                    },
                )
                if response.status_code == 200:
                    logger.info("AI engine processed: %s", item.get("role_title"))
                else:
                    logger.warning(
                        "AI engine returned %s for %s",
                        response.status_code,
                        item.get("role_title"),
                    )
        except httpx.RequestError as e:
            logger.error("Could not reach AI engine: %s", e)

        return item
