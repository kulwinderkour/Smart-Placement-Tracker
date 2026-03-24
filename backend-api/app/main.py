from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import auth, jobs, applications, admin, roadmap
from app.routers.google_auth import router as google_router

app = FastAPI(title="Student Placement Tracker API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:3002",
        "http://localhost:4173",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:8000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router,        prefix="/api/v1")
app.include_router(jobs.router,        prefix="/api/v1")
app.include_router(applications.router,prefix="/api/v1")
app.include_router(admin.router,       prefix="/api/v1")
app.include_router(roadmap.router,     prefix="/api/v1")
app.include_router(google_router,      prefix="/api/v1")

@app.get("/health")
def health():
    return {"status": "ok", "service": "backend-api"}