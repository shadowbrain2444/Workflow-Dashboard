from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import Optional
from .. import models, schemas
from ..database import get_db
from ..stats import work_item_to_out

router = APIRouter(prefix="/api/work-items", tags=["work-items"])

EVENT_BY_STATUS = {
    "Pending": "task.created",
    "Running": "agent.running",
    "Verifying": "verification.started",
    "Completed": "agent.completed",
    "Failed": "verification.failed",
    "Cancelled": "agent.terminated",
}


def _api_status_for_work_status(work_status: str) -> str:
    return {
        "Pending": "Not Started",
        "Running": "In Progress",
        "Verifying": "In Progress",
        "Completed": "Implemented",
        "Failed": "In Progress",
        "Cancelled": "Not Started",
    }.get(work_status, "Not Started")


def _sync_apis(db: Session, wi: models.WorkItem, api_ids: list[int]):
    db.query(models.WorkItemAPI).filter(models.WorkItemAPI.work_item_id == wi.id).delete()
    for api_id in api_ids:
        api_item = db.query(models.APIItem).get(api_id)
        if not api_item:
            raise HTTPException(status_code=400, detail=f"Unknown API id {api_id}")
        db.add(models.WorkItemAPI(work_item_id=wi.id, api_item_id=api_id))
        api_item.status = _api_status_for_work_status(wi.status)
        if wi.verification_status == "Passed":
            api_item.tested = True
            api_item.verification_status = "Passed"
        elif wi.verification_status == "Failed":
            api_item.verification_status = "Failed"
        else:
            api_item.verification_status = api_item.verification_status or "Pending"


def _handle_verification(db: Session, wi: models.WorkItem, old_verification: Optional[str]):
    if wi.verification_status in ("Passed", "Failed") and wi.verification_status != old_verification:
        db.add(models.Verification(
            work_item_id=wi.id,
            developer_id=wi.developer_id,
            checks=f"Verification for Day {wi.day} - {wi.module}",
            evidence=wi.evidence or "No evidence attached",
            passed=(wi.verification_status == "Passed"),
            failures="" if wi.verification_status == "Passed" else (wi.issues_blockers or "Verification failed"),
            criteria=wi.next_planned_work or "Meets module success criteria",
        ))
        db.add(models.Activity(
            event_type="verification.passed" if wi.verification_status == "Passed" else "verification.failed",
            developer_id=wi.developer_id,
            work_item_id=wi.id,
            source="verification",
            status=wi.verification_status.lower(),
            payload=f"Verification {wi.verification_status.lower()} for {wi.module} (Day {wi.day})",
        ))


def _handle_issue(db: Session, wi: models.WorkItem):
    if not wi.issues_blockers.strip():
        return
    existing = (
        db.query(models.Issue)
        .filter(models.Issue.work_item_id == wi.id, models.Issue.status != "Resolved")
        .first()
    )
    if existing:
        existing.description = wi.issues_blockers
        existing.module = wi.module
    else:
        priority = "High" if wi.status == "Failed" else "Medium"
        db.add(models.Issue(
            developer_id=wi.developer_id,
            work_item_id=wi.id,
            module=wi.module,
            description=wi.issues_blockers,
            priority=priority,
            status="Open",
        ))


def _log_activity(db: Session, wi: models.WorkItem, is_new: bool):
    event_type = EVENT_BY_STATUS.get(wi.status, "task.created")
    db.add(models.Activity(
        event_type="task.created" if is_new and wi.status == "Pending" else event_type,
        developer_id=wi.developer_id,
        work_item_id=wi.id,
        source="dashboard",
        status=wi.status.lower(),
        payload=f"{'Logged' if is_new else 'Updated'} work on {wi.module} (Day {wi.day}) - status {wi.status}",
    ))


