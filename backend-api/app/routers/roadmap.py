from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.dependencies import get_current_user, get_db
from app.models.user import User
from app.schemas.roadmap import RoadmapRequest, RoadmapResponse
from app.services.roadmap_service import RoadmapService
from typing import List


router = APIRouter(prefix="/roadmap", tags=["roadmap"])


@router.post("/generate", response_model=RoadmapResponse)
async def generate_roadmap(
    request: RoadmapRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Generate or get existing roadmap for user"""
    try:
        service = RoadmapService(db)
        roadmap = await service.create_or_get_roadmap(str(current_user.id), request)
        return roadmap
    except ValueError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate roadmap: {str(e)}")


@router.get("/my", response_model=List[RoadmapResponse])
async def get_my_roadmaps(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all roadmaps for current user"""
    try:
        service = RoadmapService(db)
        roadmaps = await service.get_user_roadmaps(str(current_user.id))
        return roadmaps
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch roadmaps: {str(e)}")


@router.get("/{roadmap_id}", response_model=RoadmapResponse)
async def get_roadmap(
    roadmap_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get specific roadmap by ID"""
    try:
        service = RoadmapService(db)
        roadmaps = await service.get_user_roadmaps(str(current_user.id))
        
        for roadmap in roadmaps:
            if roadmap.id == roadmap_id:
                return roadmap
                
        raise HTTPException(status_code=404, detail="Roadmap not found")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch roadmap: {str(e)}")
