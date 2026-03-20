from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import admin, applications, auth, jobs

app = FastAPI(
    title="Student Placement Tracker API",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001", "http://localhost:3002"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/v1")
app.include_router(jobs.router, prefix="/api/v1")
app.include_router(applications.router, prefix="/api/v1")
app.include_router(admin.router, prefix="/api/v1")


@app.on_event("startup")
async def startup_event():
    return


@app.get("/health")
def health():
    return {"status": "ok", "service": "backend-api"}
