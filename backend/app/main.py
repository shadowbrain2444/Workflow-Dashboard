import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from .database import Base, engine, SessionLocal
from . import models  # noqa: F401  (ensures models are registered on Base)
from .seed import seed_if_empty
from .routers import (
    dashboard, developers, work_items, api_progress,
    verification, issues, activities, definition_of_done,
    weekly_progress, meta,
)

Base.metadata.create_all(bind=engine)

with SessionLocal() as db:
    seed_if_empty(db)

app = FastAPI(title="Autonomous AI Workforce Dashboard API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(dashboard.router)
app.include_router(developers.router)
app.include_router(work_items.router)
app.include_router(api_progress.router)
app.include_router(verification.router)
app.include_router(issues.router)
app.include_router(activities.router)
app.include_router(definition_of_done.router)
app.include_router(weekly_progress.router)
app.include_router(meta.router)


@app.get("/api/health")
def health():
    return {"status": "ok"}


FRONTEND_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "frontend")
FRONTEND_DIR = os.path.abspath(FRONTEND_DIR)

if os.path.isdir(FRONTEND_DIR):
    app.mount("/css", StaticFiles(directory=os.path.join(FRONTEND_DIR, "css")), name="css")
    app.mount("/js", StaticFiles(directory=os.path.join(FRONTEND_DIR, "js")), name="js")
    if os.path.isdir(os.path.join(FRONTEND_DIR, "assets")):
        app.mount("/assets", StaticFiles(directory=os.path.join(FRONTEND_DIR, "assets")), name="assets")
    if os.path.isdir(os.path.join(FRONTEND_DIR, "vendor")):
        app.mount("/vendor", StaticFiles(directory=os.path.join(FRONTEND_DIR, "vendor")), name="vendor")

    @app.get("/")
    def serve_index():
        return FileResponse(os.path.join(FRONTEND_DIR, "index.html"))

    @app.get("/{page_name}.html")
    def serve_page(page_name: str):
        path = os.path.join(FRONTEND_DIR, f"{page_name}.html")
        if os.path.isfile(path):
            return FileResponse(path)
        return FileResponse(os.path.join(FRONTEND_DIR, "index.html"))
