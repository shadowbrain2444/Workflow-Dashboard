import datetime
from sqlalchemy import (
    Column, Integer, String, Text, Boolean, DateTime, ForeignKey
)
from sqlalchemy.orm import relationship
from .database import Base


def now():
    return datetime.datetime.utcnow()


class Developer(Base):
    __tablename__ = "developers"

    id = Column(Integer, primary_key=True)
    code = Column(String(32), unique=True, nullable=False)  # developer_1, developer_2, developer_3
    name = Column(String(64), nullable=False)
    responsibility = Column(String(255), nullable=False)
    focus_areas = Column(Text, default="")  # comma separated modules tracked
    created_at = Column(DateTime, default=now)
    updated_at = Column(DateTime, default=now, onupdate=now)

    work_items = relationship("WorkItem", back_populates="developer")


class WorkItem(Base):
    __tablename__ = "work_items"

    id = Column(Integer, primary_key=True)
    developer_id = Column(Integer, ForeignKey("developers.id"), nullable=False)
    day = Column(Integer, nullable=False)  # 1-7
    date = Column(String(16), nullable=False)  # ISO date string
    module = Column(String(128), nullable=False)
    description = Column(Text, default="")
    tasks_completed = Column(Text, default="")
    status = Column(String(32), default="Pending")  # Pending, Running, Verifying, Completed, Failed, Cancelled
    evidence = Column(Text, default="")
    verification_status = Column(String(16), default="Pending")  # Pending, Passed, Failed
    issues_blockers = Column(Text, default="")
    next_planned_work = Column(Text, default="")
    is_seed = Column(Boolean, default=False)
    created_at = Column(DateTime, default=now)
    updated_at = Column(DateTime, default=now, onupdate=now)

    developer = relationship("Developer", back_populates="work_items")
    apis = relationship("WorkItemAPI", back_populates="work_item", cascade="all, delete-orphan")
    verifications = relationship("Verification", back_populates="work_item", cascade="all, delete-orphan")
    issues = relationship("Issue", back_populates="work_item", cascade="all, delete-orphan")


class APIItem(Base):
    __tablename__ = "api_items"

    id = Column(Integer, primary_key=True)
    endpoint = Column(String(128), nullable=False, unique=True)
    method = Column(String(16), default="POST")
    owner_id = Column(Integer, ForeignKey("developers.id"), nullable=True)
    purpose = Column(String(255), default="")
    category = Column(String(64), default="")  # e.g. Perception, Memory, Execution
    status = Column(String(32), default="Not Started")  # Not Started, In Progress, Implemented, Verified
    tested = Column(Boolean, default=False)
    verification_status = Column(String(16), default="Pending")
    updated_at = Column(DateTime, default=now, onupdate=now)

    owner = relationship("Developer")
    work_items = relationship("WorkItemAPI", back_populates="api_item")


class WorkItemAPI(Base):
    __tablename__ = "work_item_apis"

    id = Column(Integer, primary_key=True)
    work_item_id = Column(Integer, ForeignKey("work_items.id"), nullable=False)
    api_item_id = Column(Integer, ForeignKey("api_items.id"), nullable=False)

    work_item = relationship("WorkItem", back_populates="apis")
    api_item = relationship("APIItem", back_populates="work_items")


class Verification(Base):
    __tablename__ = "verifications"

    id = Column(Integer, primary_key=True)
    work_item_id = Column(Integer, ForeignKey("work_items.id"), nullable=False)
    developer_id = Column(Integer, ForeignKey("developers.id"), nullable=True)
    checks = Column(Text, default="")
    evidence = Column(Text, default="")
    passed = Column(Boolean, default=False)
    failures = Column(Text, default="")
    criteria = Column(Text, default="")
    timestamp = Column(DateTime, default=now)

    work_item = relationship("WorkItem", back_populates="verifications")
    developer = relationship("Developer")


class Issue(Base):
    __tablename__ = "issues"

    id = Column(Integer, primary_key=True)
    developer_id = Column(Integer, ForeignKey("developers.id"), nullable=True)
    work_item_id = Column(Integer, ForeignKey("work_items.id"), nullable=True)
    module = Column(String(128), default="")
    description = Column(Text, default="")
    priority = Column(String(16), default="Medium")  # Low, Medium, High, Critical
    status = Column(String(16), default="Open")  # Open, In Progress, Resolved
    resolution = Column(Text, default="")
    created_at = Column(DateTime, default=now)
    updated_at = Column(DateTime, default=now, onupdate=now)

    developer = relationship("Developer")
    work_item = relationship("WorkItem", back_populates="issues")


class Activity(Base):
    __tablename__ = "activities"

    id = Column(Integer, primary_key=True)
    event_type = Column(String(64), nullable=False)
    developer_id = Column(Integer, ForeignKey("developers.id"), nullable=True)
    work_item_id = Column(Integer, ForeignKey("work_items.id"), nullable=True)
    source = Column(String(64), default="dashboard")
    status = Column(String(32), default="info")
    payload = Column(Text, default="")
    timestamp = Column(DateTime, default=now)

    developer = relationship("Developer")
    work_item = relationship("WorkItem")


class DefinitionOfDone(Base):
    __tablename__ = "definition_of_done"

    id = Column(Integer, primary_key=True)
    requirement = Column(Text, nullable=False)
    owner = Column(String(64), default="")
    status = Column(String(16), default="Not Started")  # Not Started, In Progress, Verified, Blocked
    evidence = Column(Text, default="")
    verification = Column(String(16), default="Pending")
    notes = Column(Text, default="")
    order_index = Column(Integer, default=0)
    updated_at = Column(DateTime, default=now, onupdate=now)
