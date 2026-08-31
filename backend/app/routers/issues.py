from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from .. import models, schemas
from ..database import get_db

router = APIRouter(prefix="/api/issues", tags=["issues"])


def _serialize(i: models.Issue):
    return {
        "id": i.id,
        "developer_id": i.developer_id,
        "developer_name": i.developer.name if i.developer else None,
        "work_item_id": i.work_item_id,
        "module": i.module,
        "description": i.description,
        "priority": i.priority,
        "status": i.status,
        "resolution": i.resolution,
        "created_at": i.created_at,
        "updated_at": i.updated_at,
    }


@router.get("")
def list_issues(status: str | None = None, developer_id: int | None = None, db: Session = Depends(get_db)):
    q = db.query(models.Issue)
    if status:
        q = q.filter(models.Issue.status == status)
    if developer_id:
        q = q.filter(models.Issue.developer_id == developer_id)
    items = q.order_by(models.Issue.created_at.desc()).all()
    return [_serialize(i) for i in items]


@router.put("/{issue_id}")
def update_issue(issue_id: int, payload: schemas.IssueUpdate, db: Session = Depends(get_db)):
    issue = db.query(models.Issue).get(issue_id)
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")
    if payload.status is not None:
        issue.status = payload.status
    if payload.resolution is not None:
        issue.resolution = payload.resolution
    if payload.priority is not None:
        issue.priority = payload.priority
    db.commit()
    db.refresh(issue)

    db.add(models.Activity(
        event_type="issue.updated",
        developer_id=issue.developer_id,
        work_item_id=issue.work_item_id,
        source="dashboard",
        status=issue.status.lower().replace(" ", "_"),
        payload=f"Issue #{issue.id} ({issue.module}) set to {issue.status}",
    ))
    db.commit()

    return _serialize(issue)
