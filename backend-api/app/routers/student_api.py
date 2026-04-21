"""Student-facing public API.

IMPORTANT: This router is PREPARED for the student dashboard team.
           Do NOT connect these endpoints to the admin/company dashboard.

All active jobs from ALL companies are visible here — this is by design.
Students browse across companies; companies operate in isolation from each other.

Endpoints:
  GET  /student/jobs              all active jobs (search + filters)
  GET  /student/jobs/{job_id}     job detail with full company info
  GET  /student/companies         all active companies (with job counts)
  WS   /student/ws/jobs           real-time job updates feed

WebSocket event schema:
  { "event": "job_created",     "job": { ...job fields... } }
  { "event": "job_updated",     "job": { ...job fields... } }
  { "event": "job_deleted",     "job": { "id": "...", "company_profile_id": "..." } }
  { "event": "job_activated",   "job": { ...job fields... } }
  { "event": "job_deactivated", "job": { ...job fields... } }

Connect WebSocket:
  ws://localhost:8000/api/v1/student/ws/jobs
  Send "ping" → receive "pong" (heartbeat)
"""
import uuid
from typing import Optional

from fastapi import APIRouter, Body, Depends, File, HTTPException, Query, UploadFile, WebSocket, WebSocketDisconnect
from pydantic import BaseModel
from sqlalchemy import or_, select, func
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

import httpx

from app.dependencies import get_db, get_current_user
from app.models.company_profile import CompanyProfile
from app.models.job import Job
from app.models.student import Student
from app.models.user import User
from app.models.skill import Skill
from app.schemas.student import StudentUpdate, StudentResponse
from app.services import storage_service

router = APIRouter(prefix="/student", tags=["student-api"])

from app.models.interview import Interview as InterviewModel


# ─── My Interviews (admin-scheduled, student-visible) ─────────────────────────

@router.get("/my-interviews", response_model=dict)
async def get_my_interviews(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Return all interviews scheduled by the admin for the logged-in student."""
    from sqlalchemy.orm import selectinload as _sl
    from app.models.job import Job as _Job

    # Resolve student record from user
    student_result = await db.execute(
        select(Student).where(Student.user_id == current_user.id)
    )
    student = student_result.scalar_one_or_none()
    if not student:
        return {"success": True, "data": []}

    result = await db.execute(
        select(
            InterviewModel.id,
            InterviewModel.job_id,
            InterviewModel.scheduled_at,
            InterviewModel.mode,
            InterviewModel.meeting_link,
            InterviewModel.status,
            InterviewModel.notes,
            InterviewModel.created_at,
            _Job.role_title,
            _Job.company_name,
        )
        .join(_Job, _Job.id == InterviewModel.job_id)
        .where(InterviewModel.student_id == student.id)
        .order_by(InterviewModel.scheduled_at.asc())
    )
    rows = result.mappings().all()
    data = [
        {
            "id": str(r["id"]),
            "job_id": str(r["job_id"]),
            "company_name": r["company_name"],
            "role_title": r["role_title"],
            "scheduled_at": r["scheduled_at"].isoformat(),
            "mode": r["mode"].value if hasattr(r["mode"], "value") else r["mode"],
            "meeting_link": r["meeting_link"],
            "status": r["status"].value if hasattr(r["status"], "value") else r["status"],
            "notes": r["notes"],
            "created_at": r["created_at"].isoformat(),
        }
        for r in rows
    ]
    return {"success": True, "data": data}




# ─── Resume Upload & Access ───────────────────────────────────────────────────

@router.post("/upload-resume")
async def upload_resume(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Upload a resume PDF to GCS with versioning.

    Each upload creates a new Resume row (v1, v2, …). Old versions are preserved
    in GCS and the DB (is_active=False). The student.resume_url pointer is updated
    to the latest GCS key for backward-compat with the rest of the app.
    """
    from app.models.resume import Resume

    if file.content_type not in storage_service.ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=415,
            detail="Only PDF files are accepted. Please upload a .pdf resume.",
        )

    file_bytes = await file.read()
    if len(file_bytes) > storage_service.MAX_RESUME_SIZE_BYTES:
        raise HTTPException(
            status_code=413,
            detail="File too large. Maximum resume size is 5 MB.",
        )

    result = await db.execute(select(Student).where(Student.user_id == current_user.id))
    student = result.scalar_one_or_none()
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found.")

    # Find current version number
    ver_result = await db.execute(
        select(func.max(Resume.version)).where(Resume.student_id == student.id)
    )
    latest_ver = ver_result.scalar() or 0
    new_version = latest_ver + 1

    # Deactivate all existing active resumes
    active_result = await db.execute(
        select(Resume).where(Resume.student_id == student.id, Resume.is_active == True)
    )
    for old in active_result.scalars().all():
        old.is_active = False

    # Upload to GCS — do NOT delete old versions
    try:
        object_key = storage_service.upload_resume(file_bytes, str(student.id))
    except RuntimeError as exc:
        raise HTTPException(status_code=502, detail=str(exc))

    # Create versioned record
    new_resume = Resume(
        student_id=student.id,
        gcs_key=object_key,
        file_name=file.filename or "resume.pdf",
        version=new_version,
        is_active=True,
    )
    db.add(new_resume)

    # Keep student.resume_url in sync for backward-compat
    student.resume_url = object_key
    student.resume_name = file.filename or "resume.pdf"

    await db.commit()
    await db.refresh(new_resume)

    return {
        "message": "Resume uploaded successfully.",
        "resume_id": str(new_resume.id),
        "version": new_version,
        "file_name": new_resume.file_name,
    }


