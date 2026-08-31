from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from .. import models
from ..database import get_db

router = APIRouter(prefix="/api/verification", tags=["verification"])


def _serialize(v: models.Verification):
    return {
        "id": v.id,
        "work_item_id": v.work_item_id,
        "developer_id": v.developer_id,
        "developer_name": v.developer.name if v.developer else None,
        "module": v.work_item.module if v.work_item else None,
        "checks": v.checks,
        "evidence": v.evidence,
        "passed": v.passed,
        "failures": v.failures,
        "criteria": v.criteria,
        "timestamp": v.timestamp,
    }


@router.get("")
def list_verifications(developer_id: int | None = None, passed: bool | None = None,
                        db: Session = Depends(get_db)):
    q = db.query(models.Verification)
    if developer_id:
        q = q.filter(models.Verification.developer_id == developer_id)
    if passed is not None:
        q = q.filter(models.Verification.passed == passed)
    items = q.order_by(models.Verification.timestamp.desc()).all()
    summary = {
        "passed": db.query(models.Verification).filter(models.Verification.passed == True).count(),  # noqa: E712
        "failed": db.query(models.Verification).filter(models.Verification.passed == False).count(),  # noqa: E712
        "pending": db.query(models.WorkItem).filter(models.WorkItem.verification_status == "Pending").count(),
    }
    return {"items": [_serialize(v) for v in items], "summary": summary}


@router.get("/{verification_id}")
def get_verification(verification_id: int, db: Session = Depends(get_db)):
    v = db.query(models.Verification).get(verification_id)
    if not v:
        raise HTTPException(status_code=404, detail="Verification not found")
    return _serialize(v)