@router.get("", response_model=schemas.PaginatedWorkItems)
def list_work_items(
    developer_id: Optional[int] = None,
    day: Optional[int] = None,
    status: Optional[str] = None,
    module: Optional[str] = None,
    verification_status: Optional[str] = None,
    date: Optional[str] = None,
    search: Optional[str] = None,
    sort_by: str = "updated_at",
    sort_dir: str = "desc",
    page: int = 1,
    page_size: int = 20,
    db: Session = Depends(get_db),
):
    q = db.query(models.WorkItem)
    if developer_id:
        q = q.filter(models.WorkItem.developer_id == developer_id)
    if day:
        q = q.filter(models.WorkItem.day == day)
    if status:
        q = q.filter(models.WorkItem.status == status)
    if module:
        q = q.filter(models.WorkItem.module == module)
    if verification_status:
        q = q.filter(models.WorkItem.verification_status == verification_status)
    if date:
        q = q.filter(models.WorkItem.date == date)
    if search:
        like = f"%{search}%"
        q = q.filter(or_(
            models.WorkItem.module.ilike(like),
            models.WorkItem.description.ilike(like),
            models.WorkItem.tasks_completed.ilike(like),
        ))

    total = q.count()

    sort_col = getattr(models.WorkItem, sort_by, models.WorkItem.updated_at)
    q = q.order_by(sort_col.desc() if sort_dir == "desc" else sort_col.asc())

    page = max(page, 1)
    page_size = min(max(page_size, 1), 200)
    items = q.offset((page - 1) * page_size).limit(page_size).all()

    return {
        "items": [work_item_to_out(i) for i in items],
        "total": total,
        "page": page,
        "page_size": page_size,
    }


@router.post("", response_model=schemas.WorkItemOut, status_code=201)
def create_work_item(payload: schemas.WorkItemCreate, db: Session = Depends(get_db)):
    dev = db.query(models.Developer).get(payload.developer_id)
    if not dev:
        raise HTTPException(status_code=400, detail="Unknown developer_id")

    wi = models.WorkItem(
        developer_id=payload.developer_id,
        day=payload.day,
        date=payload.date,
        module=payload.module,
        description=payload.description,
        tasks_completed=payload.tasks_completed,
        status=payload.status,
        evidence=payload.evidence,
        verification_status=payload.verification_status,
        issues_blockers=payload.issues_blockers,
        next_planned_work=payload.next_planned_work,
        is_seed=False,
    )
    db.add(wi)
    db.flush()

    _sync_apis(db, wi, payload.api_ids)
    _handle_verification(db, wi, old_verification=None)
    _handle_issue(db, wi)
    _log_activity(db, wi, is_new=True)

    db.commit()
    db.refresh(wi)
    return work_item_to_out(wi)


@router.get("/{work_item_id}", response_model=schemas.WorkItemOut)
def get_work_item(work_item_id: int, db: Session = Depends(get_db)):
    wi = db.query(models.WorkItem).get(work_item_id)
    if not wi:
        raise HTTPException(status_code=404, detail="Work item not found")
    return work_item_to_out(wi)


@router.put("/{work_item_id}", response_model=schemas.WorkItemOut)
def update_work_item(work_item_id: int, payload: schemas.WorkItemUpdate, db: Session = Depends(get_db)):
    wi = db.query(models.WorkItem).get(work_item_id)
    if not wi:
        raise HTTPException(status_code=404, detail="Work item not found")
    dev = db.query(models.Developer).get(payload.developer_id)
    if not dev:
        raise HTTPException(status_code=400, detail="Unknown developer_id")

    old_verification = wi.verification_status

    wi.developer_id = payload.developer_id
    wi.day = payload.day
    wi.date = payload.date
    wi.module = payload.module
    wi.description = payload.description
    wi.tasks_completed = payload.tasks_completed
    wi.status = payload.status
    wi.evidence = payload.evidence
    wi.verification_status = payload.verification_status
    wi.issues_blockers = payload.issues_blockers
    wi.next_planned_work = payload.next_planned_work

    db.flush()

    _sync_apis(db, wi, payload.api_ids)
    _handle_verification(db, wi, old_verification=old_verification)
    _handle_issue(db, wi)
    _log_activity(db, wi, is_new=False)

    db.commit()
    db.refresh(wi)
    return work_item_to_out(wi)


@router.delete("/{work_item_id}", status_code=204)
def delete_work_item(work_item_id: int, db: Session = Depends(get_db)):
    wi = db.query(models.WorkItem).get(work_item_id)
    if not wi:
        raise HTTPException(status_code=404, detail="Work item not found")
    db.delete(wi)
    db.commit()
    return None