@router.get("/resume")
async def get_my_resume(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Return latest active resume metadata + 15-min signed URL."""
    from app.models.resume import Resume

    student_q = await db.execute(select(Student).where(Student.user_id == current_user.id))
    student = student_q.scalar_one_or_none()
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found.")

    resume_q = await db.execute(
        select(Resume)
        .where(Resume.student_id == student.id, Resume.is_active == True)
        .order_by(Resume.version.desc())
        .limit(1)
    )
    resume = resume_q.scalar_one_or_none()

    # Fallback: student.resume_url set before versioning was added
    gcs_key = resume.gcs_key if resume else student.resume_url
    if not gcs_key:
        raise HTTPException(status_code=404, detail="No resume uploaded yet.")

    try:
        signed_url = storage_service.generate_signed_url(gcs_key, expiry_minutes=15)
    except RuntimeError as exc:
        raise HTTPException(status_code=502, detail=str(exc))

    return {
        "resume_id": str(resume.id) if resume else None,
        "version": resume.version if resume else 1,
        "file_name": resume.file_name if resume else student.resume_name,
        "signed_url": signed_url,
        "expires_in_minutes": 15,
    }


@router.get("/resume/history")
async def get_resume_history(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Return all resume versions for this student (newest first)."""
    from app.models.resume import Resume

    student_q = await db.execute(select(Student).where(Student.user_id == current_user.id))
    student = student_q.scalar_one_or_none()
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found.")

    result = await db.execute(
        select(Resume)
        .where(Resume.student_id == student.id)
        .order_by(Resume.version.desc())
    )
    resumes = result.scalars().all()

    return {
        "success": True,
        "data": [
            {
                "id": str(r.id),
                "version": r.version,
                "file_name": r.file_name,
                "is_active": r.is_active,
                "uploaded_at": r.created_at.isoformat(),
            }
            for r in resumes
        ],
    }


@router.get("/resume/{resume_id}/url")
async def get_resume_signed_url(
    resume_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Generate a 15-min signed URL for any specific resume version."""
    from app.models.resume import Resume
    import uuid as _uuid

    student_q = await db.execute(select(Student).where(Student.user_id == current_user.id))
    student = student_q.scalar_one_or_none()
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found.")

    try:
        rid = _uuid.UUID(resume_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid resume ID.")

    resume_q = await db.execute(
        select(Resume).where(Resume.id == rid, Resume.student_id == student.id)
    )
    resume = resume_q.scalar_one_or_none()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found.")

    try:
        signed_url = storage_service.generate_signed_url(resume.gcs_key, expiry_minutes=15)
    except RuntimeError as exc:
        raise HTTPException(status_code=502, detail=str(exc))

    return {"signed_url": signed_url, "expires_in_minutes": 15}


class AnalyzeResumeRequest(BaseModel):
    job_description: str = ""


@router.post("/resume/analyze")
async def analyze_resume(
    body: AnalyzeResumeRequest = Body(default=AnalyzeResumeRequest()),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Analyze the student's latest stored resume using Gemini.

    Flow:
      1. Fetch latest active Resume from DB.
      2. Check Redis cache (keyed resume:analyze:{resume_id}:{jd_hash}).
      3. On miss: download PDF bytes from GCS, call Gemini inline_data, parse JSON.
      4. Store ResumeAnalysis row, update student.ats_score, cache result (1h).
    """
    import base64
    import hashlib
    import json as _json
    from app.models.resume import Resume, ResumeAnalysis
    from app.services.redis_cache import cache_get, cache_set
    from app.config import settings as _settings

    job_description: str = body.job_description or ""

    student_q = await db.execute(select(Student).where(Student.user_id == current_user.id))
    student = student_q.scalar_one_or_none()
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found.")

    resume_q = await db.execute(
        select(Resume)
        .where(Resume.student_id == student.id, Resume.is_active == True)
        .order_by(Resume.version.desc())
        .limit(1)
    )
    resume = resume_q.scalar_one_or_none()
    if not resume:
        raise HTTPException(status_code=404, detail="No resume uploaded yet. Please upload your resume first.")

    # Cache key includes JD hash so different JDs get different cached analyses
    jd_hash = hashlib.md5(job_description.encode()).hexdigest()[:8]
    cache_key = f"resume:analyze:{resume.id}:{jd_hash}"
    cached = await cache_get(cache_key)
    if cached:
        return {"success": True, "cached": True, "data": cached}

    # Download PDF bytes from GCS
    try:
        pdf_bytes = storage_service.download_resume_bytes(resume.gcs_key)
    except RuntimeError as exc:
        raise HTTPException(status_code=502, detail=str(exc))

    pdf_b64 = base64.b64encode(pdf_bytes).decode()

    prompt = """You are an expert ATS resume analyzer. Analyze this resume {jd_context}.
Respond ONLY with valid JSON, no markdown, no backticks:
{{
  "atsScore": 78,
  "breakdown": {{"keywordsMatch": 80, "formatScore": 75, "skillsRelevance": 82, "experienceMatch": 70}},
  "strengths": ["s1", "s2", "s3"],
  "improvements": ["i1", "i2", "i3"],
  "missingKeywords": ["k1", "k2"],
  "suggestedKeywords": ["k1", "k2"],
  "summary": "2-3 sentence overall assessment"
}}""".format(
        jd_context=f"for this job description: {job_description}" if job_description else "for general ATS compatibility"
    )

    if not _settings.GEMINI_API_KEY:
        raise HTTPException(status_code=503, detail="AI analysis service not configured.")

    gemini_url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={_settings.GEMINI_API_KEY}"

    try:
        async with httpx.AsyncClient(timeout=60) as client:
            resp = await client.post(
                gemini_url,
                json={
                    "contents": [{
                        "parts": [
                            {"inline_data": {"mime_type": "application/pdf", "data": pdf_b64}},
                            {"text": prompt},
                        ]
                    }],
                    "generationConfig": {
                        "temperature": 0.1,
                        "maxOutputTokens": 2048,
                        "thinkingConfig": {"thinkingBudget": 0},
                        "responseMimeType": "application/json",
                    },
                },
            )
        resp.raise_for_status()
        resp_json = resp.json()
        raw_text = resp_json.get("candidates", [{}])[0].get("content", {}).get("parts", [{}])[0].get("text", "").strip()
        # Strip markdown code fences if model wrapped the JSON
        if raw_text.startswith("```"):
            raw_text = raw_text.split("```")[-2] if raw_text.count("```") >= 2 else raw_text
            raw_text = raw_text.lstrip("json").strip()
        if not raw_text:
            finish = resp_json.get("candidates", [{}])[0].get("finishReason", "UNKNOWN")
            raise HTTPException(status_code=502, detail=f"Gemini returned empty response (finishReason={finish}).")
        analysis = _json.loads(raw_text)
    except (_json.JSONDecodeError, KeyError, IndexError) as exc:
        raise HTTPException(status_code=502, detail=f"AI response parsing failed: {exc}")
    except httpx.HTTPStatusError as exc:
        raise HTTPException(status_code=502, detail=f"Gemini API error: {exc}")

    ats_score = int(analysis.get("atsScore", 0))

    # Persist analysis
    record = ResumeAnalysis(
        student_id=student.id,
        resume_id=resume.id,
        ats_score=ats_score,
        feedback=_json.dumps(analysis),
        job_description=job_description or None,
    )
    db.add(record)
    student.ats_score = ats_score
    await db.commit()
    await db.refresh(record)

    # Cache for 1 hour
    await cache_set(cache_key, analysis, ttl=3600)

    return {"success": True, "cached": False, "data": analysis, "analysis_id": str(record.id)}


@router.get("/resume/analysis/history")
async def get_analysis_history(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Return all past ATS analyses for this student (newest first)."""
    import json as _json
    from app.models.resume import Resume, ResumeAnalysis

    student_q = await db.execute(select(Student).where(Student.user_id == current_user.id))
    student = student_q.scalar_one_or_none()
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found.")

    result = await db.execute(
        select(ResumeAnalysis, Resume.version, Resume.file_name)
        .join(Resume, ResumeAnalysis.resume_id == Resume.id)
        .where(ResumeAnalysis.student_id == student.id)
        .order_by(ResumeAnalysis.created_at.desc())
        .limit(20)
    )
    rows = result.all()

    return {
        "success": True,
        "data": [
            {
                "id": str(ra.id),
                "resume_version": version,
                "file_name": file_name,
                "ats_score": ra.ats_score,
                "analyzed_at": ra.created_at.isoformat(),
                "job_description_snippet": (ra.job_description or "")[:80] or None,
                "feedback": _json.loads(ra.feedback) if ra.feedback else None,
            }
            for ra, version, file_name in rows
        ],
    }


# ─── Profile Management ────────────────────────────────────────────────────────

@router.get("/profile", response_model=StudentResponse)
async def get_my_profile(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Student)
        .options(selectinload(Student.skills))
        .where(Student.user_id == current_user.id)
    )
    student = result.scalar_one_or_none()
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")
    return student


@router.patch("/profile", response_model=StudentResponse)
async def update_my_profile(
    data: StudentUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Student)
        .options(selectinload(Student.skills))
        .where(Student.user_id == current_user.id)
    )
    student = result.scalar_one_or_none()
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")

    update_data = data.model_dump(exclude_unset=True)

    # Handle skills separately if provided
    if "skills" in update_data:
        skill_names = update_data.pop("skills")
        # Clear existing skills and add new ones (skills already eager-loaded — no lazy IO)
        student.skills = []
        for name in skill_names:
            sk_res = await db.execute(select(Skill).where(Skill.name == name))
            sk = sk_res.scalar_one_or_none()
            if not sk:
                sk = Skill(id=uuid.uuid4(), name=name)
                db.add(sk)
            student.skills.append(sk)

    for key, value in update_data.items():
        setattr(student, key, value)

    await db.commit()
    await db.refresh(student)
    return student


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _job_row(j: Job) -> dict:
    return {
        "id": str(j.id),
        "company_name": j.company_name,
        "company_profile_id": str(j.company_profile_id) if j.company_profile_id else None,
        "role_title": j.role_title,
        "location": j.location,
        "salary_min": j.salary_min,
        "salary_max": j.salary_max,
        "experience_min": j.experience_min,
        "experience_max": j.experience_max,
        "job_type": j.job_type.value if j.job_type else None,
        "description": j.description,
        "deadline": j.deadline.isoformat() if j.deadline else None,
        "is_active": j.is_active,
        "created_at": j.created_at.isoformat(),
    }


# ─── Routes ───────────────────────────────────────────────────────────────────

@router.get("/jobs", response_model=dict)
async def list_all_jobs(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    search: Optional[str] = Query(
        None,
        description="Full-text search across role_title, company_name, description",
    ),
    location: Optional[str] = None,
    job_type: Optional[str] = None,
    company_name: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    """
    Return active jobs posted by companies via their dashboard (company_profile_id IS NOT NULL).

    Scraped/external jobs (company_profile_id=None) are served separately via /jobs/external.
    Supports search (role, company, description), location, job_type, and company_name filters.
    """
    query = select(Job).where(Job.is_active == True, Job.company_profile_id != None)

    if search:
        query = query.where(
            or_(
                Job.role_title.ilike(f"%{search}%"),
                Job.company_name.ilike(f"%{search}%"),
                Job.description.ilike(f"%{search}%"),
            )
        )
    if location:
        query = query.where(Job.location.ilike(f"%{location}%"))
    if job_type:
        query = query.where(Job.job_type == job_type)
    if company_name:
        query = query.where(Job.company_name.ilike(f"%{company_name}%"))

    total = await db.scalar(select(func.count()).select_from(query.subquery()))
    result = await db.execute(
        query.order_by(Job.created_at.desc())
        .offset((page - 1) * limit)
        .limit(limit)
    )
    jobs = result.scalars().all()

    return {
        "success": True,
        "data": [_job_row(j) for j in jobs],
        "meta": {"page": page, "limit": limit, "total": total or 0},
    }


@router.get("/jobs/external", response_model=dict)
async def list_external_jobs(
    limit: int = Query(30, ge=1, le=60),
):
    """
    External job feed proxy (CORS-safe for the frontend).

    Why this exists:
    - Many public job APIs don't send permissive CORS headers, so browser fetch() fails.
    - We proxy via the backend to make the student job board reliable without API keys.

    Current source:
    - Arbeitnow Job Board API (no key)
    """
    try:
        async with httpx.AsyncClient(timeout=20, follow_redirects=True) as client:
            # Arbeitnow redirects arbeitnow.com -> www.arbeitnow.com (301)
            res = await client.get("https://www.arbeitnow.com/api/job-board-api")
            res.raise_for_status()
            payload = res.json()
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"External jobs fetch failed: {e}")

    from app.utils.text_cleaner import normalize_description, fallback

    out = []
    skipped_non_english = 0
    for j in (payload.get("data") or []):
        title = j.get("title") or ""
        company = j.get("company_name") or ""
        location = j.get("location") or ("Remote" if j.get("remote") else "Not specified")
        raw_desc = j.get("description") or ""
        url = j.get("url") or ""
        slug = j.get("slug") or url

        # Clean pipeline: strip HTML -> decode entities -> collapse ws -> detect lang -> truncate.
        description, lang = normalize_description(raw_desc, max_len=220, translate_non_english=False)

        if lang not in ("en", "unknown"):
            skipped_non_english += 1

        out.append(
            {
                "id": f"arb-{slug}",
                "title": title,
                "company": company,
                "location": fallback(location, "Location not specified"),
                "salary": fallback(None, "Salary not disclosed"),
                "applyUrl": url,
                "source": "Arbeitnow",
                "description": description or "No description available.",
                "language": lang,
                "employmentType": "remote" if j.get("remote") else "full-time",
            }
        )
        if len(out) >= limit:
            break

    return {
        "success": True,
        "data": out,
        "meta": {"limit": limit, "returned": len(out), "skipped_non_english": skipped_non_english},
    }


@router.get("/jobs/{job_id}")
async def get_job_detail(
    job_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    """
    Get full detail for a single active job, including the company profile.

    Returns 404 if the job is inactive (expired/closed).
    The `company` block gives students rich company info (logo, website, etc.).
    """
    job = await db.get(Job, job_id)
    if not job or not job.is_active:
        raise HTTPException(status_code=404, detail="Job not found")

    company_data = None
    if job.company_profile_id:
        company = await db.get(CompanyProfile, job.company_profile_id)
        if company:
            company_data = {
                "id": str(company.id),
                "company_name": company.company_name,
                "website": company.website,
                "logo_url": company.logo_url,
                "industry_type": company.industry_type,
                "location": company.location,
                "company_size": company.company_size,
                "description": company.description,
                "linkedin_url": company.linkedin_url,
                "founded_year": company.founded_year,
            }

    return {
        "success": True,
        "data": {
            **_job_row(job),
            "company": company_data,
        },
    }


@router.get("/companies")
async def list_companies(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=50),
    search: Optional[str] = None,
    industry_type: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    """
    List all active (non-draft) companies.

    Includes a live `active_jobs_count` per company so students can see
    which companies are currently hiring.
    """
    query = select(CompanyProfile).where(CompanyProfile.is_draft == False)
    if search:
        query = query.where(CompanyProfile.company_name.ilike(f"%{search}%"))
    if industry_type:
        query = query.where(CompanyProfile.industry_type == industry_type)

    total = await db.scalar(select(func.count()).select_from(query.subquery()))
    result = await db.execute(
        query.order_by(CompanyProfile.created_at.desc())
        .offset((page - 1) * limit)
        .limit(limit)
    )
    companies = result.scalars().all()

    company_ids = [c.id for c in companies]
    job_counts: dict = {}
    if company_ids:
        counts_result = await db.execute(
            select(Job.company_profile_id, func.count(Job.id).label("cnt"))
            .where(Job.company_profile_id.in_(company_ids), Job.is_active == True)
            .group_by(Job.company_profile_id)
        )
        job_counts = {row.company_profile_id: row.cnt for row in counts_result.all()}

    data = [
        {
            "id": str(c.id),
            "company_name": c.company_name,
            "website": c.website,
            "logo_url": c.logo_url,
            "industry_type": c.industry_type,
            "location": c.location,
            "company_size": c.company_size,
            "description": c.description,
            "founded_year": c.founded_year,
            "active_jobs_count": job_counts.get(c.id, 0),
        }
        for c in companies
    ]

    return {
        "success": True,
        "data": data,
        "meta": {"page": page, "limit": limit, "total": total or 0},
    }


@router.websocket("/ws/jobs")
async def jobs_websocket(websocket: WebSocket):
    """
    Real-time job updates WebSocket endpoint.

    Connect: ws://localhost:8000/api/v1/student/ws/jobs
    Heartbeat: send "ping" → server replies "pong"

    Events pushed by the server:
      job_created    — a company posted a new job
      job_updated    — a company edited a job
      job_deleted    — a company removed a job
      job_activated  — a company re-opened a closed job
      job_deactivated — a company closed an active job
    """
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        manager.disconnect(websocket)
