from fastapi import FastAPI
from app.routers import internal, interview, recommend, resume, skill_gap

app = FastAPI(title="AI Engine", version="1.0.0")

app.include_router(resume.router)
app.include_router(recommend.router)
app.include_router(skill_gap.router)
app.include_router(interview.router)
app.include_router(internal.router)


@app.get("/health")
def health():
    return {"status": "ok", "service": "ai-engine"}
