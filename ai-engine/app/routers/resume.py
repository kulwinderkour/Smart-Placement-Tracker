from fastapi import APIRouter, File, HTTPException, UploadFile

from app.config import settings
from app.services.ats_scorer import compute_ats_score
from app.services.resume_parser import parse_resume
from app.services.skill_extractor import extract_skills_from_text

router = APIRouter(prefix="/ai", tags=["resume"])


@router.post("/resume/analyse")
async def analyse_resume(file: UploadFile = File(...)):
    contents = await file.read()
    size_mb = len(contents) / (1024 * 1024)
    if size_mb > settings.MAX_RESUME_SIZE_MB:
        raise HTTPException(
            status_code=400,
            detail=f"File too large. Max {settings.MAX_RESUME_SIZE_MB}MB.",
        )

    if not file.filename.lower().endswith((".pdf", ".docx")):
        raise HTTPException(
            status_code=400,
            detail="Only PDF and DOCX files are supported.",
        )

    resume_text = parse_resume(contents, file.filename)
    if not resume_text:
        raise HTTPException(status_code=422, detail="Could not extract text from resume.")

    skills = extract_skills_from_text(resume_text)
    skill_names = [s["name"] for s in skills]

    ats_result = compute_ats_score(resume_text, skill_names)

    return {
        "success": True,
        "data": {
            "skills": skills,
            "skill_count": len(skills),
            "ats_score": ats_result["ats_score"],
            "breakdown": ats_result["breakdown"],
            "suggestions": ats_result["suggestions"],
            "word_count": len(resume_text.split()),
        },
    }
