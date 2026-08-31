from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from .. import models
from ..database import get_db

router = APIRouter(prefix="/api/activities", tags=["activities"])


@router.get("")
def list_activities(limit: int = 100, event_type: str | None = None, developer_id: int | None = None,
                     db: Session = Depends(get_db)):
    q = db.query(models.Activity)
    if event_type:
        q = q.filter(models.Activity.event_type == event_type)
    if developer_id:
        q = q.filter(models.Activity.developer_id == developer_id)
    items = q.order_by(models.Activity.timestamp.desc()).limit(limit).all()
    return [
        {
            "id": a.id,
            "event_type": a.event_type,
            "developer_id": a.developer_id,
            "developer_name": a.developer.name if a.developer else None,
            "work_item_id": a.work_item_id,
            "source": a.source,
            "status": a.status,
            "payload": a.payload,
            "timestamp": a.timestamp,
        }
        for a in items
    ]
