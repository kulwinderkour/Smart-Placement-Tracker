# Smart Placement Tracker - Comprehensive Codebase Analysis

**Generated:** 2026-06-11  
**Document Purpose:** Complete technical inventory of the Smart Placement Tracker system architecture, components, and integrations.

---

## Table of Contents
1. [React Components](#1-react-components)
2. [API Routes](#2-api-routes)
3. [Database Models & Schemas](#3-database-models--schemas)
4. [Services & Business Logic](#4-services--business-logic)
5. [Utilities & Helpers](#5-utilities--helpers)
6. [Middleware & Authentication](#6-middleware--authentication)
7. [AI Models & LLM Integrations](#7-ai-models--llm-integrations)
8. [User Role System](#8-user-role-system)
9. [Background Jobs & Automated Workflows](#9-background-jobs--automated-workflows)
10. [External API Integrations](#10-external-api-integrations)

---

## 1. React Components

### Frontend Overview
**Location:** `frontend/src/`  
**Technology:** React 18+ with TypeScript, Vite, Tailwind CSS  
**Architecture:** Component-based with Zustand for state management

### Page Components

#### Student Pages (`frontend/src/pages/Student/`)
| Component | Purpose | Key Functions |
|-----------|---------|----------------|
| **Dashboard.tsx** | Main student hub | Display applications, metrics, trending jobs, career progress |
| **Tracker.tsx** | Application tracking | View all applications, filter by status, track progress |
| **StreakTracker.tsx** | Engagement tracking | Display daily streaks, consistency badges, motivation metrics |
| **Roadmap.tsx** | Learning path generation | View/generate personalized skill roadmaps, milestone tracking |
| **Questions.tsx** | Interview prep | Generate practice questions by topic/difficulty, track answers |
| **PrepChecklist.tsx** | Pre-interview checklist | Preparation reminders, timeline management |
| **ResumeAnalyser.tsx** | Resume evaluation | Upload resume, get ATS score, feedback, improvement tips |
| **JobBoard.tsx** | Job listings | Browse jobs, filter by skills/salary, view details |
| **ApplyJob.tsx** | Job application | Apply to jobs with custom cover letters |
| **Applications.tsx** | Application history | List all applications with detailed history |
| **InterviewLog.tsx** | Interview tracker | Record interviews, feedback, outcomes |
| **PlacementPulse.tsx** | Real-time feed | Live updates on job postings, applications, peer activity |
| **Profile.tsx** | Student profile | Edit profile info, skills, college details, CGPA |
| **Settings.tsx** | User settings | Preferences, notifications, privacy, account |
| **ResourceBookmarks.tsx** | Resource management | Save articles, courses, study materials |
| **Freepad.tsx** | Notes/scratchpad | Personal notes, quick ideas |
| **Onboarding.tsx** | First-time setup | Initial profile completion, skills selection |

#### Admin Pages (`frontend/src/pages/Admin/`)
| Component | Purpose | Key Functions |
|-----------|---------|----------------|
| **AdminDashboard.tsx** | Admin overview | Platform metrics, user stats, system health |
| **AdminJobs.tsx** | Job management | Create/edit/delete jobs, set requirements |
| **AdminPlatformJobs.tsx** | Platform jobs | Manage jobs scraped from external sources |
| **AdminApplicants.tsx** | Applicant management | View all applicants, filter by status, communicate |
| **AdminInterviews.tsx** | Interview coordination | Schedule interviews, track outcomes |
| **AdminCompanyProfile.tsx** | Company info management | Edit company profile information |
| **ManageJobs.tsx** | Bulk job management | Bulk operations on jobs |
| **ManageStudents.tsx** | Student management | Manage student accounts, roles |
| **ManageCompanies.tsx** | Company management | Manage provider/company accounts |
| **JobPosting.tsx** | Job creation form | Form for creating new job postings |
| **Analytics.tsx** | Analytics dashboard | Placement trends, success rates, analytics |
| **CompanyProfileView.tsx** | View company profile | Display company details |
| **AdminSettings.tsx** | Admin settings | System configuration |

#### Company Pages (`frontend/src/pages/Company/`)
| Component | Purpose |
|-----------|---------|
| **OnboardingPreview.tsx** | Company onboarding preview |
| **CompanyProfileForm.tsx** | Company profile creation/editing |

#### Job Pages (`frontend/src/pages/Jobs/`)
| Component | Purpose |
|-----------|---------|
| **JobBoard.tsx** | Alternative job board view |

#### Auth Pages (`frontend/src/pages/Auth/`)
| Component | Purpose |
|-----------|---------|
| **Login.tsx** | User login |
| **Register.tsx** | User registration |
| **Landing.tsx** | Public landing page |

### Layout Components (`frontend/src/components/layout/`)
| Component | Purpose |
|-----------|---------|
| **Navbar.tsx** | Main navigation bar |
| **DashboardSidebar.tsx** | Sidebar for dashboard pages |
| **DashboardLayout.tsx** | Wrapper layout for dashboard |
| **AdminNavbar.tsx** | Admin-specific navigation |
| **AdminLayout.tsx** | Admin dashboard layout wrapper |

### Reusable Components (`frontend/src/components/`)
| Component | Purpose | Key Props |
|-----------|---------|-----------|
| **AutoApplyPanel.jsx** | Auto-apply agent control panel | `isOpen`, `onClose`, `studentProfile` |
| **FloatingAgent.tsx** | Floating chat interface | Position, user context |
| **AgentPanel.jsx** | Agent interaction panel | Messages, responses |
| **JobMatchScoreCard.tsx** | Display job match score | Job data, match percentage |
| **Badge.tsx** | Status badges | Status type, label |
| **Button.tsx** | Reusable button | Variant, size, disabled state |

### Admin Components (`frontend/src/components/admin/`)
| Component | Purpose |
|-----------|---------|
| **AdminTopBar.tsx** | Admin page header |
| **AdminSidebar.tsx** | Admin navigation sidebar |
| **AdminLayout.tsx** | Admin layout wrapper |
| **StatusBadge.tsx** | Status indicator |
| **MetricCard.tsx** | Metric display card |

### Company Components (`frontend/src/components/company/`)
| Component | Purpose |
|-----------|---------|
| **CompanyOnboardingGate.tsx** | Onboarding flow guard |
| **CompanyPreviewPanel.tsx** | Preview company details |
| **StepProgressBar.tsx** | Multi-step form progress |
| **LogoUpload.tsx** | Logo upload handler |
| **FormField.tsx** | Reusable form field |

### Router Configuration
**File:** `frontend/src/router.tsx`
- Define routes for all pages
- Implement protected routes
- Role-based route guards (student/admin/provider)
- Handle redirects based on authentication status

---

## 2. API Routes

### Backend API (FastAPI + Python)
**Base URL:** `/api/v1`  
**Location:** `backend-api/app/routers/`

#### Authentication Routes
**File:** `backend-api/app/routers/auth.py`
```
POST   /auth/register          - Register new user (student/admin/provider)
POST   /auth/login             - Login with email/password
GET    /auth/me                - Get current user profile
PATCH  /auth/complete-onboarding - Mark onboarding complete
```

#### Job Management Routes
**File:** `backend-api/app/routers/jobs.py`
```
GET    /jobs                   - List jobs (paginated, filterable)
  Query params: page, limit, location, min_salary_lpa
GET    /jobs/{job_id}          - Get job details
PUT    /jobs/{job_id}          - Update job (admin only)
POST   /jobs/{job_id}          - Create job (admin only)
DELETE /jobs/{job_id}          - Delete job (admin only)
```

#### Application Management Routes
**File:** `backend-api/app/routers/applications.py`
```
POST   /applications           - Apply to a job
GET    /applications           - List user's applications
GET    /applications/{app_id}  - Get application details
PATCH  /applications/{app_id}  - Update application status
DELETE /applications/{app_id}  - Withdraw application
```

#### Roadmap Generation Routes
**File:** `backend-api/app/routers/roadmap.py`
```
POST   /roadmap/generate       - Generate personalized learning roadmap
GET    /roadmap/my             - Get all user's roadmaps
GET    /roadmap/{roadmap_id}   - Get specific roadmap
```

#### Questions Routes
**File:** `backend-api/app/routers/questions.py`
```
POST   /questions/generate     - Generate practice questions
GET    /questions/topics       - Get suggested topics by skills
POST   /questions/evaluate     - AI evaluation of answers
```

#### Company Profile Routes
**File:** `backend-api/app/routers/company.py`
```
GET    /company/profile        - Get company profile (provider only)
POST   /company/profile        - Create/update company profile
PUT    /company/profile        - Update company profile
```

#### Company Jobs Routes
**File:** `backend-api/app/routers/company_jobs.py`
```
POST   /company/jobs           - Post a job (provider only)
GET    /company/jobs           - List company's jobs
PUT    /company/jobs/{job_id}  - Update job posting
DELETE /company/jobs/{job_id}  - Delete job posting
```

#### Student API Routes
**File:** `backend-api/app/routers/student_api.py`
```
GET    /student/profile        - Get student profile
PUT    /student/profile        - Update student profile
POST   /student/skills         - Add skills to student
DELETE /student/skills/{id}    - Remove skill
GET    /student/stats          - Get student statistics
```

#### Admin Routes
**File:** `backend-api/app/routers/admin.py`
```
GET    /admin/stats            - Platform statistics
POST   /admin/invite-student   - Invite student to job
PATCH  /admin/applications/{id}/status - Update application status
POST   /admin/interviews       - Schedule interview
PUT    /admin/interviews/{id}  - Update interview
GET    /admin/companies        - List all companies
GET    /admin/students         - List all students
```

#### Scraped Jobs Routes
**File:** `backend-api/app/routers/scraped_jobs.py`
```
GET    /scraped-jobs           - Get jobs scraped from external sources
GET    /scraped-jobs/refresh   - Trigger scraper refresh
```

#### Agent Logs Routes
**File:** `backend-api/app/routers/agent_logs.py`
```
GET    /agent/logs/{student_id} - Get agent execution logs for student
GET    /agent/logs/session/{session_id} - Get logs for session
```

#### Agent Internal Routes
**File:** `backend-api/app/routers/agent_internal.py`
```
POST   /internal/agent/upsert-job - Create or update job (internal)
POST   /internal/agent/apply - Apply to job via agent
GET    /internal/agent/applications/{user_id} - Get applications
```

#### Google Auth Routes
**File:** `backend-api/app/routers/google_auth.py`
```
POST   /auth/google/login      - Google OAuth login
POST   /auth/google/callback   - OAuth callback handler
```

### AI Engine API (FastAPI + Python)
**Base URL:** `http://ai-engine:8001` (or configured)  
**Location:** `ai-engine/app/routes/` & `ai-engine/app/routers/`

#### Agent Routes
**File:** `ai-engine/app/routers/agent.py`
```
POST   /agent/chat             - Chat with brain agent
GET    /agent/health           - Agent health check
```

#### Resume Routes
**File:** `ai-engine/app/routers/resume.py`
```
POST   /resume/analyze         - Analyze resume for ATS score
POST   /resume/extract         - Extract structured data from resume
POST   /resume/upload          - Upload and process resume
```

#### Skill Gap Analysis Routes
**File:** `ai-engine/app/routers/skill_gap.py`
```
POST   /skill-gap/analyze      - Compare student vs job skills
GET    /skill-gap/recommendations - Get skill recommendations
```

#### Recommender Routes
**File:** `ai-engine/app/routers/recommend.py`
```
GET    /recommend/jobs         - Get job recommendations
GET    /recommend/skills       - Get skill recommendations
```

#### Internal Routes
**File:** `ai-engine/app/routers/internal.py`
```
POST   /internal/score         - Internal scoring endpoint
POST   /internal/validate      - Internal validation
```

#### Matcher Routes
**File:** `ai-engine/app/routes/matcher_routes.py`
```
POST   /api/matcher/predict    - ML model prediction (profile vs job)
GET    /api/matcher/health     - Model health check
```

#### Auto-Apply Agent Routes
**File:** `ai-engine/app/routes/agent_routes.py`
```
POST   /api/agent/auto-apply   - LLM-routed autonomous apply pipeline
POST   /api/agent/validate-job - Validate job before publishing
GET    /api/agent/health       - Agent health check
```

### Express/Node.js Backend Routes
**Location:** `backend-api/routes/`

#### Roadmap Routes (Legacy)
**File:** `backend-api/routes/roadmap.js`
```
GET    /api/roadmap            - Get roadmaps
POST   /api/roadmap/generate   - Generate roadmap
```

#### Questions Routes (Legacy)
**File:** `backend-api/routes/questions.js`
```
GET    /questions              - Get questions
POST   /questions/generate     - Generate questions
```

#### Skills Routes (Legacy)
**File:** `backend-api/routes/skills.js`
```
GET    /api/skills             - Get skills suggestions
```

#### Jobs Routes (Legacy)
**File:** `backend-api/routes/jobs.js`
```
GET    /api/jobs               - Get jobs
GET    /api/jobs/internshala   - Get Internshala jobs (cached)
```

#### Admin Jobs Routes (Node.js)
**File:** `backend-api/routes/admin-jobs.js`
```
GET    /api/admin-jobs/active  - Get active admin-posted jobs
POST   /api/admin-jobs         - Create admin job
PUT    /api/admin-jobs/{id}    - Update admin job
DELETE /api/admin-jobs/{id}    - Delete admin job
```

---

## 3. Database Models & Schemas

### User Management Models

#### User Model
**File:** `backend-api/app/models/user.py`
```python
class User(Base):
    id: UUID (PK)
    email: str (unique)
    password_hash: str
    role: UserRole enum (student | admin | provider)
    is_active: bool
    is_onboarding_completed: bool
    last_login: datetime
    created_at: datetime
    updated_at: datetime
    
    Relationships:
    - roadmaps: 1-to-many
    - student: 1-to-1
    - company_profile: 1-to-1
```

#### Student Model
**File:** `backend-api/app/models/student.py`
```python
class Student(Base):
    id: UUID (PK)
    user_id: UUID (FK → users)
    full_name: str
    phone: str
    college: str
    branch: str
    graduation_year: int
    cgpa: Decimal(4,2)
    resume_url: str
    resume_name: str
    job_type: str
    ats_score: int
    linkedin_url: str
    github_url: str
    dob: str
    gender: str
    created_at: datetime
    updated_at: datetime
    
    Relationships:
    - user: 1-to-1
    - skills: many-to-many (via StudentSkill)
    - applications: 1-to-many
    - interviews: 1-to-many
    - roadmaps: 1-to-many
    - agent_logs: 1-to-many
```

#### Skill Models
**File:** `backend-api/app/models/skill.py`
```python
class Skill(Base):
    id: UUID (PK)
    name: str (unique)
    category: SkillCategory enum (language|framework|tool|soft)
    created_at: datetime
    updated_at: datetime

class JobSkill(Base):
    job_id: UUID (FK → jobs)
    skill_id: UUID (FK → skills)
    importance: SkillImportance enum (required|preferred)
    created_at: datetime
    updated_at: datetime

class StudentSkill(Base):
    student_id: UUID (FK → students)
    skill_id: UUID (FK → skills)
    created_at: datetime
    updated_at: datetime
```

### Job & Application Models

#### Job Model
**File:** `backend-api/app/models/job.py`
```python
class Job(Base):
    id: UUID (PK)
    company_profile_id: UUID (FK → company_profiles)
    source_url: str (unique)
    source_hash: str (MD5)
    company_name: str
    role_title: str
    location: str
    salary_min: int (LPA or rupees)
    salary_max: int
    experience_min: int (years)
    experience_max: int
    job_type: JobType enum (full_time|intern|contract)
    description: text
    deadline: date
    is_active: bool
    collected_at: datetime (when scraped)
    processed_at: datetime (when processed by AI)
    created_at: datetime
    updated_at: datetime
    
    Relationships:
    - company_profile: many-to-1
    - applications: 1-to-many
    - interviews: 1-to-many
    - skills: many-to-many (via JobSkill)
```

#### Application Model
**File:** `backend-api/app/models/application.py`
```python
class Application(Base):
    id: UUID (PK)
    user_id: UUID (FK → users, nullable)
    student_id: UUID (FK → students)
    job_id: UUID (FK → jobs)
    job_title: str
    company: str
    status: ApplicationStatus enum (applied|online_test|technical_round|hr_round|offer|rejected)
    applied_at: datetime
    notes: text
    resume_url: str
    cover_letter: str
    agent_applied: bool (true if auto-applied by agent)
    next_step_date: date
    offer_ctc: int
    created_at: datetime
    updated_at: datetime
    
    Relationships:
    - student: many-to-1
    - job: many-to-1
```

#### Interview Model
**File:** `backend-api/app/models/interview.py`
```python
class Interview(Base):
    id: UUID (PK)
    student_id: UUID (FK → students)
    job_id: UUID (FK → jobs)
    scheduled_at: datetime
    mode: InterviewMode enum (google_meet|zoom|offline)
    meeting_link: str
    status: InterviewStatus enum (scheduled|completed|cancelled)
    notes: text
    feedback_rating: int (0-5)
    feedback_comment: text
    created_at: datetime
    updated_at: datetime
    
    Relationships:
    - student: many-to-1
    - job: many-to-1
```

### Learning & Preparation Models

#### Roadmap Model
**File:** `backend-api/app/models/roadmap.py`
```python
class Roadmap(Base):
    id: int (PK, auto-increment)
    user_id: UUID (FK → users, nullable for shared)
    field: str (e.g., "Software Engineer", "Data Scientist")
    title: str
    description: text
    role: str
    skills: text (JSON array)
    roadmap_data: JSON (structured learning path)
    difficulty_level: str (easy|intermediate|hard)
    created_at: datetime
    updated_at: datetime
    generated_by: str (e.g., "gemini-2.5-flash")
    usage_count: BigInt
    last_accessed: datetime
    is_public: str ("true"|"false")
    
    Relationships:
    - user: many-to-1
```

#### GeneratedRoadmap Model
**File:** `backend-api/app/models/generated_roadmap.py`
```python
class GeneratedRoadmap(Base):
    id: UUID (PK)
    roadmap_key: str (unique)  # Deterministic key from role+level+skills
    title: str
    role: str
    level: str (difficulty)
    duration_weeks: int
    source_prompt: str
    payload: JSON (full roadmap data)
    created_at: datetime
    updated_at: datetime
    
    # Shared across users with same criteria
```

### Resume & Analysis Models

#### Resume Model
**File:** `backend-api/app/models/resume.py`
```python
class Resume(Base):
    id: UUID (PK)
    student_id: UUID (FK → students)
    gcs_key: str (Google Cloud Storage path)
    file_name: str
    version: int
    is_active: bool
    created_at: datetime
    
    Relationships:
    - student: many-to-1
    - analyses: 1-to-many
```

#### ResumeAnalysis Model
**File:** `backend-api/app/models/resume.py`
```python
class ResumeAnalysis(Base):
    id: UUID (PK)
    student_id: UUID (FK → students)
    resume_id: UUID (FK → resumes)
    ats_score: int (0-100)
    feedback: text (improvement suggestions)
    job_description: text (JD used for comparison)
    created_at: datetime
    
    Relationships:
    - resume: many-to-1
```

### Company & Provider Models

#### CompanyProfile Model
**File:** `backend-api/app/models/company_profile.py`
```python
class CompanyProfile(Base):
    id: UUID (PK)
    user_id: UUID (FK → users, unique)
    company_name: str
    website: str
    company_email: str
    hr_contact_number: str
    address: text
    description: text
    industry_type: str
    company_size: str (e.g., "1-50", "50-100", "1000+")
    logo_url: str
    linkedin_url: str
    location: str
    founded_year: int
    is_draft: bool (false = published)
    created_at: datetime
    updated_at: datetime
    
    Relationships:
    - user: 1-to-1
    - jobs: 1-to-many
```

### AI Agent Logging Model

#### AgentLog Model
**File:** `backend-api/app/models/agent_log.py`
```python
class AgentLog(Base):
    id: UUID (PK)
    student_id: UUID (FK → students, nullable)
    session_id: UUID (groups related steps)
    agent_type: AgentType enum (intent|resume|validation|auto_apply|cover_letter)
    status: AgentStatus enum (started|success|failed|retry|recovered)
    step_name: str
    input_data: JSONB
    output_data: JSONB
    error_message: str
    metadata: JSONB
    duration_ms: int
    created_at: datetime
    updated_at: datetime
    
    # Audit trail for debugging and optimization
```

### Pydantic Schemas (Request/Response)
**Location:** `backend-api/app/schemas/`

| Schema File | Purpose | Key Schemas |
|-------------|---------|-------------|
| **user.py** | User DTOs | UserResponse, UserLogin, UserRegister, LoginResponse |
| **student.py** | Student DTOs | StudentResponse, StudentUpdate, StudentProfile |
| **job.py** | Job DTOs | JobResponse, JobCreate, JobUpdate |
| **application.py** | Application DTOs | ApplicationResponse, ApplicationCreate, ApplicationUpdate |
| **roadmap.py** | Roadmap DTOs | RoadmapRequest, RoadmapResponse |
| **questions.py** | Question DTOs | QuestionRequest, QuestionResponse, EvaluationRequest |
| **company_profile.py** | Company DTOs | CompanyProfileResponse, CompanyProfileCreate |
| **admin.py** | Admin DTOs | AdminStatsResponse, AdminRecentJob, AdminRecentApplication |

---

## 4. Services & Business Logic

### Backend Services (Python)
**Location:** `backend-api/app/services/`

#### Roadmap Service
**File:** `backend-api/app/services/roadmap_service.py`
- **Purpose:** Generate and manage learning roadmaps
- **Key Methods:**
  - `create_or_get_roadmap()` - Generate or retrieve cached roadmap
  - `get_user_roadmaps()` - Fetch all user's roadmaps
  - `build_roadmap_key()` - Create deterministic cache key
  - `_save_generated_roadmap()` - Persist shared roadmap
  - `_save_user_roadmap()` - Create user-specific roadmap
- **External Calls:** Gemini API for content generation
- **Caching:** Redis caching with TTL

#### Question Service
**File:** `backend-api/app/services/question_service.py`
- **Purpose:** Generate practice questions for interview prep
- **Key Methods:**
  - `generate_questions()` - Generate Q&A by topic/difficulty
  - `_generate_with_gemini()` - Call Gemini for generation
  - `evaluate_answer()` - AI evaluation of student answers
  - `get_suggested_topics()` - Topic recommendations
- **External Calls:** Gemini API
- **Caching:** Redis caching with 7-day TTL

#### Redis Cache Service
**File:** `backend-api/app/services/redis_cache.py`
- **Purpose:** Distributed caching for frequently accessed data
- **Key Methods:**
  - `cache_get()` - Retrieve from Redis
  - `cache_set()` - Store in Redis with TTL
  - `cache_delete()` - Remove cached entry
- **Use Cases:** Roadmaps, questions, job listings

#### Realtime Service
**File:** `backend-api/app/services/realtime.py`
- **Purpose:** Real-time updates via Redis pub/sub
- **Key Methods:**
  - `redis_subscriber()` - Listen for events
  - `publish_event()` - Broadcast updates
- **Events:** Job postings, applications, interview updates

#### Scraped Jobs Cache Service
**File:** `backend-api/app/services/scraped_jobs_cache.py`
- **Purpose:** Manage scraped job listings
- **Key Methods:**
  - `scheduler_loop()` - Run scraper every 24h
  - `update_cache()` - Refresh job cache
- **Scrapers:** Internshala, Naukri

#### Storage Service
**File:** `backend-api/app/services/storage_service.py`
- **Purpose:** File storage (resumes, documents)
- **Key Methods:**
  - `upload_file()` - Upload to Google Cloud Storage
  - `delete_file()` - Remove file
  - `get_signed_url()` - Generate temporary download link
- **Provider:** Google Cloud Storage

#### Company Profile Service
**File:** `backend-api/app/services/company_profile.py`
- **Purpose:** Manage company onboarding and profiles
- **Key Methods:**
  - `get_profile()` - Fetch company profile
  - `create_profile()` - Create new profile
  - `update_profile()` - Update existing profile
  - `publish_profile()` - Finalize onboarding

### AI Engine Services (Python)
**Location:** `ai-engine/app/services/`

#### Profile Matcher Service
**File:** `ai-engine/app/services/profile_matcher_service.py`
- **Purpose:** ML model for student-job matching (CRITICAL - NEVER MODIFIED)
- **Key Methods:**
  - `_load_matcher_artifact()` - Load trained model from joblib
  - `predict()` - Score student vs job match (0-100)
- **Model:** GradientBoostingRegressor with TF-IDF features
- **Training Data:** Skill overlap, role alignment, semantic similarity
- **Artifact Files:**
  - `ai-engine/models/profile_matcher.joblib` (fallback)
  - `ai-engine/models/profile_matcher_real.joblib` (production)

#### Resume Parser Service
**File:** `ai-engine/app/services/resume_parser.py`
- **Purpose:** Extract structured data from resumes
- **Extracts:**
  - Skills (with normalization)
  - Projects (name, tech stack, description)
  - Education (institution, degree, CGPA)
  - Experience (company, role, duration)
- **LLM:** Gemini 2.5 Flash
- **Output:** ResumeExtraction dataclass

#### Skill Extractor Service
**File:** `ai-engine/app/services/skill_extractor.py`
- **Purpose:** Extract and normalize skills from text
- **Key Methods:**
  - `extract_skills_from_text()` - Parse text for skills
  - `normalize_skill()` - Map to canonical skill names
- **Skill Taxonomy:** Predefined categories (languages, frameworks, tools, soft)

#### ATS Scorer Service
**File:** `ai-engine/app/services/ats_scorer.py`
- **Purpose:** Score resume for ATS compatibility (0-100)
- **Scoring Dimensions:**
  - Keyword density (30%) - JD skills in resume
  - Section completeness (25%) - All key sections present
  - Formatting (20%) - Clean structure, no artifacts
  - Quantified achievements (15%) - Numbers and metrics
  - Length (10%) - Ideal word count
- **Used by:** Resume analyzer

#### Recommender Service
**File:** `ai-engine/app/services/recommender.py`
- **Purpose:** Recommend jobs and skills
- **Key Methods:**
  - `get_recommendations()` - Rank jobs by semantic similarity
  - `get_skill_gap()` - Compare student vs job skills
- **Model:** Sentence-Transformers (all-MiniLM-L6-v2)
- **Similarity:** Cosine similarity on embeddings

#### Training Service
**File:** `ai-engine/app/services/training_service.py`
- **Purpose:** Train profile matcher model
- **Training Data:** Historical applications + manual labels
- **Output:** Joblib artifact saved to models/

#### Interview Generation Service
**File:** `ai-engine/app/services/interview_gen.py`
- **Purpose:** Generate mock interview questions
- **LLM:** Gemini 2.5 Flash
- **Context:** Job role, student skills, difficulty level

#### Explanation Service
**File:** `ai-engine/app/services/explanation_service.py`
- **Purpose:** Generate explanations for answers/concepts
- **LLM:** Gemini 2.5 Flash
- **Use Case:** Interview prep, question evaluation

#### Question Cache Service
**File:** `ai-engine/app/services/question_cache.py`
- **Purpose:** Cache generated questions
- **Storage:** Redis

#### Matcher Service
**File:** `ai-engine/app/services/matcher_service.py`
- **Purpose:** Interface to profile matcher model
- **Wrapper:** Around profile_matcher_service

#### Agent Service
**File:** `ai-engine/app/services/agent_service.py`
- **Purpose:** Coordinate agent execution
- **Responsibilities:**
  - Route requests to appropriate agents
  - Log execution steps
  - Handle errors and recovery
  - Track sessions

#### Redis Cache Service
**File:** `ai-engine/app/services/redis_cache.py`
- **Purpose:** Distributed caching
- **Use:** Questions, recommendations, scores

### Node.js/Express Scrapers
**Location:** `backend-api/scrapers/`

#### Scraper Scheduler
**File:** `backend-api/scrapers/scheduler.js`
- **Purpose:** Background job for scraping
- **Schedule:** Every 24 hours + on startup
- **Scrapers Called:**
  - `scrapeInternshala()` - Fetch Internshala jobs
  - `scrapeNaukri()` - Fetch Naukri jobs
- **Deduplication:** By applyUrl

#### Internshala Scraper
**File:** `backend-api/scrapers/internshala.js`
- **Purpose:** Scrape internship/job listings from Internshala
- **Extracted Fields:** Title, company, location, salary, deadline, description, skills
- **Caching:** In-memory cache with 1-hour TTL

#### Naukri Scraper
**File:** `backend-api/scrapers/naukri.js`
- **Purpose:** Scrape jobs from Naukri portal
- **Extracted Fields:** Similar to Internshala
- **Filtering:** By skills parameter

---

## 5. Utilities & Helpers

### Backend Utilities (Python)
**Location:** `backend-api/app/utils/`

#### Security Utility
**File:** `backend-api/app/utils/security.py`
- **Functions:**
  - `hash_password()` - Bcrypt hashing
  - `verify_password()` - Bcrypt verification
  - `create_access_token()` - JWT token generation (15-min expiry)
  - `create_refresh_token()` - JWT refresh token (7-day expiry)
  - `decode_token()` - Parse JWT token
- **Algorithm:** HS256 (JWT), Bcrypt (passwords)
- **Token Structure:** {sub, email, role, type, exp}

#### Text Cleaner Utility
**File:** `backend-api/app/utils/text_cleaner.py`
- **Functions:**
  - `clean_text()` - Remove special chars, normalize whitespace
  - `normalize_skills()` - Standardize skill names
  - `extract_numbers()` - Parse salary/experience values

### Frontend Utilities
**Location:** `frontend/src/`

#### API Client
**File:** `frontend/src/api/client.ts`
- **Axios Instances:**
  - `apiClient` - Main backend API
  - `aiClient` - AI engine API
  - `scraperClient` - Scraper API
- **Interceptors:**
  - Request: Attach JWT token
  - Response: Auto-logout on 401 (except auth endpoints)
- **Base URLs:** From environment variables (VITE_*)

#### API Modules
**Location:** `frontend/src/api/`

| Module | Purpose | Key Functions |
|--------|---------|----------------|
| **auth.ts** | Authentication | `register()`, `login()`, `me()`, `completeOnboarding()` |
| **student.ts** | Student profile | `getProfile()`, `updateProfile()`, `getStats()` |
| **jobs.ts** | Job listing | `listJobs()`, `getJob()`, `searchJobs()` |
| **applications.ts** | Applications | `apply()`, `getApplications()`, `updateStatus()` |
| **admin.ts** | Admin operations | `getStats()`, `manageCompanies()`, `manageStudents()` |
| **admin-jobs.ts** | Admin job posting | `postJob()`, `updateJob()`, `deleteJob()` |
| **company.ts** | Company profile | `getCompany()`, `updateCompany()` |
| **company-jobs.ts** | Company job posting | `postJob()`, `getJobs()` |
| **ai.ts** | AI services | `analyzeResume()`, `generateRoadmap()`, `autoApply()` |

#### Store Management
**Location:** `frontend/src/store/`

| Store | Purpose | State |
|-------|---------|-------|
| **authStore.ts** | Authentication state | `user`, `token`, `isAuthenticated`, `role` |
| **companyStore.ts** | Company data | Company profile, jobs, applications |
| **companyProfileStore.ts** | Company profile form | Draft profile, submission state |
| **adminStatsStore.ts** | Admin dashboard | Platform metrics, user counts |
| **adminCompanyStore.ts** | Admin company management | Company list, filters |

All stores use **Zustand** for lightweight state management.

#### Custom Hooks
**Location:** `frontend/src/hooks/`

| Hook | Purpose |
|------|---------|
| **useJobsRealtime.ts** | Real-time job updates via WebSocket |
| **use-theme.tsx** | Theme switching (light/dark mode) |

---

## 6. Middleware & Authentication

### Backend Middleware

#### CORS Middleware (FastAPI)
**File:** `backend-api/app/main.py`
```python
CORSMiddleware(
    allow_origins=[...],  # Frontend URLs
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)
```

#### HTTP Bearer Authentication
**File:** `backend-api/app/dependencies.py`
- **Header:** `Authorization: Bearer <JWT_TOKEN>`
- **Dependency:** `HTTPBearer()` from FastAPI
- **Extraction:** Validates JWT token, extracts user_id, role

### Dependency Injection
**File:** `backend-api/app/dependencies.py`

```python
async def get_db() → AsyncSession
  # Provides database session to routes

async def get_current_user() → User
  # Validates JWT token, returns authenticated user
  # Raises 401 if token invalid/expired
  # Raises 401 if user inactive
```

### Role-Based Access Control
**Implemented as route guards:**

```python
def require_student(user: User = Depends(get_current_user)) → User
def require_admin(user: User = Depends(get_current_user)) → User
def require_provider(user: User = Depends(get_current_user)) → User
```

### JWT Token Management
**File:** `backend-api/app/utils/security.py`
- **Access Token:** 15 minutes expiry
- **Refresh Token:** 7 days expiry
- **Secret:** `settings.JWT_SECRET` from env
- **Algorithm:** HS256

### Frontend Authentication Flow
1. User logs in → Backend generates tokens
2. Tokens stored in localStorage
3. All requests include `Authorization: Bearer <token>`
4. 401 response → Auto-logout + redirect to /login
5. Token refresh handled by refresh token endpoint (if implemented)

---

## 7. AI Models & LLM Integrations

### LLM Services

#### Gemini API Integration
**File:** `ai-engine/app/core/gemini_client.py`
- **API Key:** `GEMINI_API_KEY` environment variable
- **Models Used:**
  - **Gemini 2.5 Flash** (default for fast responses)
  - **Gemini 2.5 Pro** (for complex reasoning)
- **Use Cases:**
  - Resume extraction
  - Question generation
  - Interview questions
  - Cover letter generation
  - Intent parsing
  - Answer evaluation

#### Intent Agent (Gemini)
**File:** `ai-engine/app/agents/intent_agent.py`
- **Purpose:** Parse natural language job search instructions
- **Extracts:**
  - Job role / field
  - Salary range (min/max LPA)
  - Location
  - Work mode (remote/hybrid/onsite)
  - Job type (full-time/intern/contract)
  - Experience years
  - Additional constraints
- **Input Languages:** English, Hindi, Hinglish
- **Output:** `ParsedIntent` dataclass
- **Fallback:** Rule-based parser if Gemini fails

#### Resume Agent (Gemini)
**File:** `ai-engine/app/agents/resume_agent.py`
- **Purpose:** Extract structured data from resume text
- **Extracts:**
  - Skills (with normalization)
  - Projects (name, tech stack, description)
  - Education (institution, degree, CGPA, years)
  - Experience (company, role, duration, description)
- **Output:** `ResumeExtraction` dataclass
- **Integration:** Used in auto-apply pipeline

#### Validation Agent
**File:** `ai-engine/app/agents/validation_agent.py`
- **Purpose:** Validate job descriptions for quality
- **Checks:**
  - Completeness of JD
  - Realistic salary/requirements
  - Extractable skills
- **Output:** `ValidationResult` dataclass

#### Brain Agent (Gemini)
**File:** `ai-engine/app/agents/brain_agent.py`
- **Purpose:** LLM-first orchestrator - classifies every user message
- **Intent Classification:**
  - `greeting` → conversational reply
  - `general_query` → answer question
  - `job_search` → fetch + filter jobs
  - `job_apply` → run auto-apply pipeline
  - `resume_update` → extract resume
  - `profile_query` → return profile data
  - `memory_query` → read application logs
  - `unknown` → fallback reply
- **Output:** `BrainDecision` dataclass with intent + action + entities
- **Language Support:** English, Hindi, Hinglish

#### Auto-Apply Pipeline Agent
**File:** `ai-engine/app/agents/auto_apply_pipeline.py`
- **Purpose:** Autonomous job application system
- **Pipeline Steps:**
  1. Health check (Gemini, DB, models)
  2. Intent parsing (IntentAgent)
  3. Resume extraction (ResumeAgent)
  4. Fetch jobs (from admin or scraped)
  5. Validate jobs (ValidationAgent)
  6. ML prediction (profile_matcher_service.predict)
  7. Filter by intent (role, salary, location)
  8. Generate cover letters (Gemini)
  9. Apply to jobs
  10. Log results (AgentLog)
- **Key Safety Rules:**
  - `predict()` model NEVER modified
  - Only apply if score >= 50 AND CGPA meets minimum
  - Never apply without scoring
  - Transparent about match scores

### ML Models

#### Profile Matcher Model (CRITICAL)
**File:** `ai-engine/app/services/profile_matcher_service.py`
- **Type:** GradientBoostingRegressor
- **Input Features:**
  - skill_match_ratio
  - role_keyword_match
  - semantic_sim (sentence-transformers)
  - matched_skill_count_normalized
  - profile_skill_density
- **Output:** Match score (0-100)
- **Training:** Historical applications + manual labels
- **Artifact:** `ai-engine/models/profile_matcher_real.joblib`
- **Fallback:** Rule-based matching if model unavailable
- **Usage:** NEVER call directly - only through profile_matcher_service.predict()

#### Sentence-Transformers Model
**File:** `ai-engine/app/services/recommender.py`
- **Model Name:** all-MiniLM-L6-v2
- **Size:** ~80MB (loaded at startup)
- **Purpose:** Generate embeddings for semantic similarity
- **Use:**
  - Job recommendations
  - Skill gap analysis
  - Resume-to-JD matching
- **Similarity Metric:** Cosine similarity

### Tools & Utilities for Agents

#### Agent Tools (LangChain)
**File:** `ai-engine/app/services/tools.py`
- **fetch_admin_jobs()** - Get active jobs (with optional salary filter)
- **score_student_job_match()** - Call ML model for matching
- **generate_and_apply()** - Score + apply if qualified
- **apply_to_job()** - Apply via authenticated call
- **AGENT_SYSTEM_PROMPT** - Instructions for tool usage

---

## 8. User Role System

### Role Definitions
**File:** `backend-api/app/models/user.py`

```python
class UserRole(str, enum.Enum):
    student = "student"      # Job seekers / placement applicants
    admin = "admin"          # Platform administrators
    provider = "provider"    # Company HR / recruiters
```

### Student Role
**Capabilities:**
- Browse and apply for jobs
- Upload and analyze resumes
- Generate learning roadmaps
- Practice interview questions
- Track applications
- View interview schedules
- Access all student features

**Protected Routes:**
- `/student/*`
- `/applications/*`
- `/roadmap/*`
- `/questions/*`

**Profile:** Linked to `Student` model with academic info

### Admin Role
**Capabilities:**
- View all users and statistics
- Manage job postings (create, edit, delete)
- Manage student accounts
- Schedule interviews
- Manage companies/providers
- View analytics
- System configuration

**Protected Routes:**
- `/admin/*`

**Permissions:**
- Read: All users, jobs, applications
- Write: Jobs, applications, interviews, company profiles
- Delete: Jobs, users

### Provider Role
**Capabilities:**
- Complete company onboarding
- Post jobs
- View applicants for posted jobs
- Schedule interviews
- Accept/reject candidates
- View company analytics

**Protected Routes:**
- `/company/*`
- `/company/jobs/*`

**Profile:** Linked to `CompanyProfile` model

### Role Hierarchy & Guards
```python
def require_student(user: User) → User
    # Only students can access

def require_admin(user: User) → User
    # Only admins can access

def require_provider(user: User) → User
    # Admin OR provider can access

def require_admin_or_provider(user: User) → User
    # Admin OR provider can access
```

### Onboarding Flow by Role

#### Student Onboarding
1. Register with email/password
2. `is_onboarding_completed = false`
3. Complete profile (college, branch, skills)
4. `is_onboarding_completed = true`
5. Can now access job board

#### Provider Onboarding
1. Register with email/password as `provider` role
2. `is_draft = true` (company profile)
3. Fill company profile (name, website, industry, etc.)
4. Submit profile (`is_draft = false`)
5. Can now post jobs

#### Admin Onboarding
1. Created directly by system administrator
2. No special onboarding flow
3. Full access to admin panel

---

## 9. Background Jobs & Automated Workflows

### Job Scraping Scheduler

#### Scheduler Configuration
**File:** `backend-api/scrapers/scheduler.js`
- **Interval:** Every 24 hours
- **Execution:** On startup + scheduled
- **Scrapers:** Internshala, Naukri

#### Scraping Flow
1. `startScheduler()` called on app startup
2. Run `scrapeAllJobs()` immediately
3. Schedule cron job: `0 0 * * *` (midnight daily)
4. Deduplicate by URL
5. Cache in memory + DB

#### Internshala Jobs
**File:** `backend-api/scrapers/internshala.js`
- **Source:** Internshala.com
- **Fields:** Role, company, location, salary, deadline, description
- **Filtering:** By skills parameter
- **Caching:** 1-hour in-memory cache

#### Naukri Jobs
**File:** `backend-api/scrapers/naukri.js`
- **Source:** Naukri.com
- **Fields:** Similar to Internshala
- **API:** RSS feed or web scraping

### Scraped Jobs Cache Service

**File:** `backend-api/app/services/scraped_jobs_cache.py`
```python
async def scheduler_loop(interval_hours=24):
    # Run periodic updates
    while True:
        await update_cache()
        await asyncio.sleep(interval_hours * 3600)
```

### Real-time Updates via Redis Pub/Sub

**File:** `backend-api/app/services/realtime.py`
```python
async def redis_subscriber():
    # Listen for events
    # Publish: job postings, applications, interviews
    # Subscribe: WebSocket connections
```

### Agent Execution & Logging

#### Auto-Apply Session Tracking
**File:** `ai-engine/app/core/agent_logger.py` & `ai-engine/app/core/session_store.py`
- Each execution gets `session_id` (UUID)
- Every step logged to `AgentLog` table
- Trace includes: step, input, output, status, duration

#### Session Store
**In-memory + Redis cache:**
- `session_store[session_id]` → execution trace
- `resume_meta[student_id]` → resume extraction cache
- Auto-expire after 24 hours

### Monitoring & Health Checks

#### Health Check Endpoints
**Backend API:**
```
GET /health → {"status": "ok", "service": "backend-api"}
GET /debug/all-keys → Redis keys snapshot (debug only)
```

**AI Engine:**
```
GET /health → {"status": "ok", "service": "ai-engine"}
GET /model/health → Model loading status
GET /redis/health → Redis connectivity
GET /db/health → Backend API reachability
```

---

## 10. External API Integrations

### Google Cloud Services

#### Google Cloud Storage
**File:** `backend-api/app/services/storage_service.py`
- **Purpose:** Resume and document storage
- **Operations:**
  - `upload_file()` - Upload to GCS
  - `delete_file()` - Remove from GCS
  - `get_signed_url()` - Generate temporary URL
- **Configuration:** GCS credentials from `GOOGLE_CREDENTIALS`
- **Bucket:** Configured via `GCS_BUCKET_NAME`

#### Google OAuth 2.0
**File:** `backend-api/app/routers/google_auth.py`
- **Purpose:** Single sign-on (SSO) for students
- **Flow:**
  1. User clicks "Sign in with Google"
  2. Redirect to Google consent screen
  3. Callback → Create/update user
  4. Generate JWT tokens
  5. Redirect to dashboard
- **Credentials:** Google OAuth client ID/secret
- **Scope:** Profile, email

#### Google Gemini API
**File:** `ai-engine/app/core/gemini_client.py`
- **Purpose:** LLM for resume parsing, question generation, etc.
- **Models:**
  - Gemini 2.5 Flash (default, fast)
  - Gemini 2.5 Pro (complex reasoning)
- **API Key:** `GEMINI_API_KEY`
- **Usage:**
  - Resume parsing
  - Question generation
  - Interview questions
  - Answer evaluation
  - Intent parsing
  - Cover letter generation

### Upstash (Redis)

**Purpose:** Distributed caching for production
**Configuration:**
- `REDIS_URL` - Upstash Redis endpoint
- Async Redis client
- TTL support (7-day default for questions)

**Use Cases:**
- Cache roadmaps, questions
- Rate limiting
- Session tracking
- Real-time job updates

### External Job Portals

#### Internshala API
- **URL:** https://internshala.com
- **Method:** Web scraping or RSS feed
- **Frequency:** Daily (24h scheduler)
- **Fields:** Jobs, internships, locations, salary

#### Naukri Portal
- **URL:** https://naukri.com
- **Method:** Web scraping or API (if available)
- **Frequency:** Daily
- **Fields:** Jobs, companies, locations

### Environment Variables for Integrations

```bash
# Gemini
GEMINI_API_KEY=<api_key>

# Google Cloud
GOOGLE_CREDENTIALS=<json_path>
GCS_BUCKET_NAME=<bucket_name>
GOOGLE_OAUTH_CLIENT_ID=<client_id>
GOOGLE_OAUTH_CLIENT_SECRET=<client_secret>

# Redis/Upstash
REDIS_URL=<redis_endpoint>

# Frontend URLs
FRONTEND_URL=<url>
FRONTEND_URLS=<comma-separated>

# Backend Communication
BACKEND_URL=http://backend-api:8000
EXPRESS_BACKEND_URL=http://backend-api:8081
AI_ENGINE_URL=http://ai-engine:8001
```

### Third-Party Libraries

**Backend (Python):**
- fastapi, sqlalchemy, pydantic
- httpx (async HTTP)
- langchain (agent tools)
- scikit-learn (ML models)
- sentence-transformers (embeddings)
- redis, upstash
- google-cloud-storage, google-auth
- PyJWT, bcrypt

**Frontend (TypeScript/React):**
- react, react-router-dom
- axios (HTTP client)
- zustand (state management)
- tailwindcss (styling)
- firebase (if used)
- axios-based interceptors

**Node.js (Backend):**
- express, cors
- node-cron (scheduling)
- cheerio / puppeteer (web scraping)

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           SMART PLACEMENT TRACKER                            │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────┐
│   Frontend (React)   │
│  - Student Pages     │
│  - Admin Pages       │
│  - Company Pages     │
│  - Auth Pages        │
│  - Zustand Stores    │
└──────────────┬───────┘
               │
        ┌──────┴───────┐
        │              │
   ┌────▼─────┐  ┌────▼─────┐
   │  Backend  │  │ AI Engine │
   │   API     │  │  (Python) │
   │ (FastAPI) │  │           │
   └────┬─────┘  └────┬─────┘
        │              │
        │ ┌────────────┤
        │ │            │
        │ │        ┌───▼──────┐
        │ │        │  Agents  │
        │ │        │ - Intent │
        │ │        │ - Resume │
        │ │        │ - Brain  │
        │ │        │ - Validate
        │ │        │ - AutoApp
        │ │        └──────────┘
        │ │            │
    ┌───▼─┴─┐          │
    │  DB   │◄─────────┤
    │PostgreSQL        │
    │  Tables:         │
    │ - users          │
    │ - students       │
    │ - jobs           │
    │ - applications   │
    │ - roadmaps       │
    │ - agent_logs     │
    └───────┘          │
        ▲              │
        │        ┌─────▼──────┐
    ┌───┴────┐  │   LLMs &   │
    │  Redis │  │   Models   │
    │ Upstash│  │ - Gemini   │
    │        │  │ - Matcher  │
    └────────┘  │ - S-BERT   │
               └────────────┘

    ┌───────────────────────────────┐
    │   External Integrations       │
    │ - Google OAuth                │
    │ - Google Cloud Storage        │
    │ - Google Gemini API           │
    │ - Internshala Scraper         │
    │ - Naukri Scraper              │
    └───────────────────────────────┘
```

---

## Summary Statistics

| Category | Count |
|----------|-------|
| **React Components** | 50+ |
| **Backend Routes** | 40+ |
| **Database Models** | 12 |
| **Services** | 20+ |
| **AI Agents** | 6 |
| **API Integrations** | 5+ |
| **User Roles** | 3 |
| **Total Files** | 200+ |

---

## Key Design Patterns

### 1. **Dependency Injection**
- FastAPI `Depends()` for database sessions, authentication
- Router-level guards for role-based access

### 2. **Service Layer Architecture**
- Separation of concerns: routes → services → models → DB
- Reusable business logic across endpoints

### 3. **State Management**
- Frontend: Zustand stores for reactive state
- Backend: Database + Redis cache

### 4. **LLM-First Architecture**
- Brain Agent classifies every request
- Only complex actions trigger autonomous pipeline
- All AI calls logged for audit trail

### 5. **Pipeline Pattern**
- Auto-Apply: Sequential steps with error recovery
- Each step logged, can retry

### 6. **Caching Strategy**
- Redis for frequently accessed data (roadmaps, questions)
- Deterministic cache keys for consistency
- TTL-based expiration

### 7. **Real-time Updates**
- Redis Pub/Sub for events
- WebSocket support via realtime service
- Instant notifications for job postings, applications

---

**End of Comprehensive Codebase Analysis**
