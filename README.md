# Student Placement Tracker

AI-powered platform for student job discovery, resume analysis, and placement tracking.

## Stack
- **Frontend**: React 18 + Vite + TypeScript + TailwindCSS
- **Backend API**: FastAPI + SQLAlchemy + PostgreSQL
- **AI Engine**: spaCy + sentence-transformers + OpenAI
- **Collector**: Scrapy + APScheduler
- **Infra**: Docker Compose + Nginx + Redis

## Quick Start
```bash
# 1. Clone and enter the repo
git clone <your-repo-url>
cd student-placement-tracker

# 2. Set up environment
cp .env.example .env
# Edit .env and fill in DB_PASS, JWT_SECRET, OPENAI_API_KEY

# 3. Start all services
make build

# 4. Check services are running
docker compose ps

# 5. Test the health endpoint
curl http://localhost:8000/health
```

## Services
| Service | URL |
|---|---|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:8000/docs |
| AI Engine | http://localhost:8002/docs |






## start the backend server
docker compose up -d
## now start the frontend server
npm run dev