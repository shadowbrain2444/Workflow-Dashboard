from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from .. import models, schemas
from ..database import get_db

router = APIRouter(prefix="/api/meta", tags=["meta"])


@router.get("")
def get_meta(db: Session = Depends(get_db)):
    developers = db.query(models.Developer).order_by(models.Developer.id).all()
    apis = db.query(models.APIItem).order_by(models.APIItem.endpoint).all()
    modules = sorted({m.module for m in db.query(models.WorkItem.module).distinct()})
    return {
        "developers": [schemas.DeveloperOut.model_validate(d).model_dump() for d in developers],
        "apis": [{"id": a.id, "endpoint": a.endpoint, "owner_id": a.owner_id} for a in apis],
        "modules": modules,
        "statuses": schemas.VALID_STATUSES,
        "verification_statuses": schemas.VALID_VERIFICATION,
        "priorities": schemas.VALID_PRIORITY,
        "issue_statuses": schemas.VALID_ISSUE_STATUS,
        "dod_statuses": schemas.VALID_DOD_STATUS,
    }
