from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from .. import models
from ..database import get_db

router = APIRouter(prefix="/api/api-progress", tags=["api-progress"])


@router.get("")
def list_api_progress(owner_id: int | None = None, category: str | None = None, status: str | None = None,
                       db: Session = Depends(get_db)):
    q = db.query(models.APIItem)
    if owner_id:
        q = q.filter(models.APIItem.owner_id == owner_id)
    if category:
        q = q.filter(models.APIItem.category == category)
    if status:
        q = q.filter(models.APIItem.status == status)
    items = q.order_by(models.APIItem.owner_id, models.APIItem.category, models.APIItem.endpoint).all()
    return [
        {
            "id": a.id,
            "endpoint": a.endpoint,
            "method": a.method,
            "owner_id": a.owner_id,
            "owner_name": a.owner.name if a.owner else None,
            "purpose": a.purpose,
            "category": a.category,
            "status": a.status,
            "tested": a.tested,
            "verification_status": a.verification_status,
            "updated_at": a.updated_at,
        }
        for a in items
    ]
