from fastapi import APIRouter, HTTPException, Depends, Query
from app.models.goal import (
    GoalCreate, GoalUpdate, GoalOut, ManagerGoalEdit,
    AchievementUpdate, SharedGoalCreate, GoalStatus
)
from app.utils.auth import get_current_user, require_role
from app.utils.progress import compute_progress_score
from app.utils.email import notify_goal_submitted, notify_goal_approved, notify_goal_returned
from app.utils.notifications import (
    notify_goal_submitted_to_manager,
    notify_goal_approved_to_employee,
    notify_goal_returned_to_employee,
    notify_goal_unlocked,
    notify_shared_goal,
)
from app.database import get_db
from app.config import settings
from bson import ObjectId
from datetime import datetime
from typing import List, Optional
import logging

router = APIRouter(prefix="/goals", tags=["Goals"])
logger = logging.getLogger(__name__)

MAX_GOALS = 8
MIN_WEIGHTAGE = 10
TOTAL_WEIGHTAGE = 100


def serialize_goal(goal: dict, employee_name: str = None) -> dict:
    g = {
        "id": str(goal["_id"]),
        "employee_id": goal["employee_id"],
        "employee_name": employee_name or goal.get("employee_name"),
        "thrust_area": goal["thrust_area"],
        "title": goal["title"],
        "description": goal.get("description"),
        "uom_type": goal["uom_type"],
        "target_value": goal.get("target_value"),
        "target_date": goal.get("target_date"),
        "weightage": goal["weightage"],
        "status": goal["status"],
        "progress_status": goal.get("progress_status", "not_started"),
        "cycle_id": goal["cycle_id"],
        "quarterly_achievements": goal.get("quarterly_achievements", []),
        "is_shared": goal.get("is_shared", False),
        "shared_goal_id": goal.get("shared_goal_id"),
        "primary_owner_id": goal.get("primary_owner_id"),
        "manager_comment": goal.get("manager_comment"),
        "created_at": goal["created_at"],
        "updated_at": goal["updated_at"],
    }
    return g


async def validate_weightage(db, employee_id: str, cycle_id: str,
                              new_weightage: float, exclude_goal_id: str = None):
    """Ensure total weightage doesn't exceed 100%."""
    query = {"employee_id": employee_id, "cycle_id": cycle_id,
             "status": {"$nin": ["returned"]}}
    if exclude_goal_id:
        query["_id"] = {"$ne": ObjectId(exclude_goal_id)}

    existing = await db.goals.find(query).to_list(None)
    total = sum(g["weightage"] for g in existing) + new_weightage
    if total > TOTAL_WEIGHTAGE:
        raise HTTPException(
            status_code=400,
            detail=f"Total weightage would exceed 100%. Current total: {total - new_weightage}%, "
                   f"Available: {TOTAL_WEIGHTAGE - (total - new_weightage)}%"
        )


async def log_audit(db, goal_id: str, changed_by: str, changed_by_name: str,
                    change_type: str, field: str = None, old_val=None, new_val=None, reason: str = None):
    await db.audit_logs.insert_one({
        "goal_id": goal_id,
        "changed_by": changed_by,
        "changed_by_name": changed_by_name,
        "change_type": change_type,
        "field_changed": field,
        "old_value": str(old_val) if old_val is not None else None,
        "new_value": str(new_val) if new_val is not None else None,
        "reason": reason,
        "created_at": datetime.utcnow(),
    })


# ── Employee: Create Goal ─────────────────────────────────────────────────────

@router.post("/", response_model=dict)
async def create_goal(
    goal_data: GoalCreate,
    current_user: dict = Depends(require_role("employee"))
):
    db = get_db()
    employee_id = str(current_user["_id"])

    # Check max goals limit
    count = await db.goals.count_documents({
        "employee_id": employee_id,
        "cycle_id": goal_data.cycle_id,
        "status": {"$nin": ["returned"]}
    })
    if count >= MAX_GOALS:
        raise HTTPException(status_code=400, detail=f"Maximum {MAX_GOALS} goals allowed per cycle")

    # Validate weightage
    await validate_weightage(db, employee_id, goal_data.cycle_id, goal_data.weightage)

    now = datetime.utcnow()
    doc = {
        "employee_id": employee_id,
        "thrust_area": goal_data.thrust_area,
        "title": goal_data.title,
        "description": goal_data.description,
        "uom_type": goal_data.uom_type,
        "target_value": goal_data.target_value,
        "target_date": goal_data.target_date,
        "weightage": goal_data.weightage,
        "status": GoalStatus.DRAFT,
        "progress_status": "not_started",
        "cycle_id": goal_data.cycle_id,
        "quarterly_achievements": [],
        "is_shared": False,
        "created_at": now,
        "updated_at": now,
    }
    result = await db.goals.insert_one(doc)
    doc["_id"] = result.inserted_id
    return serialize_goal(doc, current_user["name"])


