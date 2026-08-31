import datetime
from sqlalchemy.orm import Session
from sqlalchemy import func
from . import models

IN_PROGRESS_STATUSES = ("Running", "Verifying")


def work_item_to_out(wi: models.WorkItem) -> dict:
    return {
        "id": wi.id,
        "developer_id": wi.developer_id,
        "developer_name": wi.developer.name if wi.developer else "",
        "day": wi.day,
        "date": wi.date,
        "module": wi.module,
        "description": wi.description,
        "tasks_completed": wi.tasks_completed,
        "status": wi.status,
        "evidence": wi.evidence,
        "verification_status": wi.verification_status,
        "issues_blockers": wi.issues_blockers,
        "next_planned_work": wi.next_planned_work,
        "is_seed": wi.is_seed,
        "apis": [wa.api_item.endpoint for wa in wi.apis],
        "created_at": wi.created_at,
        "updated_at": wi.updated_at,
    }


def compute_current_day(db: Session) -> int:
    items = db.query(models.WorkItem).all()
    if not items:
        return 1
    by_day = {}
    for it in items:
        by_day.setdefault(it.day, []).append(it)
    for day in range(1, 8):
        day_items = by_day.get(day, [])
        if not day_items:
            continue
        if any(i.status != "Completed" for i in day_items):
            return day
    return 7


def compute_project_status(completed: int, running: int, total: int) -> str:
    if total == 0:
        return "Not Started"
    if completed == total:
        return "Completed"
    if completed == 0 and running == 0:
        return "Not Started"
    return "In Progress"


def compute_summary(db: Session) -> dict:
    items = db.query(models.WorkItem).all()
    total = len(items)
    completed = sum(1 for i in items if i.status == "Completed")
    running = sum(1 for i in items if i.status in IN_PROGRESS_STATUSES)
    pending = sum(1 for i in items if i.status == "Pending")
    failed_items = sum(1 for i in items if i.status == "Failed")
    open_issues = db.query(models.Issue).filter(models.Issue.status != "Resolved").count()
    failed_blocked = failed_items + open_issues
    verified = sum(1 for i in items if i.verification_status == "Passed")
    progress = round((completed / total) * 100, 1) if total else 0.0
    current_day = compute_current_day(db)
    status = compute_project_status(completed, running, total)
    return {
        "overall_progress": progress,
        "completed": completed,
        "running": running,
        "pending": pending,
        "failed": failed_blocked,
        "verified": verified,
        "total": total,
        "current_day": current_day,
        "project_status": status,
        "today": datetime.date.today().isoformat(),
    }


def compute_daily_progress(db: Session) -> list:
    current_day = compute_current_day(db)
    developers = db.query(models.Developer).order_by(models.Developer.id).all()
    result = []
    for day in range(1, 8):
        day_items = db.query(models.WorkItem).filter(models.WorkItem.day == day).all()
        total = len(day_items)
        completed = sum(1 for i in day_items if i.status == "Completed")
        progress = round((completed / total) * 100, 1) if total else 0.0
        if total > 0 and completed == total:
            state = "completed"
        elif day == current_day:
            state = "current"
        elif day < current_day:
            state = "completed"
        else:
            state = "upcoming"

        dev_map = {}
        for dev in developers:
            dev_items = [i for i in day_items if i.developer_id == dev.id]
            dev_map[dev.name] = {
                "developer_id": dev.id,
                "total": len(dev_items),
                "completed": sum(1 for i in dev_items if i.status == "Completed"),
                "running": sum(1 for i in dev_items if i.status in IN_PROGRESS_STATUSES),
                "pending": sum(1 for i in dev_items if i.status == "Pending"),
                "failed": sum(1 for i in dev_items if i.status == "Failed"),
                "items": [work_item_to_out(i) for i in dev_items],
            }

        result.append({
            "day": day,
            "label": f"Day {day}",
            "state": state,
            "total": total,
            "completed": completed,
            "progress": progress,
            "developers": dev_map,
        })
    return result


def compute_developer_progress(db: Session) -> list:
    developers = db.query(models.Developer).order_by(models.Developer.id).all()
    out = []
    for dev in developers:
        items = db.query(models.WorkItem).filter(models.WorkItem.developer_id == dev.id).all()
        total = len(items)
        completed = sum(1 for i in items if i.status == "Completed")
        in_progress = sum(1 for i in items if i.status in IN_PROGRESS_STATUSES)
        pending = sum(1 for i in items if i.status == "Pending")
        blocked = sum(1 for i in items if i.status == "Failed")
        verified = sum(1 for i in items if i.verification_status == "Passed")
        progress = round((completed / total) * 100, 1) if total else 0.0

        active = [i for i in items if i.status in IN_PROGRESS_STATUSES]
        current_work = None
        latest_update = None
        if active:
            active.sort(key=lambda i: i.updated_at, reverse=True)
            current_work = f"Day {active[0].day} - {active[0].module}: {active[0].description}"
            latest_update = active[0].updated_at
        elif items:
            items_sorted = sorted(items, key=lambda i: i.updated_at, reverse=True)
            current_work = f"Day {items_sorted[0].day} - {items_sorted[0].module}: {items_sorted[0].description}"
            latest_update = items_sorted[0].updated_at

        out.append({
            "id": dev.id,
            "code": dev.code,
            "name": dev.name,
            "responsibility": dev.responsibility,
            "focus_areas": [f for f in dev.focus_areas.split(",") if f],
            "progress": progress,
            "completed": completed,
            "in_progress": in_progress,
            "pending": pending,
            "blocked": blocked,
            "verified": verified,
            "current_work": current_work,
            "latest_update": latest_update,
        })
    return out


def compute_weekly_progress(db: Session) -> dict:
    summary = compute_summary(db)
    team = compute_developer_progress(db)
    daily = compute_daily_progress(db)
    daily_table = []
    for d in daily:
        day_items = db.query(models.WorkItem).filter(models.WorkItem.day == d["day"]).all()
        pending = sum(1 for i in day_items if i.status == "Pending")
        blockers = db.query(models.Issue).join(models.WorkItem, models.Issue.work_item_id == models.WorkItem.id, isouter=False)\
            .filter(models.WorkItem.day == d["day"]).count()
        verified = sum(1 for i in day_items if i.verification_status == "Passed")
        daily_table.append({
            "day": d["day"],
            "label": d["label"],
            "state": d["state"],
            "completed": d["completed"],
            "pending": pending,
            "blockers": blockers,
            "verified": verified,
            "total": d["total"],
            "progress": d["progress"],
        })

    dod_total = db.query(models.DefinitionOfDone).count()
    dod_verified = db.query(models.DefinitionOfDone).filter(models.DefinitionOfDone.status == "Verified").count()
    day7_readiness = round((dod_verified / dod_total) * 100, 1) if dod_total else 0.0

    return {
        "overall": summary,
        "team": team,
        "daily": daily_table,
        "day7_readiness": day7_readiness,
        "dod_verified": dod_verified,
        "dod_total": dod_total,
    }
