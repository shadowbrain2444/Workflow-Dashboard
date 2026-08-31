from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from .. import stats
from ..database import get_db

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("/summary")
def get_summary(db: Session = Depends(get_db)):
    return stats.compute_summary(db)


@router.get("/daily-progress")
def get_daily_progress(db: Session = Depends(get_db)):
    return stats.compute_daily_progress(db)


@router.get("/developer-progress")
def get_developer_progress(db: Session = Depends(get_db)):
    return stats.compute_developer_progress(db)
