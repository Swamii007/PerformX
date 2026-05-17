from pydantic import BaseModel, Field
from typing import Optional, List
from enum import Enum
from datetime import datetime


class UoMType(str, Enum):
    NUMERIC_MIN = "numeric_min"   # Higher is better (e.g., Sales Revenue)
    NUMERIC_MAX = "numeric_max"   # Lower is better (e.g., TAT, Cost)
    TIMELINE = "timeline"         # Date-based completion
    ZERO = "zero"                 # Zero = Success


class GoalStatus(str, Enum):
    DRAFT = "draft"
    SUBMITTED = "submitted"
    APPROVED = "approved"
    RETURNED = "returned"         # Returned for rework


class ProgressStatus(str, Enum):
    NOT_STARTED = "not_started"
    ON_TRACK = "on_track"
    COMPLETED = "completed"
    AT_RISK = "at_risk"


class ThrustArea(str, Enum):
    REVENUE_GROWTH = "Revenue Growth"
    COST_OPTIMIZATION = "Cost Optimization"
    CUSTOMER_SATISFACTION = "Customer Satisfaction"
    OPERATIONAL_EXCELLENCE = "Operational Excellence"
    PEOPLE_DEVELOPMENT = "People Development"
    INNOVATION = "Innovation"
    COMPLIANCE_RISK = "Compliance & Risk"
    QUALITY = "Quality"


class QuarterlyAchievement(BaseModel):
    quarter: str  # Q1, Q2, Q3, Q4
    actual_value: Optional[float] = None
    actual_date: Optional[datetime] = None   # for Timeline UoM
    progress_status: ProgressStatus = ProgressStatus.NOT_STARTED
    progress_score: Optional[float] = None   # computed 0-100
    notes: Optional[str] = None
    updated_at: Optional[datetime] = None


class GoalBase(BaseModel):
    thrust_area: ThrustArea
    title: str
    description: Optional[str] = None
    uom_type: UoMType
    target_value: Optional[float] = None     # for Numeric/% UoM
    target_date: Optional[datetime] = None   # for Timeline UoM
    weightage: float = Field(..., ge=10, le=100)
    cycle_id: str  # e.g., "2025-2026"


class GoalCreate(GoalBase):
    pass


class GoalUpdate(BaseModel):
    thrust_area: Optional[ThrustArea] = None
    title: Optional[str] = None
    description: Optional[str] = None
    uom_type: Optional[UoMType] = None
    target_value: Optional[float] = None
    target_date: Optional[datetime] = None
    weightage: Optional[float] = Field(None, ge=10, le=100)


class ManagerGoalEdit(BaseModel):
    """Manager can edit targets and weightage during approval"""
    target_value: Optional[float] = None
    target_date: Optional[datetime] = None
    weightage: Optional[float] = Field(None, ge=10, le=100)
    rework_comment: Optional[str] = None


class GoalOut(BaseModel):
    id: str
    employee_id: str
    employee_name: Optional[str] = None
    thrust_area: str
    title: str
    description: Optional[str] = None
    uom_type: str
    target_value: Optional[float] = None
    target_date: Optional[datetime] = None
    weightage: float
    status: GoalStatus
    progress_status: ProgressStatus = ProgressStatus.NOT_STARTED
    cycle_id: str
    quarterly_achievements: List[QuarterlyAchievement] = []
    is_shared: bool = False
    shared_goal_id: Optional[str] = None
    primary_owner_id: Optional[str] = None
    manager_comment: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class SharedGoalCreate(BaseModel):
    """Admin/Manager creates a shared departmental KPI"""
    thrust_area: ThrustArea
    title: str
    description: Optional[str] = None
    uom_type: UoMType
    target_value: Optional[float] = None
    target_date: Optional[datetime] = None
    cycle_id: str
    employee_ids: List[str]           # recipients
    default_weightage: float = Field(10.0, ge=10, le=100)


class AchievementUpdate(BaseModel):
    quarter: str
    actual_value: Optional[float] = None
    actual_date: Optional[datetime] = None
    progress_status: ProgressStatus
    notes: Optional[str] = None
