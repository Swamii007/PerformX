from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class CheckinComment(BaseModel):
    goal_id: str
    quarter: str
    comment: str
    manager_id: str
    manager_name: Optional[str] = None
    created_at: Optional[datetime] = None


class CheckinCommentOut(CheckinComment):
    id: str


class CheckinSummaryRequest(BaseModel):
    """Request AI to summarize check-in comments"""
    goal_ids: List[str]
    quarter: str
    employee_id: str


class AuditLog(BaseModel):
    goal_id: str
    changed_by: str
    changed_by_name: Optional[str] = None
    change_type: str   # "edit", "approve", "return", "unlock", "achievement_update"
    field_changed: Optional[str] = None
    old_value: Optional[str] = None
    new_value: Optional[str] = None
    reason: Optional[str] = None
    created_at: Optional[datetime] = None


class AuditLogOut(AuditLog):
    id: str
