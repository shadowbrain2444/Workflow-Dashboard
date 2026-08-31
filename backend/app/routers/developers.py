from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from .. import models, schemas
from ..database import get_db

router = APIRouter(prefix="/api/developers", tags=["developers"])


@router.get("", response_model=list[schemas.DeveloperOut])
def list_developers(db: Session = Depends(get_db)):
    return db.query(models.Developer).order_by(models.Developer.id).all()


@router.get("/{developer_id}", response_model=schemas.DeveloperOut)
def get_developer(developer_id: int, db: Session = Depends(get_db)):
    dev = db.query(models.Developer).get(developer_id)
    if not dev:
        raise HTTPException(status_code=404, detail="Developer not found")
    return dev
