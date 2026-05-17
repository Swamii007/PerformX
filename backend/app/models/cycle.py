from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from enum import Enum


class CyclePhase(str, Enum):
    GOAL_SETTING = "goal_setting"
    Q1_CHECKIN = "q1_checkin"
    Q2_CHECKIN = "q2_checkin"
    Q3_CHECKIN = "q3_checkin"
    Q4_ANNUAL = "q4_annual"
    CLOSED = "closed"


class Cycle(BaseModel):
    id: str           # e.g., "2025-2026"
    name: str         # e.g., "FY 2025-2026"
    current_phase: CyclePhase
    goal_setting_start: datetime
    goal_setting_end: datetime
    q1_start: datetime
    q1_end: datetime
    q2_start: datetime
    q2_end: datetime
    q3_start: datetime
    q3_end: datetime
    q4_start: datetime
    q4_end: datetime
    is_active: bool = True
    created_at: Optional[datetime] = None


class CycleCreate(BaseModel):
    id: str
    name: str
    goal_setting_start: datetime
    goal_setting_end: datetime
    q1_start: datetime
    q1_end: datetime
    q2_start: datetime
    q2_end: datetime
    q3_start: datetime
    q3_end: datetime
    q4_start: datetime
    q4_end: datetime


class CycleUpdate(BaseModel):
    current_phase: Optional[CyclePhase] = None
    is_active: Optional[bool] = None
