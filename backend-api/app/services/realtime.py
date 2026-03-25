"""Real-time WebSocket broadcast service.

Architecture:
  Company posts/edits/deletes a job
      → publish_job_event() pushes event to Redis channel "jobs:updates"
      → redis_subscriber() background task picks it up
      → ConnectionManager broadcasts to all connected WebSocket clients
      → Student dashboard receives live job feed

Fallback: if Redis is unavailable, events are broadcast directly in-process.
"""
import asyncio
import json
import logging
import os
from typing import Set

import redis.asyncio as aioredis
from fastapi import WebSocket

logger = logging.getLogger(__name__)

REDIS_URL = os.getenv("REDIS_URL", "redis://redis:6379/0")
JOBS_CHANNEL = "jobs:updates"


class ConnectionManager:
    """Manages all active WebSocket connections for real-time job updates."""

    def __init__(self) -> None:
        self.active_connections: Set[WebSocket] = set()

    async def connect(self, websocket: WebSocket) -> None:
        await websocket.accept()
        self.active_connections.add(websocket)
        logger.info("WebSocket connected. Total: %d", len(self.active_connections))

    def disconnect(self, websocket: WebSocket) -> None:
        self.active_connections.discard(websocket)
        logger.info("WebSocket disconnected. Total: %d", len(self.active_connections))

    async def broadcast(self, message: dict) -> None:
        """Send a JSON message to every connected client, dropping dead connections."""
        if not self.active_connections:
            return
        payload = json.dumps(message, default=str)
        dead: Set[WebSocket] = set()
        for ws in self.active_connections.copy():
            try:
                await ws.send_text(payload)
            except Exception:
                dead.add(ws)
        for ws in dead:
            self.active_connections.discard(ws)


manager = ConnectionManager()


async def publish_job_event(event_type: str, job_data: dict) -> None:
    """
    Publish a job lifecycle event to Redis for broadcast to all WebSocket clients.

    event_type: one of job_created | job_updated | job_deleted |
                            job_activated | job_deactivated
    job_data:   serialisable job dict
    """
    payload = json.dumps({"event": event_type, "job": job_data}, default=str)
    try:
        redis = aioredis.from_url(REDIS_URL, decode_responses=True)
        await redis.publish(JOBS_CHANNEL, payload)
        await redis.aclose()
    except Exception as exc:
        logger.warning("Redis publish failed (%s). Broadcasting directly.", exc)
        await manager.broadcast({"event": event_type, "job": job_data})


async def redis_subscriber() -> None:
    """
    Long-running background task that subscribes to the Redis jobs channel
    and forwards every message to all connected WebSocket clients.

    Automatically retries on connection failure with exponential backoff.
    """
    backoff = 1
    while True:
        try:
            redis = aioredis.from_url(REDIS_URL, decode_responses=True)
            pubsub = redis.pubsub()
            await pubsub.subscribe(JOBS_CHANNEL)
            logger.info("Redis subscriber listening on channel: %s", JOBS_CHANNEL)
            backoff = 1
            async for message in pubsub.listen():
                if message["type"] == "message":
                    try:
                        data = json.loads(message["data"])
                        await manager.broadcast(data)
                    except Exception as exc:
                        logger.warning("Failed to broadcast message: %s", exc)
        except asyncio.CancelledError:
            logger.info("Redis subscriber cancelled.")
            return
        except Exception as exc:
            logger.warning(
                "Redis subscriber error: %s. Retrying in %ds…", exc, backoff
            )
            await asyncio.sleep(backoff)
            backoff = min(backoff * 2, 30)
