from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from enum import Enum


class NotificationType(str, Enum):
    GOAL_SUBMITTED = "goal_submitted"
    GOAL_APPROVED = "goal_approved"
    GOAL_RETURNED = "goal_returned"
    GOAL_UNLOCKED = "goal_unlocked"
    CHECKIN_REMINDER = "checkin_reminder"
    SHARED_GOAL = "shared_goal"


class NotificationOut(BaseModel):
    id: str
    user_id: str
    type: str
    title: str
    message: str
    is_read: bool
    created_at: datetime
    goal_id: Optional[str] = None
    actor_name: Optional[str] = None