# ── Employee: Update Draft Goal ───────────────────────────────────────────────

@router.patch("/{goal_id}", response_model=dict)
async def update_goal(
    goal_id: str,
    update_data: GoalUpdate,
    current_user: dict = Depends(get_current_user)
):
    db = get_db()
    try:
        oid = ObjectId(goal_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid goal ID")

    goal = await db.goals.find_one({"_id": oid})
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")

    # Employees can only edit their own draft/returned goals
    if current_user["role"] == "employee":
        if goal["employee_id"] != str(current_user["_id"]):
            raise HTTPException(status_code=403, detail="Access denied")
        if goal["status"] not in ["draft", "returned"]:
            raise HTTPException(status_code=400, detail="Cannot edit approved or submitted goals")

    update_dict = {k: v for k, v in update_data.model_dump().items() if v is not None}

    if "weightage" in update_dict:
        await validate_weightage(db, goal["employee_id"], goal["cycle_id"],
                                  update_dict["weightage"], exclude_goal_id=goal_id)

    update_dict["updated_at"] = datetime.utcnow()
    await db.goals.update_one({"_id": oid}, {"$set": update_dict})

    updated = await db.goals.find_one({"_id": oid})
    return serialize_goal(updated)


# ── Employee: Submit Goals ────────────────────────────────────────────────────

@router.post("/submit/{cycle_id}")
async def submit_goals(
    cycle_id: str,
    current_user: dict = Depends(require_role("employee"))
):
    db = get_db()
    employee_id = str(current_user["_id"])

    goals = await db.goals.find({
        "employee_id": employee_id,
        "cycle_id": cycle_id,
        "status": {"$in": ["draft", "returned"]}
    }).to_list(None)

    if not goals:
        raise HTTPException(status_code=400, detail="No draft goals to submit")

    # Validate total weightage = 100%
    total_weight = sum(g["weightage"] for g in goals)
    if abs(total_weight - TOTAL_WEIGHTAGE) > 0.01:
        raise HTTPException(
            status_code=400,
            detail=f"Total weightage must equal 100%. Current total: {total_weight}%"
        )

    now = datetime.utcnow()
    await db.goals.update_many(
        {"employee_id": employee_id, "cycle_id": cycle_id, "status": {"$in": ["draft", "returned"]}},
        {"$set": {"status": "submitted", "updated_at": now}}
    )

    # Notify manager via email + in-app
    if current_user.get("manager_id"):
        try:
            from bson import ObjectId as OID
            manager = await db.users.find_one({"_id": OID(current_user["manager_id"])})
            if manager:
                await notify_goal_submitted(
                    manager["email"], manager["name"],
                    current_user["name"], settings.FRONTEND_URL
                )
                # In-app notification for each submitted goal
                for g in goals:
                    await notify_goal_submitted_to_manager(
                        manager_id=str(manager["_id"]),
                        employee_name=current_user["name"],
                        goal_title=g["title"],
                        goal_id=str(g["_id"]),
                    )
        except Exception as e:
            logger.error(f"Notification failed: {e}")

    return {"message": f"Successfully submitted {len(goals)} goals for review"}


# ── Employee: Delete Draft Goal ───────────────────────────────────────────────

@router.delete("/{goal_id}")
async def delete_goal(
    goal_id: str,
    current_user: dict = Depends(require_role("employee"))
):
    db = get_db()
    try:
        oid = ObjectId(goal_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid goal ID")

    goal = await db.goals.find_one({"_id": oid})
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    if goal["employee_id"] != str(current_user["_id"]):
        raise HTTPException(status_code=403, detail="Access denied")
    if goal["status"] not in ["draft", "returned"]:
        raise HTTPException(status_code=400, detail="Cannot delete submitted or approved goals")

    await db.goals.delete_one({"_id": oid})
    return {"message": "Goal deleted"}


# ── Employee: Get My Goals ────────────────────────────────────────────────────

@router.get("/my/{cycle_id}", response_model=List[dict])
async def get_my_goals(
    cycle_id: str,
    current_user: dict = Depends(require_role("employee"))
):
    db = get_db()
    goals = await db.goals.find({
        "employee_id": str(current_user["_id"]),
        "cycle_id": cycle_id
    }).to_list(None)
    return [serialize_goal(g, current_user["name"]) for g in goals]


# ── Manager: Get Team Goals ───────────────────────────────────────────────────

@router.get("/team/{cycle_id}", response_model=List[dict])
async def get_team_goals(
    cycle_id: str,
    employee_id: Optional[str] = None,
    status: Optional[str] = None,
    current_user: dict = Depends(require_role("manager", "admin"))
):
    db = get_db()
    query = {"cycle_id": cycle_id}

    if current_user["role"] == "manager":
        # Get employee IDs under this manager
        team = await db.users.find({"manager_id": str(current_user["_id"])}).to_list(None)
        team_ids = [str(u["_id"]) for u in team]
        if employee_id:
            if employee_id not in team_ids:
                raise HTTPException(status_code=403, detail="Employee not in your team")
            query["employee_id"] = employee_id
        else:
            query["employee_id"] = {"$in": team_ids}
    elif employee_id:
        query["employee_id"] = employee_id

    if status:
        query["status"] = status

    goals = await db.goals.find(query).to_list(None)

    # Enrich with employee names
    result = []
    for g in goals:
        emp = await db.users.find_one({"_id": ObjectId(g["employee_id"])})
        emp_name = emp["name"] if emp else "Unknown"
        result.append(serialize_goal(g, emp_name))
    return result


# ── Manager: Approve Goal ─────────────────────────────────────────────────────

@router.post("/{goal_id}/approve")
async def approve_goal(
    goal_id: str,
    edit_data: Optional[ManagerGoalEdit] = None,
    current_user: dict = Depends(require_role("manager", "admin"))
):
    db = get_db()
    try:
        oid = ObjectId(goal_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid goal ID")

    goal = await db.goals.find_one({"_id": oid})
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    if goal["status"] != "submitted":
        raise HTTPException(status_code=400, detail="Goal must be in submitted state to approve")

    # Verify manager owns this employee
    if current_user["role"] == "manager":
        emp = await db.users.find_one({"_id": ObjectId(goal["employee_id"])})
        if not emp or emp.get("manager_id") != str(current_user["_id"]):
            raise HTTPException(status_code=403, detail="Employee not in your team")

    update_dict = {"status": "approved", "updated_at": datetime.utcnow()}

    if edit_data:
        if edit_data.target_value is not None:
            await log_audit(db, goal_id, str(current_user["_id"]), current_user["name"],
                            "edit", "target_value", goal.get("target_value"), edit_data.target_value)
            update_dict["target_value"] = edit_data.target_value
        if edit_data.target_date is not None:
            update_dict["target_date"] = edit_data.target_date
        if edit_data.weightage is not None:
            update_dict["weightage"] = edit_data.weightage

    await db.goals.update_one({"_id": oid}, {"$set": update_dict})
    await log_audit(db, goal_id, str(current_user["_id"]), current_user["name"], "approve")

    # Notify employee via email + in-app
    try:
        emp = await db.users.find_one({"_id": ObjectId(goal["employee_id"])})
        if emp:
            await notify_goal_approved(emp["email"], emp["name"], settings.FRONTEND_URL)
            await notify_goal_approved_to_employee(
                employee_id=str(emp["_id"]),
                manager_name=current_user["name"],
                goal_title=goal["title"],
                goal_id=goal_id,
            )
    except Exception as e:
        logger.error(f"Notification failed: {e}")

    return {"message": "Goal approved successfully"}


# ── Manager: Return Goal for Rework ──────────────────────────────────────────

@router.post("/{goal_id}/return")
async def return_goal(
    goal_id: str,
    edit_data: ManagerGoalEdit,
    current_user: dict = Depends(require_role("manager", "admin"))
):
    db = get_db()
    try:
        oid = ObjectId(goal_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid goal ID")

    goal = await db.goals.find_one({"_id": oid})
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    if goal["status"] != "submitted":
        raise HTTPException(status_code=400, detail="Goal must be in submitted state")

    if not edit_data.rework_comment:
        raise HTTPException(status_code=400, detail="Rework comment is required")

    await db.goals.update_one({"_id": oid}, {"$set": {
        "status": "returned",
        "manager_comment": edit_data.rework_comment,
        "updated_at": datetime.utcnow()
    }})
    await log_audit(db, goal_id, str(current_user["_id"]), current_user["name"],
                    "return", reason=edit_data.rework_comment)

    # Notify employee via email + in-app
    try:
        emp = await db.users.find_one({"_id": ObjectId(goal["employee_id"])})
        if emp:
            await notify_goal_returned(emp["email"], emp["name"],
                                        edit_data.rework_comment, settings.FRONTEND_URL)
            await notify_goal_returned_to_employee(
                employee_id=str(emp["_id"]),
                manager_name=current_user["name"],
                goal_title=goal["title"],
                goal_id=goal_id,
                comment=edit_data.rework_comment,
            )
    except Exception as e:
        logger.error(f"Notification failed: {e}")

    return {"message": "Goal returned for rework"}


# ── Employee: Update Achievement ──────────────────────────────────────────────

@router.post("/{goal_id}/achievement")
async def update_achievement(
    goal_id: str,
    achievement: AchievementUpdate,
    current_user: dict = Depends(get_current_user)
):
    db = get_db()
    try:
        oid = ObjectId(goal_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid goal ID")

    goal = await db.goals.find_one({"_id": oid})
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")

    # Employees can only update their own goals
    if current_user["role"] == "employee" and goal["employee_id"] != str(current_user["_id"]):
        raise HTTPException(status_code=403, detail="Access denied")

    if goal["status"] != "approved":
        raise HTTPException(status_code=400, detail="Can only update achievements for approved goals")

    # Compute progress score
    score = compute_progress_score(
        uom_type=goal["uom_type"],
        target_value=goal.get("target_value"),
        actual_value=achievement.actual_value,
        target_date=goal.get("target_date"),
        actual_date=achievement.actual_date,
    )

    ach_entry = {
        "quarter": achievement.quarter,
        "actual_value": achievement.actual_value,
        "actual_date": achievement.actual_date,
        "progress_status": achievement.progress_status,
        "progress_score": score,
        "notes": achievement.notes,
        "updated_at": datetime.utcnow(),
    }

    # Update or insert quarterly achievement
    existing_achievements = goal.get("quarterly_achievements", [])
    updated = False
    for i, ach in enumerate(existing_achievements):
        if ach["quarter"] == achievement.quarter:
            existing_achievements[i] = ach_entry
            updated = True
            break
    if not updated:
        existing_achievements.append(ach_entry)

    # Determine overall progress status
    statuses = [a["progress_status"] for a in existing_achievements]
    if "completed" in statuses:
        overall_status = "completed"
    elif "on_track" in statuses:
        overall_status = "on_track"
    else:
        overall_status = "not_started"

    await db.goals.update_one({"_id": oid}, {"$set": {
        "quarterly_achievements": existing_achievements,
        "progress_status": overall_status,
        "updated_at": datetime.utcnow(),
    }})

    # If this is a shared goal, sync achievement to linked goals
    if goal.get("is_shared") and goal.get("primary_owner_id") == str(current_user["_id"]):
        await db.goals.update_many(
            {"shared_goal_id": str(goal["_id"]), "_id": {"$ne": oid}},
            {"$set": {
                "quarterly_achievements": existing_achievements,
                "progress_status": overall_status,
                "updated_at": datetime.utcnow(),
            }}
        )

    await log_audit(db, goal_id, str(current_user["_id"]), current_user["name"],
                    "achievement_update", "quarterly_achievements",
                    None, f"{achievement.quarter}: {achievement.actual_value}")

    return {"message": "Achievement updated", "progress_score": score}


# ── Admin: Unlock Goal ────────────────────────────────────────────────────────

@router.post("/{goal_id}/unlock")
async def unlock_goal(
    goal_id: str,
    reason: str = Query(..., description="Reason for unlocking"),
    current_user: dict = Depends(require_role("admin"))
):
    db = get_db()
    try:
        oid = ObjectId(goal_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid goal ID")

    goal = await db.goals.find_one({"_id": oid})
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")

    await db.goals.update_one({"_id": oid}, {"$set": {
        "status": "draft",
        "updated_at": datetime.utcnow()
    }})
    await log_audit(db, goal_id, str(current_user["_id"]), current_user["name"],
                    "unlock", reason=reason)

    # Notify employee
    try:
        emp = await db.users.find_one({"_id": ObjectId(goal["employee_id"])})
        if emp:
            await notify_goal_unlocked(
                employee_id=str(emp["_id"]),
                admin_name=current_user["name"],
                goal_title=goal["title"],
                goal_id=goal_id,
            )
    except Exception as e:
        logger.error(f"Notification failed: {e}")

    return {"message": "Goal unlocked for editing"}


# ── Shared Goals ──────────────────────────────────────────────────────────────

@router.post("/shared", response_model=dict)
async def create_shared_goal(
    data: SharedGoalCreate,
    current_user: dict = Depends(require_role("admin", "manager"))
):
    db = get_db()
    now = datetime.utcnow()

    # Create the primary shared goal template
    primary_doc = {
        "employee_id": str(current_user["_id"]),
        "thrust_area": data.thrust_area,
        "title": data.title,
        "description": data.description,
        "uom_type": data.uom_type,
        "target_value": data.target_value,
        "target_date": data.target_date,
        "weightage": data.default_weightage,
        "status": "approved",  # Shared goals are pre-approved
        "progress_status": "not_started",
        "cycle_id": data.cycle_id,
        "quarterly_achievements": [],
        "is_shared": True,
        "is_primary": True,
        "primary_owner_id": str(current_user["_id"]),
        "created_at": now,
        "updated_at": now,
    }
    primary_result = await db.goals.insert_one(primary_doc)
    primary_id = str(primary_result.inserted_id)

    # Create linked goals for each recipient
    linked_ids = []
    for emp_id in data.employee_ids:
        # Validate employee exists
        try:
            emp = await db.users.find_one({"_id": ObjectId(emp_id)})
        except Exception:
            continue
        if not emp:
            continue

        linked_doc = {
            "employee_id": emp_id,
            "thrust_area": data.thrust_area,
            "title": data.title,
            "description": data.description,
            "uom_type": data.uom_type,
            "target_value": data.target_value,
            "target_date": data.target_date,
            "weightage": data.default_weightage,
            "status": "approved",
            "progress_status": "not_started",
            "cycle_id": data.cycle_id,
            "quarterly_achievements": [],
            "is_shared": True,
            "is_primary": False,
            "shared_goal_id": primary_id,
            "primary_owner_id": str(current_user["_id"]),
            "created_at": now,
            "updated_at": now,
        }
        result = await db.goals.insert_one(linked_doc)
        linked_ids.append(str(result.inserted_id))
        # Notify recipient
        try:
            await notify_shared_goal(
                employee_id=emp_id,
                manager_name=current_user["name"],
                goal_title=data.title,
                goal_id=str(result.inserted_id),
            )
        except Exception as e:
            logger.error(f"Shared goal notification failed: {e}")

    return {
        "message": f"Shared goal created and pushed to {len(linked_ids)} employees",
        "primary_goal_id": primary_id,
        "linked_goal_ids": linked_ids
    }


# ── Get Single Goal ───────────────────────────────────────────────────────────

@router.get("/{goal_id}", response_model=dict)
async def get_goal(
    goal_id: str,
    current_user: dict = Depends(get_current_user)
):
    db = get_db()
    try:
        oid = ObjectId(goal_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid goal ID")

    goal = await db.goals.find_one({"_id": oid})
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")

    # Access control
    if current_user["role"] == "employee" and goal["employee_id"] != str(current_user["_id"]):
        raise HTTPException(status_code=403, detail="Access denied")

    emp = await db.users.find_one({"_id": ObjectId(goal["employee_id"])})
    emp_name = emp["name"] if emp else "Unknown"
    return serialize_goal(goal, emp_name)
