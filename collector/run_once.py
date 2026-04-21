"""
Cloud Run Job entrypoint.
Runs all spiders once and exits — Cloud Scheduler handles the interval.
The Dockerfile's default CMD (python -m app.main) is used for local dev
where APScheduler runs the periodic loop. This script overrides that CMD
for the Cloud Run Job deployment only.
"""
import logging
import os

from app.main import run_all_spiders

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)

if __name__ == "__main__":
    logging.getLogger(__name__).info("Cloud Run Job: starting single spider run")
    run_all_spiders()
    logging.getLogger(__name__).info("Cloud Run Job: spider run complete, exiting")
