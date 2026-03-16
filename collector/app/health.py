from fastapi import FastAPI
import threading

import uvicorn

health_app = FastAPI()


@health_app.get("/health")
def health():
    return {"status": "ok", "service": "collector"}


def start_health_server():
    """Run health check server in a background thread."""
    uvicorn.run(health_app, host="0.0.0.0", port=8001, log_level="warning")


def run_health_in_background():
    thread = threading.Thread(target=start_health_server, daemon=True)
    thread.start()
