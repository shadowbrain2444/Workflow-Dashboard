from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from .. import stats
from ..database import get_db

router = APIRouter(prefix="/api/weekly-progress", tags=["weekly-progress"])


@router.get("")
def get_weekly_progress(db: Session = Depends(get_db)):
    return stats.compute_weekly_progress(db)
