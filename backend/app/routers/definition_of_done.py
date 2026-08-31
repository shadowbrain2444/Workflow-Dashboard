from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from .. import models, schemas
from ..database import get_db

router = APIRouter(prefix="/api/definition-of-done", tags=["definition-of-done"])


@router.get("", response_model=list[schemas.DoDOut])
def list_dod(db: Session = Depends(get_db)):
    return db.query(models.DefinitionOfDone).order_by(models.DefinitionOfDone.order_index).all()


@router.put("/{item_id}", response_model=schemas.DoDOut)
def update_dod(item_id: int, payload: schemas.DoDUpdate, db: Session = Depends(get_db)):
    item = db.query(models.DefinitionOfDone).get(item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Requirement not found")
    if payload.status is not None:
        item.status = payload.status
    if payload.evidence is not None:
        item.evidence = payload.evidence
    if payload.notes is not None:
        item.notes = payload.notes
    if payload.verification is not None:
        item.verification = payload.verification
    db.commit()
    db.refresh(item)

    db.add(models.Activity(
        event_type="walkthrough.ready" if item.status == "Verified" else "task.created",
        source="dashboard",
        status=item.status.lower().replace(" ", "_"),
        payload=f"Day-7 requirement '{item.requirement[:60]}' marked {item.status}",
    ))
    db.commit()
    return item
