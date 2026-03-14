from fastapi import FastAPI

app = FastAPI(title="AI Engine", version="1.0.0")


@app.get("/health")
def health():
    return {"status": "ok", "service": "ai-engine"}
