import datetime
from typing import Optional, List
from pydantic import BaseModel, Field, field_validator

VALID_STATUSES = ["Pending", "Running", "Verifying", "Completed", "Failed", "Cancelled"]
VALID_VERIFICATION = ["Pending", "Passed", "Failed"]
VALID_PRIORITY = ["Low", "Medium", "High", "Critical"]
VALID_ISSUE_STATUS = ["Open", "In Progress", "Resolved"]
VALID_DOD_STATUS = ["Not Started", "In Progress", "Verified", "Blocked"]


# ---------- Developer ----------
class DeveloperOut(BaseModel):
    id: int
    code: str
    name: str
    responsibility: str
    focus_areas: str = ""

    class Config:
        from_attributes = True


# ---------- API Item ----------
class APIItemOut(BaseModel):
    id: int
    endpoint: str
    method: str
    owner_id: Optional[int] = None
    owner_name: Optional[str] = None
    purpose: str
    category: str
    status: str
    tested: bool
    verification_status: str
    updated_at: datetime.datetime

    class Config:
        from_attributes = True


# ---------- Work Item ----------
class WorkItemCreate(BaseModel):
    developer_id: int
    day: int
    date: str
    module: str
    description: str = ""
    tasks_completed: str = ""
    status: str = "Pending"
    evidence: str = ""
    verification_status: str = "Pending"
    issues_blockers: str = ""
    next_planned_work: str = ""
    api_ids: List[int] = Field(default_factory=list)

    @field_validator("day")
    @classmethod
    def validate_day(cls, v):
        if v < 1 or v > 7:
            raise ValueError("day must be between 1 and 7")
        return v

    @field_validator("status")
    @classmethod
    def validate_status(cls, v):
        if v not in VALID_STATUSES:
            raise ValueError(f"status must be one of {VALID_STATUSES}")
        return v

    @field_validator("verification_status")
    @classmethod
    def validate_verification(cls, v):
        if v not in VALID_VERIFICATION:
            raise ValueError(f"verification_status must be one of {VALID_VERIFICATION}")
        return v

    @field_validator("module", "description")
    @classmethod
    def not_blank(cls, v):
        if v is not None and len(v.strip()) == 0:
            raise ValueError("field cannot be blank")
        return v


class WorkItemUpdate(WorkItemCreate):
    pass


class WorkItemOut(BaseModel):
    id: int
    developer_id: int
    developer_name: str
    day: int
    date: str
    module: str
    description: str
    tasks_completed: str
    status: str
    evidence: str
    verification_status: str
    issues_blockers: str
    next_planned_work: str
    is_seed: bool
    apis: List[str] = Field(default_factory=list)
    created_at: datetime.datetime
    updated_at: datetime.datetime

    class Config:
        from_attributes = True


class PaginatedWorkItems(BaseModel):
    items: List[WorkItemOut]
    total: int
    page: int
    page_size: int


# ---------- Verification ----------
class VerificationOut(BaseModel):
    id: int
    work_item_id: int
    developer_id: Optional[int] = None
    developer_name: Optional[str] = None
    module: Optional[str] = None
    checks: str
    evidence: str
    passed: bool
    failures: str
    criteria: str
    timestamp: datetime.datetime

    class Config:
        from_attributes = True


# ---------- Issue ----------
class IssueOut(BaseModel):
    id: int
    developer_id: Optional[int] = None
    developer_name: Optional[str] = None
    work_item_id: Optional[int] = None
    module: str
    description: str
    priority: str
    status: str
    resolution: str
    created_at: datetime.datetime
    updated_at: datetime.datetime

    class Config:
        from_attributes = True


class IssueUpdate(BaseModel):
    status: Optional[str] = None
    resolution: Optional[str] = None
    priority: Optional[str] = None

    @field_validator("status")
    @classmethod
    def validate_status(cls, v):
        if v is not None and v not in VALID_ISSUE_STATUS:
            raise ValueError(f"status must be one of {VALID_ISSUE_STATUS}")
        return v


# ---------- Activity ----------
class ActivityOut(BaseModel):
    id: int
    event_type: str
    developer_id: Optional[int] = None
    developer_name: Optional[str] = None
    work_item_id: Optional[int] = None
    source: str
    status: str
    payload: str
    timestamp: datetime.datetime

    class Config:
        from_attributes = True


# ---------- Definition of Done ----------
class DoDOut(BaseModel):
    id: int
    requirement: str
    owner: str
    status: str
    evidence: str
    verification: str
    notes: str
    updated_at: datetime.datetime

    class Config:
        from_attributes = True


class DoDUpdate(BaseModel):
    status: Optional[str] = None
    evidence: Optional[str] = None
    notes: Optional[str] = None
    verification: Optional[str] = None

    @field_validator("status")
    @classmethod
    def validate_status(cls, v):
        if v is not None and v not in VALID_DOD_STATUS:
            raise ValueError(f"status must be one of {VALID_DOD_STATUS}")
        return v


# ---------- Dashboard aggregate ----------
class SummaryOut(BaseModel):
    overall_progress: float
    completed: int
    running: int
    pending: int
    failed: int
    verified: int
    total: int
    current_day: int
    project_status: str
    today: str


class DailyProgressDay(BaseModel):
    day: int
    label: str
    state: str  # completed | current | upcoming
    total: int
    completed: int
    progress: float
    developers: dict


class DeveloperProgressOut(BaseModel):
    id: int
    code: str
    name: str
    responsibility: str
    focus_areas: List[str]
    progress: float
    completed: int
    in_progress: int
    pending: int
    blocked: int
    verified: int
    current_work: Optional[str] = None
    latest_update: Optional[datetime.datetime] = None
